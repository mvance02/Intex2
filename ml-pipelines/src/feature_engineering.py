"""Feature engineering for the donor retention risk pipeline.

Follows CRISP-DM Phases 2–3 (Data Understanding → Data Preparation).
All transformations are pure functions — no sklearn state here.
Sklearn preprocessing (imputation, scaling, encoding) lives in modeling.py
inside a Pipeline so fit_transform() is called on training data only (Ch. 11).
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from pathlib import Path


def load_raw_data(
    data_dir: str,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Load the four source tables from disk."""
    base = Path(data_dir)
    donations = pd.read_csv(base / "donations.csv")
    supporters = pd.read_csv(base / "supporters.csv")
    donation_allocations = pd.read_csv(base / "donation_allocations.csv")
    social_posts = pd.read_csv(base / "social_media_posts.csv")
    return donations, supporters, donation_allocations, social_posts


def build_features(
    donations: pd.DataFrame,
    supporters: pd.DataFrame,
    donation_allocations: pd.DataFrame,
    social_posts: pd.DataFrame,
    churn_window_days: int = 180,
) -> tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
    """Build the model feature matrix X, binary churn label y, and meta frame.

    Churn definition: supporter has made no donation in the last
    `churn_window_days` days (measured from the most recent donation date
    in the dataset).

    Returns:
        X     — feature matrix indexed by supporter_id
        y     — binary Series (1 = churned, 0 = active), same index as X
        meta  — supplementary columns for rule-based personalization actions
    """
    donations = donations.copy()
    donations["donation_date"] = pd.to_datetime(donations["donation_date"], errors="coerce")
    donations["amount"] = pd.to_numeric(donations["amount"], errors="coerce")
    # Normalise is_recurring to int regardless of how CSV loaded it
    donations["is_recurring"] = (
        donations["is_recurring"]
        .map({True: 1, False: 0, 1: 1, 0: 0, "True": 1, "False": 0})
        .fillna(0)
        .astype(int)
    )

    reference_date = donations["donation_date"].dropna().max()
    churn_cutoff = reference_date - pd.Timedelta(days=churn_window_days)

    # ── Per-supporter donation aggregations ──────────────────────────────────
    stats = donations.groupby("supporter_id").agg(
        total_donations=("donation_id", "count"),
        avg_donation_amount=("amount", "mean"),
        total_donation_amount=("amount", "sum"),
        last_donation_date=("donation_date", "max"),
        first_donation_date=("donation_date", "min"),
        pct_recurring=("is_recurring", "mean"),
        # Count donations that arrived via a social media referral
        social_driven_count=("referral_post_id", lambda x: int(x.notna().sum())),
    )

    stats["days_since_last_donation"] = (
        (reference_date - stats["last_donation_date"]).dt.days.astype(float)
    )
    days_active = (
        (reference_date - stats["first_donation_date"]).dt.days.clip(lower=1).astype(float)
    )
    # Annualised donation rate
    stats["donation_frequency"] = stats["total_donations"] / (days_active / 365.25)
    stats["days_since_first_donation"] = days_active

    # Social engagement proxy (Ch. 8: feature-level exploration)
    stats["num_posts"] = stats["social_driven_count"].astype(int)
    stats["engagement_score"] = stats["social_driven_count"].astype(float) * 3.0

    # ── Churn label ───────────────────────────────────────────────────────────
    stats["churn"] = (stats["last_donation_date"] < churn_cutoff).astype(int)

    # ── Cause focus from allocation history ──────────────────────────────────
    alloc = donation_allocations.merge(
        donations[["donation_id", "supporter_id"]], on="donation_id", how="left"
    )
    alloc["amount_allocated"] = pd.to_numeric(alloc["amount_allocated"], errors="coerce")
    cause = (
        alloc.groupby(["supporter_id", "program_area"], as_index=False)["amount_allocated"]
        .sum()
        .sort_values(["supporter_id", "amount_allocated"], ascending=[True, False])
        .drop_duplicates(subset=["supporter_id"], keep="first")
        .rename(columns={"program_area": "cause_focus"})
        .set_index("supporter_id")[["cause_focus"]]
    )

    # ── Supporter profile features ────────────────────────────────────────────
    profile_cols = [
        "supporter_id", "supporter_type", "relationship_type",
        "region", "country", "acquisition_channel", "status",
    ]
    profile_cols = [c for c in profile_cols if c in supporters.columns]
    sup = supporters[profile_cols].set_index("supporter_id")

    df = stats.join(sup, how="left").join(cause, how="left")

    feature_cols = [
        "total_donations",
        "avg_donation_amount",
        "total_donation_amount",
        "days_since_last_donation",
        "days_since_first_donation",
        "donation_frequency",
        "pct_recurring",
        "num_posts",
        "engagement_score",
        "supporter_type",
        "relationship_type",
        "region",
        "country",
        "acquisition_channel",
        "status",
    ]
    feature_cols = [c for c in feature_cols if c in df.columns]

    X = df[feature_cols].copy()
    y = df["churn"].copy()

    meta_cols = [
        "cause_focus",
        "avg_donation_amount",
        "donation_frequency",
        "days_since_last_donation",
        "engagement_score",
        "num_posts",
    ]
    meta = df[[c for c in meta_cols if c in df.columns]].copy()

    return X, y, meta


def apply_log_transforms(
    X: pd.DataFrame, skew_threshold: float = 1.0
) -> tuple[pd.DataFrame, list[str]]:
    """Log1p-transform numeric columns whose absolute skewness exceeds the threshold.

    Applied to training data; the list of transformed column names is saved
    so the same transformation can be applied identically at test / inference
    time (Ch. 7, Ch. 17 repeatability principle).
    """
    X = X.copy()
    transformed: list[str] = []
    for col in X.select_dtypes(include=[np.number]).columns:
        series = X[col].dropna()
        if len(series) > 2 and abs(float(series.skew())) > skew_threshold:
            X[col] = np.log1p(X[col].clip(lower=0))
            transformed.append(col)
    return X, transformed
