from pathlib import Path

import numpy as np
import pandas as pd
import streamlit as st
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import classification_report
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler


def slope(series: pd.Series) -> float:
    vals = series.values
    n = len(vals)
    if n < 2:
        return 0.0
    x = np.arange(n, dtype=float)
    x_mean, y_mean = x.mean(), vals.mean()
    num = ((x - x_mean) * (vals - y_mean)).sum()
    den = ((x - x_mean) ** 2).sum()
    return float(num / den) if den != 0 else 0.0


def risk_tier(prob: float) -> str:
    if prob >= 0.75:
        return "Critical"
    if prob >= 0.50:
        return "High"
    if prob >= 0.25:
        return "Moderate"
    return "Low"


def run_health_deterioration_pipeline(data_dir: Path) -> tuple[pd.DataFrame, str, float]:
    health = pd.read_csv(data_dir / "health_wellbeing_records.csv", parse_dates=["record_date"])
    residents = pd.read_csv(data_dir / "residents.csv")
    incidents = pd.read_csv(data_dir / "incident_reports.csv", parse_dates=["incident_date"])
    plans = pd.read_csv(data_dir / "intervention_plans.csv")

    score_cols = [
        "general_health_score",
        "nutrition_score",
        "sleep_quality_score",
        "energy_level_score",
    ]

    health_sorted = health.sort_values(["resident_id", "record_date"])
    health_features = health_sorted.groupby("resident_id").agg(
        latest_general_health=("general_health_score", "last"),
        latest_nutrition=("nutrition_score", "last"),
        latest_sleep=("sleep_quality_score", "last"),
        latest_energy=("energy_level_score", "last"),
        latest_bmi=("bmi", "last"),
        mean_general_health=("general_health_score", "mean"),
        mean_nutrition=("nutrition_score", "mean"),
        mean_sleep=("sleep_quality_score", "mean"),
        mean_energy=("energy_level_score", "mean"),
        std_general_health=("general_health_score", "std"),
        std_energy=("energy_level_score", "std"),
        n_health_records=("health_record_id", "count"),
        pct_medical_checkup=("medical_checkup_done", "mean"),
        pct_psych_checkup=("psychological_checkup_done", "mean"),
    ).reset_index()

    for col in score_cols:
        slopes = health_sorted.groupby("resident_id")[col].apply(slope).reset_index()
        slopes.columns = ["resident_id", f"slope_{col}"]
        health_features = health_features.merge(slopes, on="resident_id", how="left")

    health_features["composite_latest"] = health_features[
        ["latest_general_health", "latest_nutrition", "latest_sleep", "latest_energy"]
    ].mean(axis=1)
    health_features["composite_slope"] = health_features[
        [
            "slope_general_health_score",
            "slope_nutrition_score",
            "slope_sleep_quality_score",
            "slope_energy_level_score",
        ]
    ].mean(axis=1)

    severity_map = {"Low": 1, "Medium": 2, "High": 3}
    incidents["severity_num"] = incidents["severity"].map(severity_map)
    inc_features = incidents.groupby("resident_id").agg(
        total_incidents=("incident_id", "count"),
        high_severity_incidents=("severity_num", lambda x: (x == 3).sum()),
        mean_severity=("severity_num", "mean"),
        n_selfharm=("incident_type", lambda x: (x == "SelfHarm").sum()),
        n_runaway=("incident_type", lambda x: (x == "RunawayAttempt").sum()),
        n_medical=("incident_type", lambda x: (x == "Medical").sum()),
        pct_unresolved=("resolved", lambda x: (~x).mean()),
        follow_up_needed=("follow_up_required", "sum"),
    ).reset_index()

    plan_features = plans.groupby("resident_id").agg(
        total_plans=("plan_id", "count"),
        n_completed_plans=("status", lambda x: (x == "Completed").sum()),
        n_active_plans=("status", lambda x: (x == "Active").sum()),
    ).reset_index()
    plan_features["plan_completion_rate"] = (
        plan_features["n_completed_plans"] / plan_features["total_plans"].replace(0, np.nan)
    )

    risk_order = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
    vuln_col = (
        "sub_cat_at_risk"
        if "sub_cat_at_risk" in residents.columns
        else residents.columns[residents.columns.str.startswith("sub_cat_")][0]
    )
    res = residents[
        [
            "resident_id",
            "case_category",
            "current_risk_level",
            "initial_risk_level",
            "sub_cat_physical_abuse",
            "sub_cat_sexual_abuse",
            vuln_col,
            "is_pwd",
            "has_special_needs",
            "family_solo_parent",
        ]
    ].copy()
    res.columns = [
        "resident_id",
        "case_category",
        "current_risk_level",
        "initial_risk_level",
        "sub_cat_physical_abuse",
        "sub_cat_sexual_abuse",
        "sub_cat_vulnerable",
        "is_pwd",
        "has_special_needs",
        "family_solo_parent",
    ]
    res["current_risk_num"] = res["current_risk_level"].map(risk_order)
    res["initial_risk_num"] = res["initial_risk_level"].map(risk_order)
    res["risk_escalated"] = (res["current_risk_num"] > res["initial_risk_num"]).astype(int)
    res["case_category_enc"] = LabelEncoder().fit_transform(res["case_category"].fillna("Unknown"))

    df = res.merge(health_features, on="resident_id", how="left")
    df = df.merge(inc_features, on="resident_id", how="left")
    df = df.merge(plan_features, on="resident_id", how="left")

    incident_fill_cols = [
        "total_incidents",
        "high_severity_incidents",
        "mean_severity",
        "n_selfharm",
        "n_runaway",
        "n_medical",
        "pct_unresolved",
        "follow_up_needed",
    ]
    plan_fill_cols = ["total_plans", "n_completed_plans", "n_active_plans", "plan_completion_rate"]
    df[incident_fill_cols] = df[incident_fill_cols].fillna(0)
    df[plan_fill_cols] = df[plan_fill_cols].fillna(0)

    df["deteriorating"] = (
        (df["composite_slope"] < -0.002)
        | (df["composite_latest"] < 2.9)
        | (df["n_selfharm"] >= 1)
        | (df["current_risk_num"] >= 2)
        | (df["risk_escalated"] == 1)
    ).astype(int)

    feature_cols = [
        "composite_latest",
        "composite_slope",
        "latest_general_health",
        "latest_nutrition",
        "latest_sleep",
        "latest_energy",
        "std_general_health",
        "std_energy",
        "latest_bmi",
        "n_health_records",
        "pct_medical_checkup",
        "pct_psych_checkup",
        "slope_general_health_score",
        "slope_nutrition_score",
        "slope_sleep_quality_score",
        "slope_energy_level_score",
        "total_incidents",
        "high_severity_incidents",
        "mean_severity",
        "n_selfharm",
        "n_runaway",
        "n_medical",
        "pct_unresolved",
        "follow_up_needed",
        "plan_completion_rate",
        "n_active_plans",
        "initial_risk_num",
        "case_category_enc",
        "sub_cat_physical_abuse",
        "sub_cat_sexual_abuse",
        "sub_cat_vulnerable",
        "is_pwd",
        "has_special_needs",
    ]

    X = df[feature_cols].copy()
    y = df["deteriorating"]
    for col in X.select_dtypes(include="bool").columns:
        X[col] = X[col].astype(int)

    clf_pipeline = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=200,
                    max_depth=6,
                    min_samples_leaf=2,
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ]
    )
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(clf_pipeline, X, y, cv=cv, scoring="roc_auc")
    clf_pipeline.fit(X, y)

    df["deterioration_prob"] = clf_pipeline.predict_proba(X)[:, 1]
    df["predicted_label"] = clf_pipeline.predict(X)
    df["predicted_risk_tier"] = df["deterioration_prob"].apply(risk_tier)

    report = classification_report(y, df["predicted_label"], target_names=["Stable", "Deteriorating"])
    results = df[
        [
            "resident_id",
            "current_risk_level",
            "case_category",
            "composite_latest",
            "composite_slope",
            "total_incidents",
            "n_selfharm",
            "high_severity_incidents",
            "plan_completion_rate",
            "deterioration_prob",
            "predicted_risk_tier",
        ]
    ].sort_values("deterioration_prob", ascending=False)
    return results, report, float(cv_scores.mean())


