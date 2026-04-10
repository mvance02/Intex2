"""
FastAPI sidecar — Reintegration Readiness & Type Prediction
(1 of 3 integrated ML pipelines)

Deployed on Railway as `determined-gentleness`.
The .NET backend calls: POST /predict/{resident_id}

Run locally:  uvicorn api:app --host 0.0.0.0 --port 8001
Install:      pip install fastapi uvicorn scikit-learn numpy pandas statsmodels shap
"""
import pickle
import re
import warnings
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

warnings.filterwarnings("ignore")

# ── Load artefacts once at startup ────────────────────────────────────────────
MODEL_PATH = Path(__file__).parent / "models" / "reintegration_pipeline.pkl"

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Model file not found at {MODEL_PATH}. "
        "Run the notebook (reintegration-readiness.ipynb) first to generate it."
    )

with open(MODEL_PATH, "rb") as f:
    artefacts = pickle.load(f)

model_readiness: Any   = artefacts["model1_readiness"]
model_type: Any        = artefacts["model2_type"]
feature_names: list    = artefacts["feature_names"]
type_classes: list     = artefacts["type_classes"]
metadata: dict         = artefacts["metadata"]

# ── Data loading helpers (mirrors notebook feature engineering) ───────────────
# In production (Railway), CSVs are bundled in ml-pipelines/data/.
# In local dev they live one level up in lighthouse_csv_v7/.
_local_data = Path(__file__).parent / "data"
_dev_data   = Path(__file__).parent.parent / "lighthouse_csv_v7"
DATA_DIR    = _local_data if _local_data.exists() else _dev_data

POSITIVE_STATES   = {"Hopeful", "Calm", "Happy"}
RISK_ORD          = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
COOP_ORD          = {"Uncooperative": 0, "Neutral": 1, "Cooperative": 2, "Highly Cooperative": 3}
VISIT_OUTCOME_ORD = {"Unfavorable": 0, "Inconclusive": 1, "Needs Improvement": 2, "Favorable": 3}
TYPE_MAP          = {
    "Adoption (Domestic)":      "Adoption",
    "Adoption (Inter-Country)": "Adoption",
    "Family Reunification":     "Family Reunification",
    "Foster Care":              "Foster Care",
    "Independent Living":       "Independent Living",
}


def parse_duration_months(s: Any) -> float:
    if pd.isna(s):
        return 0.0
    s = str(s).lower()
    y = re.search(r"(\d+)\s*year", s)
    m = re.search(r"(\d+)\s*month", s)
    return float((int(y.group(1)) if y else 0) * 12 + (int(m.group(1)) if m else 0))


