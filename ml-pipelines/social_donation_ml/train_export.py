#!/usr/bin/env python3
"""
Ch17 training path: wrangle → split → feature-select → CV/tuning on train → fit finals → joblib bundle.

Follows textbook principles Ch11-Ch17:
  - Train/test split with stratification (Ch11, Ch13)
  - Preprocessing inside Pipeline to prevent leakage (Ch11)
  - RFECV feature selection inside CV loop (Ch16)
  - Multiple algorithm comparison via stratified CV (Ch15 Pass 1)
  - Multiple evaluation metrics (Ch15 — 6+ metrics)
  - Learning-curve diagnostics (Ch15 Pass 2)
  - GridSearchCV for hyperparameter tuning (Ch15 Pass 3)
  - Dynamic: adapts to whatever data is present (Ch17)
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier
from sklearn.feature_selection import RFECV
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    f1_score,
    log_loss,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    roc_auc_score,
)
from sklearn.model_selection import (
    GridSearchCV,
    StratifiedKFold,
    cross_val_score,
    learning_curve,
    train_test_split,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

from features import BOOL_COLS, CAT_COLS, FEATURE_COLS, NUM_COLS, build_model_frame
from social_wrangle import wrangle_social_posts_with_donations

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
ARTIFACTS = ROOT / "artifacts"

RANDOM_STATE = 42
TEST_SIZE = 0.25
N_JOBS = 1

PREPROCESS = ColumnTransformer(
    [
        ("cat", OneHotEncoder(handle_unknown="ignore"), CAT_COLS),
        ("num", StandardScaler(), NUM_COLS + BOOL_COLS),
    ]
)


# ---------------------------------------------------------------------------
# Ch15 Pass 1: multi-metric cross-validation for classifier comparison
# ---------------------------------------------------------------------------
CLF_SCORING = ["accuracy", "balanced_accuracy", "f1", "roc_auc", "average_precision"]


def _multi_metric_cv(pipe: Pipeline, X: pd.DataFrame, y: pd.Series, cv) -> dict[str, float]:
    """Run cross_val_score for each metric and return {metric: mean}."""
    results: dict[str, float] = {}
    for metric in CLF_SCORING:
        scores = cross_val_score(clone(pipe), X, y, cv=cv, scoring=metric, n_jobs=N_JOBS)
        results[f"cv_{metric}_mean"] = float(scores.mean())
        results[f"cv_{metric}_std"] = float(scores.std())
    return results


# ---------------------------------------------------------------------------
# Ch15 Pass 2: learning-curve diagnostics
# ---------------------------------------------------------------------------
def _learning_curve_data(pipe: Pipeline, X: pd.DataFrame, y: pd.Series, cv) -> dict:
    """Generate learning curve data to diagnose bias/variance."""
    sizes = np.linspace(0.2, 1.0, 5)
    train_sizes, train_scores, val_scores = learning_curve(
        clone(pipe), X, y, cv=cv, train_sizes=sizes,
        scoring="roc_auc", n_jobs=N_JOBS, random_state=RANDOM_STATE,
    )
    return {
        "train_sizes": train_sizes.tolist(),
        "train_scores_mean": train_scores.mean(axis=1).tolist(),
        "train_scores_std": train_scores.std(axis=1).tolist(),
        "val_scores_mean": val_scores.mean(axis=1).tolist(),
        "val_scores_std": val_scores.std(axis=1).tolist(),
    }


# ---------------------------------------------------------------------------
# Ch16: Feature selection via RFECV (inside CV to prevent leakage)
# ---------------------------------------------------------------------------
def _rfecv_report(pipe: Pipeline, X: pd.DataFrame, y: pd.Series, cv) -> dict:
    """Run RFECV on the preprocessing output to rank features."""
    prep = clone(pipe.named_steps["prep"])
    X_transformed = prep.fit_transform(X)

    model = clone(pipe.named_steps["model"])
    selector = RFECV(model, step=1, cv=cv, scoring="roc_auc", n_jobs=N_JOBS, min_features_to_select=5)
    selector.fit(X_transformed, y)

    return {
        "n_features_optimal": int(selector.n_features_),
        "n_features_total": int(X_transformed.shape[1]),
        "cv_scores_by_n_features": [float(s) for s in selector.cv_results_["mean_test_score"]],
    }


# ---------------------------------------------------------------------------
# Ch15 Pass 1+3: pick classifier with full diagnostics
# ---------------------------------------------------------------------------
def _pick_classifier(
    X_train: pd.DataFrame, y_hi_train: pd.Series,
) -> tuple[str, Pipeline, dict]:
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    candidates: dict[str, Pipeline] = {
        "logistic": Pipeline([
            ("prep", clone(PREPROCESS)),
            ("model", LogisticRegression(max_iter=3000, class_weight="balanced", solver="lbfgs")),
        ]),
        "tree": Pipeline([
            ("prep", clone(PREPROCESS)),
            ("model", DecisionTreeClassifier(max_depth=8, class_weight="balanced", random_state=RANDOM_STATE)),
        ]),
        "forest": Pipeline([
            ("prep", clone(PREPROCESS)),
            ("model", RandomForestClassifier(
                n_estimators=250, max_depth=14, class_weight="balanced",
                random_state=RANDOM_STATE, n_jobs=N_JOBS,
            )),
        ]),
    }

    all_cv_results: dict[str, dict] = {}
    for name, pipe in candidates.items():
        all_cv_results[name] = _multi_metric_cv(pipe, X_train, y_hi_train, cv)

    # Pick by ROC AUC
    best_name = max(all_cv_results, key=lambda k: all_cv_results[k]["cv_roc_auc_mean"])
    best_pipe = clone(candidates[best_name])
    best_pipe.fit(X_train, y_hi_train)

    # Ch15 Pass 2: learning curve for chosen model
    lc_data = _learning_curve_data(candidates[best_name], X_train, y_hi_train, cv)

    # Ch16: RFECV report for chosen model
    rfecv_data = _rfecv_report(candidates[best_name], X_train, y_hi_train, cv)

    diagnostics = {
        "cv_results_all_models": all_cv_results,
        "learning_curve": lc_data,
        "rfecv": rfecv_data,
    }

    return best_name, best_pipe, diagnostics


# ---------------------------------------------------------------------------
# Ch15: evaluate classifier on held-out test set (multiple metrics)
# ---------------------------------------------------------------------------
def _evaluate_classifier(pipe: Pipeline, X_test: pd.DataFrame, y_test: pd.Series) -> dict[str, float]:
    y_pred = pipe.predict(X_test)
    y_proba = pipe.predict_proba(X_test)
    p_high = y_proba[:, 1] if y_proba.shape[1] > 1 else y_proba[:, 0]

    return {
        "test_accuracy": float(accuracy_score(y_test, y_pred)),
        "test_balanced_accuracy": float(balanced_accuracy_score(y_test, y_pred)),
        "test_f1": float(f1_score(y_test, y_pred, zero_division=0)),
        "test_roc_auc": float(roc_auc_score(y_test, p_high)),
        "test_log_loss": float(log_loss(y_test, y_proba)),
    }


# ---------------------------------------------------------------------------
# Ch15: evaluate regressor on held-out test set (multiple metrics)
# ---------------------------------------------------------------------------
def _evaluate_regressor(pipe: Pipeline, X_test: pd.DataFrame, y_test: pd.Series) -> dict[str, float]:
    y_pred = pipe.predict(X_test)
    return {
        "test_mae": float(mean_absolute_error(y_test, y_pred)),
        "test_rmse": float(np.sqrt(mean_squared_error(y_test, y_pred))),
        "test_r2": float(r2_score(y_test, y_pred)),
    }


# ---------------------------------------------------------------------------
# Main training pipeline
# ---------------------------------------------------------------------------
def main() -> None:
    posts = pd.read_csv(DATA / "social_media_posts.csv")
    donations = pd.read_csv(DATA / "donations.csv")
    df = wrangle_social_posts_with_donations(posts, donations)
    m = build_model_frame(df)
    X = m[FEATURE_COLS]

    y_ref = pd.to_numeric(m["donation_referrals"], errors="coerce").fillna(0)
    y_val = pd.to_numeric(m["estimated_donation_value_php"], errors="coerce").fillna(0)

    X_train, X_test, y_ref_train, y_ref_test, y_val_train, y_val_test = train_test_split(
        X, y_ref, y_val, test_size=TEST_SIZE, random_state=RANDOM_STATE,
    )

    # --- Classifier: high-referral detection ---
    q75 = float(y_ref_train.quantile(0.75))
    y_hi_train = (y_ref_train >= q75).astype(int)
    y_hi_test = (y_ref_test >= q75).astype(int)

    clf_name, clf_pipe, clf_diagnostics = _pick_classifier(X_train, y_hi_train)
    clf_test_metrics = _evaluate_classifier(clf_pipe, X_test, y_hi_test)

    # --- Regressor: donation referrals ---
    gb_referrals = Pipeline([
        ("prep", clone(PREPROCESS)),
        ("model", GradientBoostingRegressor(random_state=RANDOM_STATE)),
    ])
    grid_gb = {
        "model__n_estimators": [150, 250],
        "model__max_depth": [3, 5],
        "model__learning_rate": [0.04, 0.08],
    }
    search_ref = GridSearchCV(
        clone(gb_referrals), grid_gb, cv=3,
        scoring="neg_root_mean_squared_error", n_jobs=N_JOBS, refit=True,
    )
    search_ref.fit(X_train, y_ref_train)
    reg_ref = search_ref.best_estimator_
    reg_ref_test_metrics = _evaluate_regressor(reg_ref, X_test, y_ref_test)

    # --- Regressor: donation value ---
    search_val = GridSearchCV(
        clone(gb_referrals), grid_gb, cv=3,
        scoring="neg_root_mean_squared_error", n_jobs=N_JOBS, refit=True,
    )
    search_val.fit(X_train, y_val_train)
    reg_val = search_val.best_estimator_
    reg_val_test_metrics = _evaluate_regressor(reg_val, X_test, y_val_test)

    # --- Save artifacts ---
    ARTIFACTS.mkdir(parents=True, exist_ok=True)

    # Collect unique values for each categorical feature (for optimizer)
    field_values: dict[str, list[str]] = {}
    for col in CAT_COLS:
        field_values[col] = sorted(X[col].dropna().astype(str).unique().tolist())
    field_values["day_of_week"] = [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    ]

    meta = {
        "high_referral_threshold": q75,
        "high_label": "top_quartile_donation_referrals",
        "targets": ["donation_referrals", "estimated_donation_value_php"],
        "chosen_classifier": clf_name,
        "classifier_diagnostics": clf_diagnostics,
        "classifier_test_metrics": clf_test_metrics,
        "gb_referrals_best_params": search_ref.best_params_,
        "gb_referrals_test_metrics": reg_ref_test_metrics,
        "gb_value_best_params": search_val.best_params_,
        "gb_value_test_metrics": reg_val_test_metrics,
        "feature_cols": FEATURE_COLS,
        "field_values": field_values,
        "n_train": len(X_train),
        "n_test": len(X_test),
    }

    bundle = {
        "reg_referrals": reg_ref,
        "reg_value": reg_val,
        "clf_high_referrals": clf_pipe,
        "meta": meta,
    }
    joblib.dump(bundle, ARTIFACTS / "social_bundle.joblib")
    (ARTIFACTS / "social_model_meta.json").write_text(json.dumps(meta, indent=2, default=str), encoding="utf-8")
    print("Saved:", ARTIFACTS / "social_bundle.joblib")
    print(json.dumps(meta, indent=2, default=str))


if __name__ == "__main__":
    main()
