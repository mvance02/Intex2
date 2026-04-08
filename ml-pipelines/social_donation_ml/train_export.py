#!/usr/bin/env python3
"""
Ch17 training path: wrangle → split → CV/tuning on train → fit finals → joblib bundle.

Picks the strongest stratified CV classifier among LogisticRegression, DecisionTree, RandomForest.
Tunes GradientBoostingRegressor lightly for referral prediction.
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import (
    GridSearchCV,
    StratifiedKFold,
    cross_val_score,
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
# Single-threaded CV avoids sandbox / some classroom permission issues; raise on a beefy machine.
N_JOBS = 1

PREPROCESS = ColumnTransformer(
    [
        ("cat", OneHotEncoder(handle_unknown="ignore"), CAT_COLS),
        ("num", StandardScaler(), NUM_COLS + BOOL_COLS),
    ]
)


def _pick_classifier(
    X_train: pd.DataFrame, y_hi_train: pd.Series
) -> tuple[str, Pipeline, dict[str, float]]:
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    candidates: dict[str, Pipeline] = {
        "logistic": Pipeline(
            [
                ("prep", clone(PREPROCESS)),
                (
                    "model",
                    LogisticRegression(
                        max_iter=3000,
                        class_weight="balanced",
                        solver="lbfgs",
                    ),
                ),
            ]
        ),
        "tree": Pipeline(
            [
                ("prep", clone(PREPROCESS)),
                (
                    "model",
                    DecisionTreeClassifier(
                        max_depth=8,
                        class_weight="balanced",
                        random_state=RANDOM_STATE,
                    ),
                ),
            ]
        ),
        "forest": Pipeline(
            [
                ("prep", clone(PREPROCESS)),
                (
                    "model",
                    RandomForestClassifier(
                        n_estimators=250,
                        max_depth=14,
                        class_weight="balanced",
                        random_state=RANDOM_STATE,
                        n_jobs=N_JOBS,
                    ),
                ),
            ]
        ),
    }
    scores: dict[str, float] = {}
    for name, pipe in candidates.items():
        aucs = cross_val_score(
            clone(pipe),
            X_train,
            y_hi_train,
            cv=cv,
            scoring="roc_auc",
            n_jobs=N_JOBS,
        )
        scores[name] = float(aucs.mean())
    best_name = max(scores, key=lambda k: scores[k])
    best_pipe = clone(candidates[best_name])
    best_pipe.fit(X_train, y_hi_train)
    return best_name, best_pipe, scores


def main() -> None:
    posts = pd.read_csv(DATA / "social_media_posts.csv")
    donations = pd.read_csv(DATA / "donations.csv")
    df = wrangle_social_posts_with_donations(posts, donations)
    m = build_model_frame(df)
    X = m[FEATURE_COLS]

    y_ref = pd.to_numeric(m["donation_referrals"], errors="coerce").fillna(0)
    y_val = pd.to_numeric(m["estimated_donation_value_php"], errors="coerce").fillna(0)

    X_train, X_test, y_ref_train, y_ref_test, y_val_train, y_val_test = train_test_split(
        X, y_ref, y_val, test_size=TEST_SIZE, random_state=RANDOM_STATE
    )

    q75 = float(y_ref_train.quantile(0.75))
    y_hi_train = (y_ref_train >= q75).astype(int)

    clf_name, clf_pipe, clf_cv = _pick_classifier(X_train, y_hi_train)

    gb_referrals = Pipeline(
        [
            ("prep", clone(PREPROCESS)),
            (
                "model",
                GradientBoostingRegressor(
                    random_state=RANDOM_STATE,
                ),
            ),
        ]
    )
    grid_gb = {
        "model__n_estimators": [150, 250],
        "model__max_depth": [3, 5],
        "model__learning_rate": [0.04, 0.08],
    }
    search_ref = GridSearchCV(
        clone(gb_referrals),
        grid_gb,
        cv=3,
        scoring="neg_root_mean_squared_error",
        n_jobs=N_JOBS,
        refit=True,
    )
    search_ref.fit(X_train, y_ref_train)
    reg_ref = search_ref.best_estimator_

    search_val = GridSearchCV(
        clone(gb_referrals),
        grid_gb,
        cv=3,
        scoring="neg_root_mean_squared_error",
        n_jobs=N_JOBS,
        refit=True,
    )
    search_val.fit(X_train, y_val_train)
    reg_val = search_val.best_estimator_

    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    meta = {
        "high_referral_threshold": q75,
        "high_label": "top_quartile_donation_referrals",
        "targets": ["donation_referrals", "estimated_donation_value_php"],
        "chosen_classifier": clf_name,
        "classifier_cv_roc_auc_mean": clf_cv,
        "gb_referrals_best_params": search_ref.best_params_,
        "gb_value_best_params": search_val.best_params_,
    }
    bundle = {
        "reg_referrals": reg_ref,
        "reg_value": reg_val,
        "clf_high_referrals": clf_pipe,
        "meta": meta,
    }
    joblib.dump(bundle, ARTIFACTS / "social_bundle.joblib")
    (ARTIFACTS / "social_model_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("Saved:", ARTIFACTS / "social_bundle.joblib")
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