def build_feature_row(resident_id: int) -> pd.DataFrame:
    """Re-engineer all features for a single resident, matching notebook logic."""
    residents   = pd.read_csv(DATA_DIR / "residents.csv")
    process_rec = pd.read_csv(DATA_DIR / "process_recordings.csv", parse_dates=["session_date"])
    education   = pd.read_csv(DATA_DIR / "education_records.csv",  parse_dates=["record_date"])
    health      = pd.read_csv(DATA_DIR / "health_wellbeing_records.csv", parse_dates=["record_date"])
    visitations = pd.read_csv(DATA_DIR / "home_visitations.csv",   parse_dates=["visit_date"])
    incidents   = pd.read_csv(DATA_DIR / "incident_reports.csv",   parse_dates=["incident_date"])
    iplan       = pd.read_csv(DATA_DIR / "intervention_plans.csv")

    if resident_id not in residents["resident_id"].values:
        raise HTTPException(status_code=404, detail=f"resident_id {resident_id} not found")

    r_row = residents[residents["resident_id"] == resident_id].iloc[0]

    bool_cols = [
        "sub_cat_orphaned", "sub_cat_trafficked", "sub_cat_child_labor",
        "sub_cat_physical_abuse", "sub_cat_sexual_abuse", "sub_cat_osaec",
        "sub_cat_cicl", "sub_cat_at_risk", "sub_cat_street_child", "sub_cat_child_with_hiv",
        "is_pwd", "has_special_needs",
        "family_is_4ps", "family_solo_parent", "family_indigenous",
        "family_parent_pwd", "family_informal_settler",
    ]

    # Base resident features
    row: dict = {
        "los_months":        parse_duration_months(r_row.get("length_of_stay")),
        "age_admit_months":  parse_duration_months(r_row.get("age_upon_admission")),
        "initial_risk_ord":  RISK_ORD.get(r_row.get("initial_risk_level", "Low"), 0),
        "current_risk_ord":  RISK_ORD.get(r_row.get("current_risk_level", "Low"), 0),
    }
    for col in bool_cols:
        row[col] = int(bool(r_row.get(col, False)))

    # Case category dummies (align with training set categories)
    for cat in ["Surrendered", "Abandoned", "Foundling", "Neglected"]:
        row[f"cat_{cat}"] = int(r_row.get("case_category", "") == cat)

    # Referral source dummies
    for ref in ["Government Agency", "NGO", "Self-referral", "Hospital", "Police"]:
        row[f"ref_{ref}"] = int(r_row.get("referral_source", "") == ref)

    # Process recordings
    pr = process_rec[process_rec["resident_id"] == resident_id]
    if not pr.empty:
        pr = pr.copy()
        pr["is_positive_end"] = pr["emotional_state_end"].isin(POSITIVE_STATES).astype(int)
        active_days = max((pr["session_date"].max() - pr["session_date"].min()).days, 1)
        row.update({
            "session_count":          len(pr),
            "avg_session_duration":   pr["session_duration_minutes"].mean(),
            "pct_positive_end":       pr["is_positive_end"].mean(),
            "pct_concerns_flagged":   pr["concerns_flagged"].astype(bool).mean(),
            "pct_progress_noted":     pr["progress_noted"].astype(bool).mean(),
            "pct_individual_session": (pr["session_type"] == "Individual").mean(),
            "pct_referral_made":      pr["referral_made"].astype(bool).mean(),
            "pct_has_caring":         pr["interventions_applied"].str.contains("Caring",  na=False).mean(),
            "pct_has_healing":        pr["interventions_applied"].str.contains("Healing", na=False).mean(),
            "pct_has_teaching":       pr["interventions_applied"].str.contains("Teaching",na=False).mean(),
            "pct_has_legal":          pr["interventions_applied"].str.contains("Legal",   na=False).mean(),
            "sessions_per_month":     len(pr) / active_days * 30,
            "recent_positive_rate":   pr.sort_values("session_date").tail(10)["is_positive_end"].mean(),
        })

    # Education records
    ed = education[education["resident_id"] == resident_id]
    if not ed.empty:
        ed_sorted = ed.sort_values("record_date")
        row.update({
            "avg_progress_pct":      ed["progress_percent"].mean(),
            "avg_attendance_rate":   ed["attendance_rate"].mean(),
            "pct_completed_records": (ed["completion_status"] == "Completed").mean(),
            "education_record_count": len(ed),
            "latest_progress_pct":   ed_sorted["progress_percent"].iloc[-1],
            "latest_attendance_rate": ed_sorted["attendance_rate"].iloc[-1],
        })

    # Health records
    h = health[health["resident_id"] == resident_id]
    if not h.empty:
        h_sorted = h.sort_values("record_date").reset_index(drop=True)
        slope = float(np.polyfit(h_sorted.index.astype(float), h_sorted["general_health_score"], 1)[0]) if len(h_sorted) >= 2 else 0.0
        row.update({
            "avg_health_score":    h["general_health_score"].mean(),
            "avg_nutrition":       h["nutrition_score"].mean(),
            "avg_sleep":           h["sleep_quality_score"].mean(),
            "avg_energy":          h["energy_level_score"].mean(),
            "pct_psych_checkup":   h["psychological_checkup_done"].astype(bool).mean(),
            "pct_medical_checkup": h["medical_checkup_done"].astype(bool).mean(),
            "latest_health_score": h_sorted["general_health_score"].iloc[-1],
            "health_trend_slope":  slope,
        })

    # Home visitations
    v = visitations[visitations["resident_id"] == resident_id]
    if not v.empty:
        v = v.copy()
        v["coop_ord"]    = v["family_cooperation_level"].map(COOP_ORD)
        v["outcome_ord"] = v["visit_outcome"].map(VISIT_OUTCOME_ORD)
        v_sorted = v.sort_values("visit_date")
        row.update({
            "visit_count":            len(v),
            "pct_favorable_visits":   (v["visit_outcome"] == "Favorable").mean(),
            "pct_safety_concerns":    v["safety_concerns_noted"].astype(bool).mean(),
            "avg_family_cooperation": v["coop_ord"].mean(),
            "pct_coop_plus":          v["family_cooperation_level"].isin(["Cooperative","Highly Cooperative"]).mean(),
            "recent_visit_outcome_ord": v_sorted["outcome_ord"].iloc[-1],
        })

    # Incidents
    inc = incidents[incidents["resident_id"] == resident_id]
    row.update({
        "total_incidents":   len(inc),
        "has_high_severity": int((inc["severity"] == "High").any()) if not inc.empty else 0,
        "has_runaway":       int((inc["incident_type"] == "RunawayAttempt").any()) if not inc.empty else 0,
        "has_selfharm":      int((inc["incident_type"] == "SelfHarm").any()) if not inc.empty else 0,
        "has_behavioral":    int((inc["incident_type"] == "Behavioral").any()) if not inc.empty else 0,
        "pct_resolved":      inc["resolved"].astype(bool).mean() if not inc.empty else 0.0,
    })

    # Intervention plans
    ip = iplan[iplan["resident_id"] == resident_id]
    if not ip.empty:
        row.update({
            "pct_plans_achieved":    (ip["status"] == "Achieved").mean(),
            "pct_plans_on_hold":     (ip["status"] == "On Hold").mean(),
            "pct_plans_in_progress": (ip["status"] == "In Progress").mean(),
        })

    # Build final row aligned to training feature names
    row_df = pd.DataFrame([row])
    for col in feature_names:
        if col not in row_df.columns:
            row_df[col] = 0.0  # unseen dummy categories default to 0
    return row_df[feature_names].fillna(0.0)


