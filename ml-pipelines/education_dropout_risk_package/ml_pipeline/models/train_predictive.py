"""Predictive models: Random Forest for dropout risk + attendance trend.

Preprocessing lives INSIDE the sklearn Pipeline (ColumnTransformer) so that
fit_transform() runs only on training data and transform() runs on test/new
data — preventing training/inference skew (Ch. 11, 17).
"""

from collections import defaultdict

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from config import ARTIFACT_DIR, SURROGATE_TARGET, TARGET_COLUMN
from models.evaluate import evaluate_binary, evaluate_regression, save_json

LEAKAGE = {TARGET_COLUMN, SURROGATE_TARGET, "resident_id"}


def _feature_cols(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if c not in LEAKAGE]


def _build_pipeline(X: pd.DataFrame, estimator) -> Pipeline:
    """Build a full preprocessing + estimator Pipeline.

    Numeric columns: median imputation.
    Categorical columns: mode imputation → one-hot encoding (unknown categories
    handled gracefully at inference via handle_unknown='ignore').

    fit_transform() is called only on training data when pipe.fit() runs.
    """
    num_cols = X.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = X.select_dtypes(exclude=[np.number]).columns.tolist()
    preprocessor = ColumnTransformer(
        [
            ("num", SimpleImputer(strategy="median"), num_cols),
            ("cat", Pipeline([
                ("imp", SimpleImputer(strategy="most_frequent")),
                ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
            ]), cat_cols),
        ],
        remainder="drop",
    )
    return Pipeline([("prep", preprocessor), ("clf", estimator)])


def _aggregate_importances(pipe: Pipeline, feature_cols: list[str]) -> pd.DataFrame:
    """Aggregate OHE'd importances back to original column names for explainability."""
    ct = pipe.named_steps["prep"]
    clf = pipe.named_steps["clf"]
    num_cols = list(ct.transformers_[0][2])
    cat_cols = list(ct.transformers_[1][2])
    ohe = ct.transformers_[1][1].named_steps["ohe"]

    # Map each expanded feature back to its source column
    col_map: list[str] = list(num_cols)
    for orig_col, cats in zip(cat_cols, ohe.categories_):
        col_map.extend([orig_col] * len(cats))

    agg: dict[str, float] = defaultdict(float)
    for col, imp_val in zip(col_map, clf.feature_importances_):
        agg[col] += float(imp_val)

    rows = [{"feature": col, "importance": agg.get(col, 0.0)} for col in feature_cols]
    return pd.DataFrame(rows).sort_values("importance", ascending=False)


def train_classifier(df: pd.DataFrame) -> None:
    d = df.dropna(subset=[TARGET_COLUMN]).copy()
    feature_cols = _feature_cols(d)
    X = d[feature_cols]
    y = d[TARGET_COLUMN]

    # stratify=y preserves class balance in both splits (Ch. 13)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    # Preprocessing is INSIDE the pipeline — fit_transform() on train only
    pipe = _build_pipeline(
        X_train,
        RandomForestClassifier(
            n_estimators=400,
            max_depth=7,
            min_samples_leaf=2,
            class_weight="balanced_subsample",
            random_state=42,
            n_jobs=-1,
        ),
    )
    pipe.fit(X_train, y_train)

    proba = pipe.predict_proba(X_test)[:, 1]
    m = evaluate_binary(y_test, proba)
    m.update({"n_train": int(len(X_train)), "n_test": int(len(X_test))})
    save_json(m, ARTIFACT_DIR / "predictive_dropout_metrics.json")

    # Aggregate OHE importances → original column names (for API explain endpoint)
    _aggregate_importances(pipe, feature_cols).to_csv(
        ARTIFACT_DIR / "predictive_dropout_importance.csv", index=False
    )

    joblib.dump(pipe, ARTIFACT_DIR / "predictive_dropout_model.joblib")


def train_regressor(df: pd.DataFrame) -> None:
    d = df.dropna(subset=[SURROGATE_TARGET]).copy()
    feature_cols = _feature_cols(d)
    X = d[feature_cols]
    y = d[SURROGATE_TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42
    )

    pipe = _build_pipeline(
        X_train,
        RandomForestRegressor(
            n_estimators=400, max_depth=7, min_samples_leaf=2, random_state=42, n_jobs=-1
        ),
    )
    pipe.fit(X_train, y_train)

    pred = pipe.predict(X_test)
    m = evaluate_regression(y_test, pred)
    m.update({"n_train": int(len(X_train)), "n_test": int(len(X_test))})
    save_json(m, ARTIFACT_DIR / "predictive_attendance_change_metrics.json")

    _aggregate_importances(pipe, feature_cols).to_csv(
        ARTIFACT_DIR / "predictive_attendance_change_importance.csv", index=False
    )
    joblib.dump(pipe, ARTIFACT_DIR / "predictive_attendance_change_model.joblib")


def main() -> None:
    df = pd.read_csv(ARTIFACT_DIR / "train_dataset.csv")
    train_classifier(df)
    train_regressor(df)
    print("Saved predictive outputs.")


if __name__ == "__main__":
    main()
