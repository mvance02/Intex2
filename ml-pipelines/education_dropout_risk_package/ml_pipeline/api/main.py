from pathlib import Path
import json

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse

from config import ARTIFACT_DIR, DATA_DIR, SURROGATE_TARGET, TARGET_COLUMN

app = FastAPI(title="Education Dropout Risk API", version="0.3.0")

LEAKAGE = {TARGET_COLUMN, SURROGATE_TARGET, "resident_id"}
_model = None
_train_df = None
_train_X = None
_residents_meta = None
_importance = None


def _load_train_df() -> pd.DataFrame:
    global _train_df
    if _train_df is None:
        p = ARTIFACT_DIR / "train_dataset.csv"
        if not p.exists():
            raise FileNotFoundError("Run python run_all.py first (missing train_dataset.csv)")
        _train_df = pd.read_csv(p)
    return _train_df


def _load_residents_meta() -> pd.DataFrame:
    global _residents_meta
    if _residents_meta is None:
        p = DATA_DIR / "residents.csv"
        if not p.exists():
            _residents_meta = pd.DataFrame(columns=["resident_id"])
        else:
            r = pd.read_csv(p)
            keep = [
                c
                for c in ["resident_id", "internal_code", "case_control_no", "safehouse_id", "assigned_social_worker"]
                if c in r.columns
            ]
            _residents_meta = r[keep].copy()
    return _residents_meta


def _build_feature_matrix(df: pd.DataFrame) -> pd.DataFrame:
    feats = [c for c in df.columns if c not in LEAKAGE]
    X = pd.get_dummies(df[feats], drop_first=True)
    X = X.apply(pd.to_numeric, errors="coerce")
    return X


def _load_train_X() -> pd.DataFrame:
    global _train_X
    if _train_X is None:
        _train_X = _build_feature_matrix(_load_train_df())
    return _train_X


def _load_model():
    global _model
    if _model is None:
        p = ARTIFACT_DIR / "predictive_dropout_model.joblib"
        if not p.exists():
            raise FileNotFoundError("Run python run_all.py first (missing predictive_dropout_model.joblib)")
        _model = joblib.load(p)
    return _model


def _load_importance() -> pd.DataFrame:
    global _importance
    if _importance is None:
        p = ARTIFACT_DIR / "predictive_dropout_importance.csv"
        if not p.exists():
            raise FileNotFoundError("Run python run_all.py first (missing predictive_dropout_importance.csv)")
        _importance = pd.read_csv(p)
    return _importance


def _risk_label(p: float) -> str:
    if p >= 0.65:
        return "High"
    if p >= 0.35:
        return "Moderate"
    return "Low"


def _girl_label(meta_row: pd.Series, resident_id: int) -> str:
    if meta_row is None:
        return f"Girl {resident_id}"
    internal = str(meta_row.get("internal_code", "")).strip()
    case_no = str(meta_row.get("case_control_no", "")).strip()
    parts = [f"Girl {resident_id}"]
    if internal:
        parts.append(internal)
    if case_no:
        parts.append(case_no)
    return " | ".join(parts)


def _plain_feature_name(feat: str) -> str:
    mapping = {
        "baseline_attendance": "baseline attendance",
        "pre_last_mean_attendance": "recent average attendance (before last record)",
        "pre_last_attendance_std": "attendance volatility",
        "baseline_progress": "baseline education progress",
        "pre_last_mean_progress": "recent average progress",
        "process_session_count": "support session count",
        "avg_session_duration": "average session duration",
        "referral_rate": "referral rate from sessions",
        "concerns_rate": "rate of concerns flagged in sessions",
        "positive_shift_rate": "positive emotional shift rate",
        "education_plan_count": "education plan count",
        "education_plan_achieved": "education plans achieved",
        "avg_services_per_plan": "average services per plan",
        "home_visit_count": "home visit count",
        "visit_followup_rate": "visit follow-up rate",
        "visit_safety_concern_rate": "visit safety concern rate",
        "avg_health_score": "average health score",
        "health_score_change": "health score change",
        "risk_improvement": "risk improvement",
        "initial_risk_num": "initial risk level",
        "current_risk_num": "current risk level",
        "edu_record_count": "education record count",
        "family_is_4ps": "4Ps family flag",
        "has_special_needs": "special needs flag",
        "is_pwd": "PWD flag",
    }
    return mapping.get(feat, feat.replace("_", " "))


