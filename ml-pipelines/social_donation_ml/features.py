"""Encoding layer after wrangling (generalizable structure → model-ready matrix)."""

from __future__ import annotations

import pandas as pd

FEATURE_COLS = [
    "platform",
    "day_of_week",
    "post_hour",
    "post_type",
    "media_type",
    "content_topic",
    "sentiment_tone",
    "num_hashtags",
    "mentions_count",
    "has_call_to_action",
    "call_to_action_type",
    "features_resident_story",
    "caption_length",
    "is_boosted",
    "boost_budget_php",
]

CAT_COLS = [
    "platform",
    "day_of_week",
    "post_type",
    "media_type",
    "content_topic",
    "sentiment_tone",
    "call_to_action_type",
]

NUM_COLS = [
    "post_hour",
    "num_hashtags",
    "mentions_count",
    "caption_length",
    "boost_budget_php",
]

BOOL_COLS = ["has_call_to_action", "features_resident_story", "is_boosted"]


def build_model_frame(raw: pd.DataFrame) -> pd.DataFrame:
    """Turn wrangled post rows into numeric/boolean + filled categoricals for sklearn/statsmodels."""
    out = raw.copy()
    for c in CAT_COLS:
        out[c] = out[c].fillna("(missing)").astype(str).replace("", "(missing)")
    for c in NUM_COLS:
        out[c] = pd.to_numeric(out[c], errors="coerce")
    out["boost_budget_php"] = out["boost_budget_php"].fillna(0.0)
    out.loc[~out["is_boosted"].astype(bool), "boost_budget_php"] = 0.0
    for c in BOOL_COLS:
        out[c] = out[c].map(lambda x: x is True or str(x).lower() == "true").astype(int)
    return out
