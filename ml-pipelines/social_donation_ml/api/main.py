"""
FastAPI service for the social → donation draft planner (admin tool).
(3 of 3 integrated ML pipelines)

Deployed on Railway as `sweet-essence`.

Run locally: uvicorn api.main:app --reload --port 8002
(App directory must be social_donation_ml so imports resolve.)
"""

from __future__ import annotations

import itertools
import sys
from pathlib import Path
from typing import Any

import joblib
import numpy as np
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
DATA_DIR = ROOT / "data"
POSTS_CSV = DATA_DIR / "social_media_posts.csv"

app = FastAPI(title="Social Content Planner API", version="0.2.0")

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


class OptimizeRequest(BaseModel):
    """User picks a platform + optional constraints; model finds optimal post config."""
    platform: str = Field(..., examples=["Instagram"])
    optimize_for: str = Field(
        default="donation_value",
        description="Target to maximize: 'donation_value' or 'referrals'",
    )
    # Optional constraints — if provided, lock that value instead of searching
    is_boosted: bool | None = Field(default=None)
    boost_budget_php: float | None = Field(default=None, ge=0)
    features_resident_story: bool | None = Field(default=None)
    has_call_to_action: bool | None = Field(default=None)
    num_hashtags: int | None = Field(default=None, ge=0)
    mentions_count: int | None = Field(default=None, ge=0)
    caption_length: int | None = Field(default=None, ge=0)
    top_n: int = Field(default=10, ge=1, le=50)


class WeeklyScheduleRequest(BaseModel):
    """Generate a diverse 7-day posting schedule across selected platforms."""
    optimize_for: str = Field(
        default="donation_value",
        description="Target to maximize: 'donation_value' or 'referrals'",
    )
    platforms: list[str] | None = Field(
        default=None,
        description="Platforms to include. If omitted, all platforms are used.",
    )
    is_boosted: bool | None = Field(default=None)
    boost_budget_php: float | None = Field(default=None, ge=0)
    features_resident_story: bool | None = Field(default=None)
    has_call_to_action: bool | None = Field(default=None)
    num_hashtags: int | None = Field(default=None, ge=0)
    mentions_count: int | None = Field(default=None, ge=0)
    caption_length: int | None = Field(default=None, ge=0)


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


