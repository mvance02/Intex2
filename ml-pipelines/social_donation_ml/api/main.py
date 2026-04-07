"""
FastAPI service for the social → donation draft planner (admin tool).

Run from repo: uvicorn api.main:app --reload --port 8002
(App directory must be social_donation_ml so imports resolve.)
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from features import FEATURE_COLS, build_model_frame  # noqa: E402

ARTIFACTS = ROOT / "artifacts"
BUNDLE_PATH = ARTIFACTS / "social_bundle.joblib"
DATA_DIR = ROOT.parent
POSTS_CSV = DATA_DIR / "social_media_posts.csv"

app = FastAPI(title="Social Content Planner API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_bundle: dict[str, Any] | None = None


def _py(v: Any) -> Any:
    if pd.isna(v):
        return None
    if hasattr(v, "item"):
        try:
            return v.item()
        except Exception:
            return str(v)
    return v


def _load_bundle() -> dict[str, Any]:
    global _bundle
    if _bundle is None:
        if not BUNDLE_PATH.exists():
            raise FileNotFoundError(
                f"Missing {BUNDLE_PATH}. Run: python train_export.py"
            )
        _bundle = joblib.load(BUNDLE_PATH)
    return _bundle


class DraftPost(BaseModel):
    platform: str = Field(default="Instagram", examples=["Instagram"])
    day_of_week: str = Field(default="Tuesday")
    post_hour: int = Field(default=18, ge=0, le=23)
    post_type: str = Field(default="FundraisingAppeal")
    media_type: str = Field(default="Carousel")
    content_topic: str = Field(default="Education")
    sentiment_tone: str = Field(default="Hopeful")
    num_hashtags: int = Field(default=3, ge=0)
    mentions_count: int = Field(default=0, ge=0)
    has_call_to_action: bool = Field(default=True)
    call_to_action_type: str = Field(default="DonateNow")
    features_resident_story: bool = Field(default=False)
    caption_length: int = Field(default=280, ge=0)
    is_boosted: bool = Field(default=False)
    boost_budget_php: float = Field(default=0.0, ge=0)


@app.get("/")
def planner_page() -> FileResponse:
    return FileResponse(Path(__file__).resolve().parent / "content_planner.html")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "social-content-planner"}


@app.get("/field-options")
def field_options() -> dict[str, Any]:
    """Unique values from your data for dropdowns (falls back if CSV missing)."""
    fallback = {
        "platform": ["Facebook", "Instagram", "LinkedIn", "TikTok", "Twitter", "WhatsApp", "YouTube"],
        "post_type": ["Campaign", "EducationalContent", "EventPromotion", "FundraisingAppeal", "ImpactStory", "ThankYou"],
        "media_type": ["Carousel", "Photo", "Reel", "Text", "Video"],
        "content_topic": [
            "AwarenessRaising",
            "CampaignLaunch",
            "DonorImpact",
            "Education",
            "EventRecap",
            "Gratitude",
            "Health",
            "Reintegration",
            "SafehouseLife",
        ],
        "sentiment_tone": ["Celebratory", "Emotional", "Grateful", "Hopeful", "Informative", "Urgent"],
        "call_to_action_type": ["DonateNow", "LearnMore", "ShareStory", "SignUp"],
        "day_of_week": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    }
    if not POSTS_CSV.exists():
        return fallback
    try:
        p = pd.read_csv(POSTS_CSV, usecols=["platform", "post_type", "media_type", "content_topic", "sentiment_tone", "call_to_action_type"])
    except Exception:
        return fallback
    out: dict[str, list[str]] = {"day_of_week": fallback["day_of_week"]}
    for col in [
        "platform",
        "post_type",
        "media_type",
        "content_topic",
        "sentiment_tone",
        "call_to_action_type",
    ]:
        out[col] = sorted(
            p[col].dropna().astype(str).str.strip().replace("", pd.NA).dropna().unique().tolist()
        )
    return out


@app.get("/model-info")
def model_info() -> dict[str, Any]:
    try:
        b = _load_bundle()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    meta = b.get("meta", {})
    return {
        "loaded": True,
        "artifact": str(BUNDLE_PATH),
        **meta,
    }


@app.post("/predict/draft")
def predict_draft(draft: DraftPost) -> dict[str, Any]:
    try:
        b = _load_bundle()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    row = draft.model_dump()
    X = build_model_frame(pd.DataFrame([row]))[FEATURE_COLS]

    reg_ref = b["reg_referrals"]
    reg_val = b["reg_value"]
    clf = b["clf_high_referrals"]
    meta = b.get("meta", {})

    pred_ref = float(reg_ref.predict(X)[0])
    pred_val = float(reg_val.predict(X)[0])
    pr = clf.predict_proba(X)[0]
    p_high = float(pr[1]) if len(pr) > 1 else float(pr[0])
    cls = int(clf.predict(X)[0])

    thr = meta.get("high_referral_threshold")
    if p_high >= 0.55:
        band = "Likely stronger than typical"
        band_key = "high"
    elif p_high >= 0.28:
        band = "Around typical"
        band_key = "mid"
    else:
        band = "Below typical in this model"
        band_key = "low"

    return {
        "predicted_donation_referrals": _py(pred_ref),
        "predicted_estimated_donation_value_php": _py(pred_val),
        "high_performer_probability": _py(p_high),
        "high_performer_class": cls,
        "high_performer_definition": meta.get("high_label"),
        "training_threshold_referrals": thr,
        "performance_band_label": band,
        "performance_band_key": band_key,
        "high_performer_classifier": meta.get("chosen_classifier"),
        "disclaimer": "Predictions are statistical estimates from historical posts, not guarantees.",
    }


@app.post("/predict/draft/sweep-hours")
def sweep_hours(draft: DraftPost) -> dict[str, Any]:
    """Best post_hour 7–21 for predicted referrals (same draft, varying hour)."""
    try:
        b = _load_bundle()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    reg_ref = b["reg_referrals"]
    best_h, best_p = None, -1e18
    series: list[dict[str, Any]] = []
    base = draft.model_dump()
    for h in range(7, 22):
        base["post_hour"] = h
        X = build_model_frame(pd.DataFrame([base]))[FEATURE_COLS]
        p = float(reg_ref.predict(X)[0])
        series.append({"post_hour": h, "predicted_donation_referrals": round(p, 4)})
        if p > best_p:
            best_p, best_h = p, h
    return {
        "best_post_hour": best_h,
        "predicted_donation_referrals_at_best": round(best_p, 4),
        "sweep": series,
    }
