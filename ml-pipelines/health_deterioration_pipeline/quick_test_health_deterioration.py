import argparse
from pathlib import Path

import numpy as np
import pandas as pd
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


def run_quick_test(data_dir: Path, top_n: int) -> None:
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
    res["risk_improved"] = (res["current_risk_num"] < res["initial_risk_num"]).astype(int)
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

    print(f"Rows loaded: health={len(health)}, residents={len(residents)}, incidents={len(incidents)}, plans={len(plans)}")
    print(f"Cross-validated ROC-AUC: {cv_scores.mean():.3f} +/- {cv_scores.std():.3f}")
    print("\nClassification report (in-sample):")
    print(classification_report(y, df["predicted_label"], target_names=["Stable", "Deteriorating"]))
    print(f"\nTop {top_n} residents by predicted deterioration risk:")
    print(results.head(top_n).to_string(index=False))


def main() -> None:
    parser = argparse.ArgumentParser(description="Quick test runner for health deterioration prediction.")
    parser.add_argument(
        "--data-dir",
        default="../lighthouse_csv_v7/lighthouse_csv_v7",
        help="Directory containing CSV input files.",
    )
    parser.add_argument("--top-n", type=int, default=10, help="Number of top-risk residents to print.")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        raise FileNotFoundError(f"Data directory not found: {data_dir.resolve()}")

    run_quick_test(data_dir=data_dir, top_n=args.top_n)


if __name__ == "__main__":
    main()