@app.post("/predict/optimize")
def optimize_post(req: OptimizeRequest) -> dict[str, Any]:
    """
    Two-pass optimizer: find optimal post configuration for a platform.

    Pass 1: Grid categorical combos at a fixed hour (~45K rows), get top 50.
    Pass 2: Sweep hours 7-21 for those top 50, pick overall top N.

    This keeps total predictions under 1K — fast on any server.
    """
    try:
        b = _load_bundle()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    meta = b.get("meta", {})
    field_vals = meta.get("field_values", {})

    model = b["reg_referrals"] if req.optimize_for == "referrals" else b["reg_value"]

    # Dynamic field values from trained model
    days = field_vals.get("day_of_week", [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    ])
    post_types = field_vals.get("post_type", ["FundraisingAppeal"])
    media_types = field_vals.get("media_type", ["Carousel"])
    content_topics = field_vals.get("content_topic", ["Education"])
    sentiment_tones = field_vals.get("sentiment_tone", ["Hopeful"])
    cta_types = field_vals.get("call_to_action_type", ["DonateNow"])

    # Numeric/boolean defaults (or user-constrained)
    num_hashtags = req.num_hashtags if req.num_hashtags is not None else 3
    mentions_count = req.mentions_count if req.mentions_count is not None else 1
    caption_length = req.caption_length if req.caption_length is not None else 280
    is_boosted = req.is_boosted if req.is_boosted is not None else False
    boost_budget = req.boost_budget_php if req.boost_budget_php is not None else 0.0
    has_cta = req.has_call_to_action if req.has_call_to_action is not None else True
    features_story = req.features_resident_story if req.features_resident_story is not None else False

    base_numeric = {
        "platform": req.platform,
        "num_hashtags": num_hashtags,
        "mentions_count": mentions_count,
        "has_call_to_action": has_cta,
        "features_resident_story": features_story,
        "caption_length": caption_length,
        "is_boosted": is_boosted,
        "boost_budget_php": boost_budget if is_boosted else 0.0,
    }

    # --- Pass 1: grid categoricals at noon, find top 50 combos ---
    combos = list(itertools.product(
        days, post_types, media_types,
        content_topics, sentiment_tones, cta_types,
    ))
    rows = []
    for day, pt, mt, ct, st, cta in combos:
        row = {
            **base_numeric,
            "day_of_week": day,
            "post_hour": 12,
            "post_type": pt,
            "media_type": mt,
            "content_topic": ct,
            "sentiment_tone": st,
            "call_to_action_type": cta,
        }
        rows.append(row)

    df_pass1 = pd.DataFrame(rows)
    X_pass1 = build_model_frame(df_pass1)[FEATURE_COLS]
    preds_pass1 = model.predict(X_pass1)

    top_50_idx = np.argsort(preds_pass1)[::-1][:50]

    # --- Pass 2: sweep hours 7-21 for top 50 combos ---
    rows_pass2 = []
    for idx in top_50_idx:
        base_row = df_pass1.iloc[idx].to_dict()
        for h in range(7, 22):
            r = {**base_row, "post_hour": h}
            rows_pass2.append(r)

    df_pass2 = pd.DataFrame(rows_pass2)
    X_pass2 = build_model_frame(df_pass2)[FEATURE_COLS]
    preds_pass2 = model.predict(X_pass2)

    # Pick overall top N
    final_top = np.argsort(preds_pass2)[::-1][: req.top_n]

    recommendations = []
    for idx in final_top:
        row_data = df_pass2.iloc[idx]
        pred_value = float(preds_pass2[idx])
        recommendations.append({
            "rank": len(recommendations) + 1,
            "day_of_week": row_data["day_of_week"],
            "post_hour": int(row_data["post_hour"]),
            "post_type": row_data["post_type"],
            "media_type": row_data["media_type"],
            "content_topic": row_data["content_topic"],
            "sentiment_tone": row_data["sentiment_tone"],
            "call_to_action_type": row_data["call_to_action_type"],
            "has_call_to_action": bool(row_data["has_call_to_action"]),
            "features_resident_story": bool(row_data["features_resident_story"]),
            "predicted_value": round(pred_value, 2),
        })

    total_evaluated = len(df_pass1) + len(df_pass2)
    target_label = (
        "predicted_donation_referrals" if req.optimize_for == "referrals"
        else "predicted_estimated_donation_value_php"
    )

    return {
        "platform": req.platform,
        "optimize_for": req.optimize_for,
        "target_label": target_label,
        "total_combinations_evaluated": total_evaluated,
        "top_n": req.top_n,
        "recommendations": recommendations,
        "constraints_applied": {
            "num_hashtags": num_hashtags,
            "mentions_count": mentions_count,
            "caption_length": caption_length,
            "is_boosted": is_boosted,
            "boost_budget_php": boost_budget,
            "has_call_to_action": has_cta,
            "features_resident_story": features_story,
        },
        "disclaimer": (
            "Recommendations are based on patterns in historical data. "
            "Results will improve as real donation data replaces synthetic data."
        ),
    }