def _direction_hint(feat: str) -> str:
    # Heuristic direction text for plain-language explanation.
    protective = {
        "baseline_attendance",
        "pre_last_mean_attendance",
        "baseline_progress",
        "pre_last_mean_progress",
        "positive_shift_rate",
        "education_plan_achieved",
        "avg_health_score",
        "health_score_change",
        "risk_improvement",
    }
    riskier = {
        "pre_last_attendance_std",
        "concerns_rate",
        "visit_safety_concern_rate",
        "visit_followup_rate",
        "initial_risk_num",
        "current_risk_num",
    }
    if feat in protective:
        return "Higher values are usually linked with lower dropout risk in this model."
    if feat in riskier:
        return "Higher values are usually linked with higher dropout risk in this model."
    return "This factor is one of the stronger signals used by the model."


@app.get("/")
def dashboard():
    return FileResponse(Path(__file__).resolve().parent / "dashboard.html")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/girls")
def girls():
    df = _load_train_df()
    meta = _load_residents_meta()
    meta_map = {int(r["resident_id"]): r for _, r in meta.iterrows()} if not meta.empty else {}

    rows = []
    for rid in sorted(df["resident_id"].dropna().astype(int).unique().tolist()):
        m = meta_map.get(rid)
        rows.append(
            {
                "resident_id": rid,
                "label": _girl_label(m, rid),
                "internal_code": None if m is None else (str(m.get("internal_code", "")).strip() or None),
                "case_control_no": None if m is None else (str(m.get("case_control_no", "")).strip() or None),
            }
        )
    return {"count": len(rows), "girls": rows}


@app.get("/predict/resident/{resident_id}")
def predict_resident(resident_id: int):
    df = _load_train_df()
    row = df[df["resident_id"] == resident_id]
    if row.empty:
        raise HTTPException(404, f"Resident {resident_id} not found")

    X_all = _load_train_X()
    X_row = X_all.loc[row.index]
    model = _load_model()

    p = float(model.predict_proba(X_row)[:, 1][0])

    meta = _load_residents_meta()
    mrow = None
    if not meta.empty:
        mm = meta[meta["resident_id"] == resident_id]
        if not mm.empty:
            mrow = mm.iloc[0]

    payload = {
        "resident_id": resident_id,
        "label": _girl_label(mrow, resident_id),
        "internal_code": None if mrow is None else (str(mrow.get("internal_code", "")).strip() or None),
        "case_control_no": None if mrow is None else (str(mrow.get("case_control_no", "")).strip() or None),
        "dropout_risk_probability": p,
        "risk_level": _risk_label(p),
        "safehouse_id": int(row.iloc[0]["safehouse_id"]) if pd.notna(row.iloc[0].get("safehouse_id")) else None,
        "baseline_attendance": float(row.iloc[0]["baseline_attendance"]),
        "pre_last_mean_attendance": float(row.iloc[0]["pre_last_mean_attendance"]),
        "edu_record_count": int(row.iloc[0]["edu_record_count"]),
    }
    return JSONResponse(payload)


@app.get("/explain/resident/{resident_id}")
def explain_resident(resident_id: int):
    """
    Heuristic local explanation:
    combines global feature importance with this resident's distance from population median.
    """
    df = _load_train_df()
    row = df[df["resident_id"] == resident_id]
    if row.empty:
        raise HTTPException(404, f"Resident {resident_id} not found")

    imp = _load_importance()
    num = df.select_dtypes(include=["number"]).copy()
    excluded = {TARGET_COLUMN, SURROGATE_TARGET, "resident_id"}
    candidates = [c for c in num.columns if c not in excluded]

    if not candidates:
        return {"resident_id": resident_id, "drivers": []}

    med = num[candidates].median(numeric_only=True)
    std = num[candidates].std(numeric_only=True).replace(0, 1.0).fillna(1.0)
    r = row.iloc[0]

    imp_map = {str(k): float(v) for k, v in zip(imp["feature"], imp["importance"])}
    scored = []
    for f in candidates:
        if f not in r.index:
            continue
        rv = r[f]
        if pd.isna(rv):
            continue
        z = float((rv - med.get(f, rv)) / std.get(f, 1.0))
        score = abs(z) * imp_map.get(f, 0.0)
        scored.append((f, score, float(rv), float(med.get(f, rv))))

    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:3]
    drivers = []
    for f, s, v, m in top:
        rel = "above" if v > m else "below" if v < m else "near"
        drivers.append(
            {
                "feature": f,
                "label": _plain_feature_name(f),
                "resident_value": v,
                "group_median": m,
                "relative_to_group": rel,
                "model_weight": imp_map.get(f, 0.0),
                "why_it_matters": _direction_hint(f),
            }
        )
    return {"resident_id": resident_id, "drivers": drivers, "note": "Heuristic explanation based on model importance and distance from group median."}


@app.get("/summary")
def summary():
    p = ARTIFACT_DIR / "predictive_dropout_metrics.json"
    if not p.exists():
        raise HTTPException(404, "Run python run_all.py first")
    return json.loads(p.read_text())