# ── Response schema ───────────────────────────────────────────────────────────
class TopFactor(BaseModel):
    feature: str
    direction: str  # "positive" | "negative"


class PredictionResponse(BaseModel):
    resident_id: int
    readiness_score: float
    readiness_label: str          # "High" | "Medium" | "Low"
    predicted_type: str
    type_probabilities: dict[str, float]
    top_factors: list[TopFactor]
    model_metadata: dict


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Reintegration Readiness API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "model_metadata": metadata}


@app.post("/predict/{resident_id}", response_model=PredictionResponse)
def predict(resident_id: int):
    X_row = build_feature_row(resident_id)
    X_arr = X_row.values.astype(float)

    # Model 1 — readiness
    readiness_score = float(model_readiness.predict_proba(X_arr)[0, 1])
    if readiness_score >= 0.70:
        readiness_label = "High"
    elif readiness_score >= 0.40:
        readiness_label = "Medium"
    else:
        readiness_label = "Low"

    # Model 2 — type
    type_proba = model_type.predict_proba(X_arr)[0]
    predicted_type = type_classes[int(np.argmax(type_proba))]
    type_probabilities = {cls: round(float(p), 3) for cls, p in zip(type_classes, type_proba)}

    # Top factors — navigate through CalibratedClassifierCV wrapper to get feature importances
    top_factors = []
    try:
        # CalibratedClassifierCV stores fitted pipelines in calibrated_classifiers_
        inner_pipeline = model_readiness.calibrated_classifiers_[0].estimator
        clf = inner_pipeline.named_steps["clf"]
        if hasattr(clf, "feature_importances_"):
            fi = clf.feature_importances_
            top_idx = np.argsort(fi)[::-1][:5]
            top_factors = [
                TopFactor(
                    feature=feature_names[i],
                    direction="positive" if X_arr[0, i] > 0 else "negative",
                )
                for i in top_idx
            ]
    except Exception:
        pass

    return PredictionResponse(
        resident_id=resident_id,
        readiness_score=round(readiness_score, 3),
        readiness_label=readiness_label,
        predicted_type=predicted_type,
        type_probabilities=type_probabilities,
        top_factors=top_factors,
        model_metadata={
            "model1": metadata.get("model1_name"),
            "model1_cv_f1": metadata.get("model1_cv_f1"),
            "model2": metadata.get("model2_name"),
            "model2_loo_f1": metadata.get("model2_loo_f1"),
        },
    )