@app.post("/predict/weekly-schedule")
def weekly_schedule(req: WeeklyScheduleRequest) -> dict[str, Any]:
    """
    Greedy daily optimization across ALL platforms with diversity constraints.

    Constraints enforced:
      - No back-to-back same platform (yesterday's platform excluded)
      - No repeated content_topic across the week
      - No repeated post_type across the week
    Result: 7 diverse posts across multiple platforms.
    """
    try:
        b = _load_bundle()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    meta = b.get("meta", {})
    field_vals = meta.get("field_values", {})
    model = b["reg_referrals"] if req.optimize_for == "referrals" else b["reg_value"]

    all_platforms = field_vals.get("platform", [
        "Facebook", "Instagram", "LinkedIn", "TikTok", "Twitter", "WhatsApp", "YouTube",
    ])
    platforms = [p for p in req.platforms if p in all_platforms] if req.platforms else all_platforms
    if not platforms:
        platforms = all_platforms
    post_types = field_vals.get("post_type", ["FundraisingAppeal"])
    media_types = field_vals.get("media_type", ["Carousel"])
    content_topics = field_vals.get("content_topic", ["Education"])
    sentiment_tones = field_vals.get("sentiment_tone", ["Hopeful"])
    cta_types = field_vals.get("call_to_action_type", ["DonateNow"])

    num_hashtags = req.num_hashtags if req.num_hashtags is not None else 3
    mentions_count = req.mentions_count if req.mentions_count is not None else 1
    caption_length = req.caption_length if req.caption_length is not None else 280
    is_boosted = req.is_boosted if req.is_boosted is not None else False
    boost_budget = req.boost_budget_php if req.boost_budget_php is not None else 0.0
    has_cta = req.has_call_to_action if req.has_call_to_action is not None else True
    features_story = req.features_resident_story if req.features_resident_story is not None else False

    base_numeric = {
        "num_hashtags": num_hashtags,
        "mentions_count": mentions_count,
        "has_call_to_action": has_cta,
        "features_resident_story": features_story,
        "caption_length": caption_length,
        "is_boosted": is_boosted,
        "boost_budget_php": boost_budget if is_boosted else 0.0,
    }

    days_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    used_topics: set[str] = set()
    used_post_types: set[str] = set()
    prev_platform: str | None = None
    schedule: list[dict[str, Any]] = []
    total_evaluated = 0

    for day in days_order:
        # Diversity: exclude already-used topics and post types (reset if exhausted)
        avail_topics = [t for t in content_topics if t not in used_topics] or content_topics
        avail_ptypes = [p for p in post_types if p not in used_post_types] or post_types

        # No back-to-back: exclude yesterday's platform
        avail_platforms = [p for p in platforms if p != prev_platform] if prev_platform else platforms

        # Build combos: platform × hours × post_type × media × topic × tone × cta
        combos = list(itertools.product(
            avail_platforms, range(7, 22), avail_ptypes, media_types,
            avail_topics, sentiment_tones, cta_types,
        ))

        rows = []
        for plat, hour, pt, mt, ct, st, cta in combos:
            rows.append({
                **base_numeric,
                "platform": plat,
                "day_of_week": day,
                "post_hour": hour,
                "post_type": pt,
                "media_type": mt,
                "content_topic": ct,
                "sentiment_tone": st,
                "call_to_action_type": cta,
            })

        df_day = pd.DataFrame(rows)
        X_day = build_model_frame(df_day)[FEATURE_COLS]
        preds = model.predict(X_day)
        total_evaluated += len(df_day)

        best_idx = int(np.argmax(preds))
        best_row = df_day.iloc[best_idx]
        best_val = float(preds[best_idx])

        chosen_platform = best_row["platform"]
        chosen_topic = best_row["content_topic"]
        chosen_ptype = best_row["post_type"]
        used_topics.add(chosen_topic)
        used_post_types.add(chosen_ptype)
        prev_platform = chosen_platform

        schedule.append({
            "day_of_week": day,
            "platform": chosen_platform,
            "post_hour": int(best_row["post_hour"]),
            "post_type": chosen_ptype,
            "media_type": best_row["media_type"],
            "content_topic": chosen_topic,
            "sentiment_tone": best_row["sentiment_tone"],
            "call_to_action_type": best_row["call_to_action_type"],
            "has_call_to_action": bool(best_row["has_call_to_action"]),
            "features_resident_story": bool(best_row["features_resident_story"]),
            "predicted_value": round(best_val, 2),
        })

    total_predicted = sum(d["predicted_value"] for d in schedule)
    target_label = (
        "predicted_donation_referrals" if req.optimize_for == "referrals"
        else "predicted_estimated_donation_value_php"
    )

    return {
        "optimize_for": req.optimize_for,
        "target_label": target_label,
        "total_combinations_evaluated": total_evaluated,
        "weekly_total_predicted": round(total_predicted, 2),
        "schedule": schedule,
        "constraints_applied": {
            "num_hashtags": num_hashtags,
            "mentions_count": mentions_count,
            "caption_length": caption_length,
            "is_boosted": is_boosted,
            "boost_budget_php": boost_budget,
            "has_call_to_action": has_cta,
            "features_resident_story": features_story,
        },
        "disclaimer": (
            "Each day is optimized across all platforms with diversity constraints — "
            "no back-to-back same platform, no repeated content topics or post types. "
            "Rankings show relative performance; actual values calibrate with real data."
        ),
    }