st.set_page_config(page_title="Health Deterioration Risk", layout="wide")
st.markdown(
    """
<style>
    .main-title { font-size: 2rem; font-weight: 800; margin-bottom: 0.2rem; }
    .subtitle { color: #4B5563; margin-bottom: 1rem; }
    .tip-box {
        background: linear-gradient(135deg, #ECFDF5 0%, #F8FAFC 100%);
        border: 1px solid #E5E7EB;
        border-left: 6px solid #059669;
        border-radius: 12px;
        padding: 0.9rem 1rem;
        margin: 0.6rem 0 1rem 0;
    }
</style>
""",
    unsafe_allow_html=True,
)

st.markdown('<div class="main-title">Health Deterioration Prediction</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="subtitle">Simple care-priority dashboard for residents most at risk.</div>',
    unsafe_allow_html=True,
)
st.markdown(
    """
<div class="tip-box">
<b>How to use:</b> Set data folder, click <b>Run Prediction</b>, then start from residents with the highest risk score.
</div>
""",
    unsafe_allow_html=True,
)

default_data_dir = Path(__file__).resolve().parent / "lighthouse_csv_v7" / "lighthouse_csv_v7"
data_dir_str = st.text_input("Data folder", value=str(default_data_dir))
top_n = st.slider("Top residents to show", min_value=5, max_value=60, value=10, step=1)

