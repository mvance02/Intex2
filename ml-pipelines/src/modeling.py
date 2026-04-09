"""Modeling utilities for the donor retention pipeline.

Implements Ch. 15 three-pass approach:
  Pass 1 — multi-metric StratifiedKFold CV across candidate models.
  Pass 3 — RandomizedSearchCV on the winner (Pass 2 learning-curve
           diagnostics are omitted here for brevity but follow the same
           sklearn learning_curve() pattern shown in the textbook).

The test set is touched EXACTLY ONCE — only in fit_best_model() after
selection and tuning are complete (Ch. 15: "never use the test set for
model selection or hyperparameter tuning").
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance as _perm_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import (
    RandomizedSearchCV,
    StratifiedKFold,
    cross_validate,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

try:
    from xgboost import XGBClassifier  # type: ignore[import]

    _HAS_XGBOOST = True
except ImportError:
    _HAS_XGBOOST = False


def build_preprocessor(
    X: pd.DataFrame,
) -> tuple[ColumnTransformer, list[str], list[str]]:
    """Build a ColumnTransformer for numeric and categorical features.

    Numeric: median imputation + StandardScaler (benefits logistic regression).
    Categorical: mode imputation + OneHotEncoder (unknown categories silently
    dropped at inference, never cause a KeyError).

    The ColumnTransformer is returned unfitted — it is fitted inside the
    sklearn Pipeline during pipe.fit(X_train, y_train) so that no information
    from the test set leaks into the preprocessor (Ch. 11).
    """
    num_cols = X.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = X.select_dtypes(exclude=[np.number]).columns.tolist()

    preprocessor = ColumnTransformer(
        [
            (
                "num",
                Pipeline(
                    [
                        ("imp", SimpleImputer(strategy="median")),
                        ("sc", StandardScaler()),
                    ]
                ),
                num_cols,
            ),
            (
                "cat",
                Pipeline(
                    [
                        ("imp", SimpleImputer(strategy="most_frequent")),
                        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                    ]
                ),
                cat_cols,
            ),
        ]
    )
    return preprocessor, num_cols, cat_cols


def _candidate_pipelines(
    preprocessor: ColumnTransformer, pos_weight: float
) -> dict[str, Pipeline]:
    """Build one Pipeline per candidate algorithm (Ch. 14, 15)."""
    candidates: dict[str, Pipeline] = {}

    if _HAS_XGBOOST:
        candidates["xgboost"] = Pipeline(
            [
                ("prep", clone(preprocessor)),
                (
                    "clf",
                    XGBClassifier(
                        n_estimators=200,
                        max_depth=4,
                        learning_rate=0.1,
                        scale_pos_weight=pos_weight,
                        eval_metric="logloss",
                        random_state=42,
                        n_jobs=1,
                    ),
                ),
            ]
        )

    candidates["random_forest"] = Pipeline(
        [
            ("prep", clone(preprocessor)),
            (
                "clf",
                RandomForestClassifier(
                    n_estimators=300,
                    class_weight="balanced",
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )
    candidates["gradient_boosting"] = Pipeline(
        [
            ("prep", clone(preprocessor)),
            (
                "clf",
                GradientBoostingClassifier(
                    n_estimators=150,
                    max_depth=4,
                    learning_rate=0.1,
                    random_state=42,
                ),
            ),
        ]
    )
    candidates["decision_tree"] = Pipeline(
        [
            ("prep", clone(preprocessor)),
            (
                "clf",
                DecisionTreeClassifier(
                    max_depth=5, class_weight="balanced", random_state=42
                ),
            ),
        ]
    )
    candidates["log_reg"] = Pipeline(
        [
            ("prep", clone(preprocessor)),
            (
                "clf",
                LogisticRegression(
                    max_iter=1000, class_weight="balanced", solver="lbfgs"
                ),
            ),
        ]
    )
    return candidates


_PARAM_GRIDS: dict[str, dict] = {
    "xgboost": {
        "clf__n_estimators": [100, 200, 300],
        "clf__max_depth": [3, 4, 6],
        "clf__learning_rate": [0.05, 0.1, 0.2],
    },
    "random_forest": {
        "clf__n_estimators": [100, 200, 300],
        "clf__max_depth": [None, 5, 10],
        "clf__min_samples_leaf": [1, 2, 4],
    },
    "gradient_boosting": {
        "clf__n_estimators": [100, 150, 200],
        "clf__max_depth": [3, 4, 5],
        "clf__learning_rate": [0.05, 0.1, 0.2],
    },
    "decision_tree": {
        "clf__max_depth": [3, 5, 7, None],
        "clf__min_samples_leaf": [1, 2, 4],
    },
    "log_reg": {
        "clf__C": [0.01, 0.1, 1.0, 10.0],
    },
}


def fit_best_model(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    preprocessor: ColumnTransformer,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    prioritize: str = "recall",
    tune: bool = True,
    pos_weight: float = 1.0,
) -> tuple[str, Pipeline, dict, pd.DataFrame, dict | None]:
    """Select, tune, and fit the best donor churn model.

    Ch. 15 three-pass approach
    --------------------------
    Pass 1: StratifiedKFold CV across all candidate models — picks the winner
            by the `prioritize` metric (recall or roc_auc).
    Pass 3: RandomizedSearchCV fine-tunes the winner on the training fold.
            (Pass 2 learning curves are omitted for brevity.)

    The test set is used ONLY for the final evaluation at the very end.

    Returns
    -------
    best_name    : str             — name of the selected algorithm
    best_pipe    : Pipeline        — fitted pipeline (preprocessing + model)
    test_metrics : dict            — roc_auc, pr_auc, recall_at_50 on test set
    eval_df      : pd.DataFrame    — CV scores for all candidates
    tune_info    : dict | None     — best_params and best_cv_score, or None
    """
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    candidates = _candidate_pipelines(preprocessor, pos_weight)
    scoring = {"roc_auc": "roc_auc", "recall": "recall"}

    # ── Pass 1: multi-metric CV comparison ───────────────────────────────────
    cv_rows: list[dict] = []
    for name, pipe in candidates.items():
        try:
            results = cross_validate(
                pipe, X_train, y_train, cv=cv, scoring=scoring, n_jobs=-1
            )
            cv_rows.append(
                {
                    "model": name,
                    "roc_auc_mean": float(results["test_roc_auc"].mean()),
                    "roc_auc_std": float(results["test_roc_auc"].std()),
                    "recall_mean": float(results["test_recall"].mean()),
                    "recall_std": float(results["test_recall"].std()),
                }
            )
        except Exception:
            cv_rows.append(
                {
                    "model": name,
                    "roc_auc_mean": float("nan"),
                    "roc_auc_std": float("nan"),
                    "recall_mean": float("nan"),
                    "recall_std": float("nan"),
                }
            )

    eval_df = pd.DataFrame(cv_rows)
    sort_col = "recall_mean" if prioritize == "recall" else "roc_auc_mean"
    best_name = str(
        eval_df.dropna(subset=[sort_col])
        .sort_values(sort_col, ascending=False)
        .iloc[0]["model"]
    )
    best_pipe = candidates[best_name]

    # ── Pass 3: RandomizedSearchCV on the winner ──────────────────────────────
    tune_info: dict | None = None
    grid = _PARAM_GRIDS.get(best_name, {})
    if tune and grid:
        tune_scoring = "roc_auc" if prioritize == "roc_auc" else "recall"
        search = RandomizedSearchCV(
            best_pipe,
            grid,
            n_iter=min(10, len(grid) * 3),
            cv=cv,
            scoring=tune_scoring,
            n_jobs=-1,
            random_state=42,
            refit=True,
        )
        search.fit(X_train, y_train)
        best_pipe = search.best_estimator_
        tune_info = {
            "best_params": search.best_params_,
            "best_cv_score": float(search.best_score_),
        }
    else:
        best_pipe.fit(X_train, y_train)

    # ── Final evaluation on held-out test set (once, after selection) ─────────
    p_test = best_pipe.predict_proba(X_test)[:, 1]
    yhat_test = (p_test >= 0.5).astype(int)

    has_both_classes = len(set(y_test)) > 1
    test_metrics: dict = {
        "roc_auc": float(roc_auc_score(y_test, p_test)) if has_both_classes else None,
        "pr_auc": float(average_precision_score(y_test, p_test)) if has_both_classes else None,
        "recall_at_50": float(recall_score(y_test, yhat_test, zero_division=0)),
    }

    return best_name, best_pipe, test_metrics, eval_df, tune_info


def permutation_feature_importance(
    pipe: Pipeline,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    n_repeats: int = 10,
) -> pd.DataFrame:
    """Compute permutation feature importance on the held-out test set (Ch. 16).

    Permutes raw input columns (before preprocessing) so importance scores
    correspond directly to the original feature names.
    """
    result = _perm_importance(
        pipe,
        X_test,
        y_test,
        n_repeats=n_repeats,
        scoring="roc_auc",
        random_state=42,
        n_jobs=-1,
    )
    return pd.DataFrame(
        {
            "feature": list(X_test.columns),
            "importance_mean": result.importances_mean,
            "importance_std": result.importances_std,
        }
    ).sort_values("importance_mean", ascending=False)
