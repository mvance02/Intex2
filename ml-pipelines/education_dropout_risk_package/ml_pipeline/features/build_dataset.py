import numpy as np
import pandas as pd

from config import (
    ARTIFACT_DIR,
    NEG_EMOTION,
    POS_EMOTION,
    PREDICTION_CUTOFF_DATE,
    SURROGATE_TARGET,
    TARGET_COLUMN,
)
from data.loaders import load_all_tables


def _risk_to_num(series: pd.Series) -> pd.Series:
    return series.map({"Low": 1, "Medium": 2, "High": 3, "Critical": 4})


def _split_services(x) -> list[str]:
    if pd.isna(x):
        return []
    return [a.strip() for a in str(x).split(",") if a.strip()]


def _education_targets(edu: pd.DataFrame) -> pd.DataFrame:
    edu = edu.sort_values(["resident_id", "record_date"]).copy()

    rows = []
    for rid, g in edu.groupby("resident_id"):
        g = g.sort_values("record_date")
        first = g.iloc[0]
        last = g.iloc[-1]
        pre = g.iloc[:-1] if len(g) > 1 else g

        attendance_change = float(last["attendance_rate"] - first["attendance_rate"])
        progress_change = float(last["progress_percent"] - first["progress_percent"])

        # Proxy dropout risk signal (since explicit dropout label is unavailable):
        # not completed + weak engagement trajectory.
        not_completed = str(last.get("completion_status", "")).strip() != "Completed"
        low_latest_att = float(last["attendance_rate"]) < 0.72
        weak_latest_progress = float(last["progress_percent"]) < 70
        deteriorating = (attendance_change < -0.05) or (progress_change < 10)
        long_track = len(g) >= 6
        target = int(not_completed and ((low_latest_att and weak_latest_progress) or (deteriorating and long_track)))

        rows.append(
            {
                "resident_id": int(rid),
                "edu_record_count": int(len(g)),
                "baseline_attendance": float(first["attendance_rate"]),
                "baseline_progress": float(first["progress_percent"]),
                "pre_last_mean_attendance": float(pre["attendance_rate"].mean()),
                "pre_last_mean_progress": float(pre["progress_percent"].mean()),
                "pre_last_attendance_std": float(pre["attendance_rate"].std(ddof=0)),
                "pre_last_progress_std": float(pre["progress_percent"].std(ddof=0)),
                "latest_completion_status": str(last.get("completion_status", "")),
                "latest_attendance": float(last["attendance_rate"]),
                "latest_progress": float(last["progress_percent"]),
                SURROGATE_TARGET: attendance_change,
                "progress_change": progress_change,
                TARGET_COLUMN: target,
            }
        )
    return pd.DataFrame(rows)


def build_dataset() -> pd.DataFrame:
    cutoff = pd.to_datetime(PREDICTION_CUTOFF_DATE)
    t = load_all_tables()

    residents = t["residents"].copy()
    edu = t["education_records"].copy()
    process = t["process_recordings"].copy()
    plans = t["intervention_plans"].copy()
    visits = t["home_visitations"].copy()
    health = t["health_wellbeing_records"].copy()

    for df, date_col in [
        (edu, "record_date"),
        (process, "session_date"),
        (plans, "created_at"),
        (visits, "visit_date"),
        (health, "record_date"),
    ]:
        if date_col in df.columns:
            df.drop(df[df[date_col] > cutoff].index, inplace=True)

    edu_target = _education_targets(edu)

    residents_feat = residents[[
        "resident_id",
        "safehouse_id",
        "initial_risk_level",
        "current_risk_level",
        "family_is_4ps",
        "has_special_needs",
        "is_pwd",
        "case_category",
    ]].copy()
    residents_feat["initial_risk_num"] = _risk_to_num(residents_feat["initial_risk_level"])
    residents_feat["current_risk_num"] = _risk_to_num(residents_feat["current_risk_level"])
    residents_feat["risk_improvement"] = residents_feat["initial_risk_num"] - residents_feat["current_risk_num"]

    pr = process.copy()
    pr["positive_emotional_shift"] = (
        pr["emotional_state_observed"].isin(NEG_EMOTION)
        & pr["emotional_state_end"].isin(POS_EMOTION)
    ).astype(int)
    pr_agg = pr.groupby("resident_id").agg(
        process_session_count=("recording_id", "count"),
        avg_session_duration=("session_duration_minutes", "mean"),
        referral_rate=("referral_made", "mean"),
        concerns_rate=("concerns_flagged", "mean"),
        positive_shift_rate=("positive_emotional_shift", "mean"),
    ).reset_index()

    pl = plans.copy()
    pl["is_education_plan"] = pl["plan_category"].eq("Education").astype(int)
    pl["service_count"] = pl["services_provided"].apply(lambda x: len(_split_services(x)))
    pl_agg = pl.groupby("resident_id").agg(
        plan_count=("plan_id", "count"),
        education_plan_count=("is_education_plan", "sum"),
        avg_services_per_plan=("service_count", "mean"),
        education_plan_achieved=("status", lambda s: int(((pl.loc[s.index, "is_education_plan"] == 1) & (s == "Achieved")).sum())),
    ).reset_index()

    hv = visits.groupby("resident_id").agg(
        home_visit_count=("visitation_id", "count"),
        visit_followup_rate=("follow_up_needed", "mean"),
        visit_safety_concern_rate=("safety_concerns_noted", "mean"),
    ).reset_index()

    hl = health.sort_values(["resident_id", "record_date"]).groupby("resident_id").agg(
        avg_health_score=("general_health_score", "mean"),
        health_score_change=("general_health_score", lambda s: float(s.iloc[-1] - s.iloc[0]) if len(s) > 1 else 0.0),
    ).reset_index()

    df = edu_target.merge(residents_feat, on="resident_id", how="left")
    for agg in [pr_agg, pl_agg, hv, hl]:
        df = df.merge(agg, on="resident_id", how="left")

    # Drop direct target proxies from model matrix.
    drop_cols = ["latest_completion_status", "latest_attendance", "latest_progress", "progress_change"]
    for c in drop_cols:
        if c in df.columns:
            df.drop(columns=[c], inplace=True)

    # Convert bool to int and clean infinite values.
    for c in df.select_dtypes(include=["bool"]).columns:
        df[c] = df[c].astype(int)
    for c in df.select_dtypes(include=[np.number]).columns:
        df[c] = df[c].replace([np.inf, -np.inf], np.nan)

    return df


def main() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    df = build_dataset()
    out = ARTIFACT_DIR / "train_dataset.csv"
    df.to_csv(out, index=False)
    print(f"Saved dataset: {out}")
    print(f"Shape: {df.shape}")
    print(df[TARGET_COLUMN].value_counts(dropna=False))


if __name__ == "__main__":
    main()
