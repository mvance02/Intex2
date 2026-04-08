"""
FastAPI service for the Donor Retention Risk dashboard.

Run from ml-pipelines/:
    uvicorn donor_retention_risk_api:app --port 8003 --reload
"""
from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

SCORES_PATH = (
    Path(__file__).resolve().parent
    / "outputs"
    / "donor_retention"
    / "donor_risk_scores.parquet"
)

app = FastAPI(title="Donor Retention Risk API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_df: pd.DataFrame | None = None


def _load() -> pd.DataFrame:
    global _df
    if _df is None:
        if not SCORES_PATH.exists():
            raise FileNotFoundError(
                f"Scores not found at {SCORES_PATH}. "
                "Run: python scripts/train_donor_churn.py"
            )
        raw = pd.read_parquet(SCORES_PATH)
        raw = raw.copy()
        raw["risk_tier"] = raw["churn_risk"].apply(_tier)
        _df = raw
    return _df


def _tier(score: float) -> str:
    if score >= 0.75:
        return "Critical"
    if score >= 0.50:
        return "High"
    if score >= 0.25:
        return "Moderate"
    return "Low"


def _safe(v: Any) -> Any:
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


@app.get("/health")
def health():
    try:
        df = _load()
        return {"status": "ok", "donor_count": len(df)}
    except FileNotFoundError as exc:
        return {"status": "model_not_trained", "detail": str(exc)}


@app.get("/donor-risk/stats")
def stats():
    df = _load()
    tier_counts = df["risk_tier"].value_counts().to_dict()
    high_priority = int(df["at_risk_top20"].sum()) if "at_risk_top20" in df.columns else 0
    avg_risk = float(df["churn_risk"].mean())
    return {
        "total_donors": len(df),
        "high_priority_count": high_priority,
        "avg_risk": round(avg_risk, 4),
        "tier_counts": {
            "Critical": int(tier_counts.get("Critical", 0)),
            "High": int(tier_counts.get("High", 0)),
            "Moderate": int(tier_counts.get("Moderate", 0)),
            "Low": int(tier_counts.get("Low", 0)),
        },
    }


@app.get("/donor-risk/all")
def all_donors(tier: str | None = None, min_risk: float = 0.0):
    df = _load()
    view = df.copy()
    if tier:
        view = view[view["risk_tier"] == tier]
    view = view[view["churn_risk"] >= min_risk]
    view = view.sort_values("churn_risk", ascending=False)

    records = []
    for _, row in view.iterrows():
        records.append({
            "supporter_id": int(row["supporter_id"]),
            "churn_risk": _safe(float(row["churn_risk"])),
            "risk_tier": str(row["risk_tier"]),
            "at_risk_top20": bool(row.get("at_risk_top20", 0)),
            "suggested_action": str(row.get("suggested_action", "")),
            "suggested_why": str(row.get("suggested_why", "")),
        })
    return {"donors": records, "count": len(records)}
