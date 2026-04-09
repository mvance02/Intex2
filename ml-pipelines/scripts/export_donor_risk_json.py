"""
Post-training step: convert donor_risk_scores.parquet → donor_risk_scores.json
and copy it to the .NET backend Infrastructure directory so the API serves
fresh predictions without needing the Python sidecar at runtime.

Run after train_donor_churn.py:
    python scripts/export_donor_risk_json.py
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import pandas as pd

_ROOT = Path(__file__).resolve().parent.parent
SCORES_PARQUET = _ROOT / "outputs" / "donor_retention" / "donor_risk_scores.parquet"
BACKEND_JSON = _ROOT.parent / "backend" / "HopeHaven.API" / "Infrastructure" / "donor_risk_scores.json"


def _tier(score: float) -> str:
    if score >= 0.75:
        return "Critical"
    if score >= 0.50:
        return "High"
    if score >= 0.25:
        return "Moderate"
    return "Low"


def _safe(v: object) -> object:
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def export() -> None:
    if not SCORES_PARQUET.exists():
        raise FileNotFoundError(f"Scores not found at {SCORES_PARQUET}. Run train_donor_churn.py first.")

    df = pd.read_parquet(SCORES_PARQUET)
    df["risk_tier"] = df["churn_risk"].apply(_tier)

    tier_counts = df["risk_tier"].value_counts().to_dict()
    donors = [
        {
            "supporter_id": int(row["supporter_id"]),
            "churn_risk": _safe(float(row["churn_risk"])),
            "risk_tier": str(row["risk_tier"]),
            "at_risk_top20": bool(row.get("at_risk_top20", 0)),
            "suggested_action": str(row.get("suggested_action", "")),
            "suggested_why": str(row.get("suggested_why", "")),
        }
        for _, row in df.sort_values("churn_risk", ascending=False).iterrows()
    ]

    output = {
        "stats": {
            "total_donors": len(df),
            "high_priority_count": int(df["at_risk_top20"].sum()),
            "avg_risk": round(float(df["churn_risk"].mean()), 4),
            "tier_counts": {
                "Critical": int(tier_counts.get("Critical", 0)),
                "High": int(tier_counts.get("High", 0)),
                "Moderate": int(tier_counts.get("Moderate", 0)),
                "Low": int(tier_counts.get("Low", 0)),
            },
        },
        "donors": donors,
    }

    BACKEND_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(BACKEND_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Exported {len(donors)} donors → {BACKEND_JSON}")


if __name__ == "__main__":
    export()