if st.button("Run Prediction"):
    data_dir = Path(data_dir_str)
    if not data_dir.exists():
        st.error(f"Data folder not found: {data_dir}")
        st.stop()

    with st.spinner("Running model..."):
        results, report, cv_auc = run_health_deterioration_pipeline(data_dir=data_dir)

    st.success("Prediction complete.")
    summary = (
        results["predicted_risk_tier"]
        .value_counts()
        .reindex(["Critical", "High", "Moderate", "Low"], fill_value=0)
    )
    critical_count = int(summary.get("Critical", 0))
    high_count = int(summary.get("High", 0))

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Model quality (ROC-AUC)", f"{cv_auc:.3f}")
    col2.metric("Residents scored", f"{len(results):,}")
    col3.metric("Critical risk", f"{critical_count:,}")
    col4.metric("High risk", f"{high_count:,}")

    left, right = st.columns([2, 1])
    with left:
        st.subheader("Risk Level Distribution")
        dist_df = summary.rename_axis("Risk Level").reset_index(name="Residents")
        st.bar_chart(dist_df.set_index("Risk Level"))
    with right:
        st.subheader("Immediate Focus")
        st.write(f"Critical: **{critical_count:,}** residents")
        st.write(f"High: **{high_count:,}** residents")
        st.info("Start outreach with Critical, then High.")

    st.subheader(f"Top {top_n} Highest-Risk Residents")
    display = results.head(top_n).reset_index(drop=True).rename(
        columns={
            "resident_id": "Resident ID",
            "current_risk_level": "Current Risk",
            "case_category": "Case Category",
            "composite_latest": "Latest Health Score",
            "composite_slope": "Health Trend",
            "total_incidents": "Total Incidents",
            "n_selfharm": "Self-Harm Incidents",
            "high_severity_incidents": "High Severity Incidents",
            "plan_completion_rate": "Plan Completion",
            "deterioration_prob": "Risk Score",
            "predicted_risk_tier": "Risk Tier",
        }
    )
    st.dataframe(
        display,
        use_container_width=True,
        height=420,
        column_config={
            "Risk Score": st.column_config.ProgressColumn(
                "Risk Score", min_value=0.0, max_value=1.0, format="%.2f"
            ),
            "Plan Completion": st.column_config.ProgressColumn(
                "Plan Completion", min_value=0.0, max_value=1.0, format="%.2f"
            ),
        },
    )

    st.subheader("Risk Tier Summary")
    summary_table = (
        results["predicted_risk_tier"]
        .value_counts()
        .rename_axis("tier")
        .reset_index(name="count")
        .sort_values("count", ascending=False)
    )
    st.dataframe(summary_table, use_container_width=True, height=220)

    st.subheader("Classification Report (In-Sample)")
    st.code(report)
