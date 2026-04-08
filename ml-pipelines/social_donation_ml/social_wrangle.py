"""
Dataset-specific wrangling: social posts + donation referrals (Course Ch7 funnel).

Hard-coded for this project (like wrangle_insurance() in the textbook).
Mirrors the notebook; imported by train_export.py for the Ch17 training path.
"""

from __future__ import annotations

import pandas as pd


def donation_gift_value(row: pd.Series) -> float:
    amt = pd.to_numeric(row.get("amount"), errors="coerce")
    est = pd.to_numeric(row.get("estimated_value"), errors="coerce")
    if pd.notna(amt) and amt > 0:
        return float(amt)
    if pd.notna(est):
        return float(est)
    return 0.0


def wrangle_social_posts_with_donations(
    posts: pd.DataFrame,
    donations: pd.DataFrame,
) -> pd.DataFrame:
    """
    Aggregate CRM gifts by referral_post_id and left-join to each row in social_media_posts.
    """
    don = donations.copy()
    don["_gift"] = don.apply(donation_gift_value, axis=1)
    linked = don["referral_post_id"].notna()
    agg = (
        don.loc[linked]
        .groupby("referral_post_id", as_index=False)
        .agg(
            n_donations_linked=("donation_id", "count"),
            total_gift_php=("_gift", "sum"),
        )
    )
    agg["referral_post_id"] = agg["referral_post_id"].astype(int)
    agg = agg.rename(columns={"referral_post_id": "post_id"})

    out = posts.merge(agg, on="post_id", how="left")
    out["n_donations_linked"] = out["n_donations_linked"].fillna(0).astype(int)
    out["total_gift_php"] = out["total_gift_php"].fillna(0.0)
    return out
