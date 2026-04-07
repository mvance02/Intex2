"""Predictive models: Random Forest for dropout risk + attendance trend."""

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from config import ARTIFACT_DIR, SURROGATE_TARGET, TARGET_COLUMN
from models.evaluate import evaluate_binary, evaluate_regression, save_json

LEAKAGE = {TARGET_COLUMN, SURROGATE_TARGET, "resident_id"}


def _feature_cols(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if c not in LEAKAGE]


def _matrix(df: pd.DataFrame, target: str):
    d = df.dropna(subset=[target]).copy()
    X = pd.get_dummies(d[_feature_cols(d)], drop_first=True)
    X = X.apply(pd.to_numeric, errors="coerce")
    y = d[target]
    return X, y


def train_classifier(df: pd.DataFrame) -> None:
    X, y = _matrix(df, TARGET_COLUMN)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
    pipe = Pipeline(
        [
            ("imp", SimpleImputer(strategy="median")),
            (
                "rf",
                RandomForestClassifier(
                    n_estimators=400,
                    max_depth=7,
                    min_samples_leaf=2,
                    class_weight="balanced_subsample",
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )
    pipe.fit(X_train, y_train)
    proba = pipe.predict_proba(X_test)[:, 1]
    m = evaluate_binary(y_test, proba)
    m.update({"n_train": int(len(X_train)), "n_test": int(len(X_test))})
    save_json(m, ARTIFACT_DIR / "predictive_dropout_metrics.json")

    rf = pipe.named_steps["rf"]
    imp = pd.DataFrame({"feature": X.columns, "importance": rf.feature_importances_}).sort_values(
        "importance", ascending=False
    )
    imp.to_csv(ARTIFACT_DIR / "predictive_dropout_importance.csv", index=False)
    joblib.dump(pipe, ARTIFACT_DIR / "predictive_dropout_model.joblib")


def train_regressor(df: pd.DataFrame) -> None:
    X, y = _matrix(df, SURROGATE_TARGET)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)
    pipe = Pipeline(
        [
            ("imp", SimpleImputer(strategy="median")),
            ("rf", RandomForestRegressor(n_estimators=400, max_depth=7, min_samples_leaf=2, random_state=42, n_jobs=-1)),
        ]
    )
    pipe.fit(X_train, y_train)
    pred = pipe.predict(X_test)
    m = evaluate_regression(y_test, pred)
    m.update({"n_train": int(len(X_train)), "n_test": int(len(X_test))})
    save_json(m, ARTIFACT_DIR / "predictive_attendance_change_metrics.json")

    rf = pipe.named_steps["rf"]
    imp = pd.DataFrame({"feature": X.columns, "importance": rf.feature_importances_}).sort_values(
        "importance", ascending=False
    )
    imp.to_csv(ARTIFACT_DIR / "predictive_attendance_change_importance.csv", index=False)
    joblib.dump(pipe, ARTIFACT_DIR / "predictive_attendance_change_model.joblib")


def main() -> None:
    df = pd.read_csv(ARTIFACT_DIR / "train_dataset.csv")
    train_classifier(df)
    train_regressor(df)
    print("Saved predictive outputs.")


if __name__ == "__main__":
    main()
