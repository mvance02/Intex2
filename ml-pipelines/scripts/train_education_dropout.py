import argparse
import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, recall_score
from sklearn.model_selection import train_test_split


DATA_DIR_DEFAULT = "C:/Users/Lukeb/OneDrive/Desktop/Pipelines/lighthouse_csv_v7/lighthouse_csv_v7"
OUT_DIR_DEFAULT = "C:/Users/Lukeb/OneDrive/Desktop/Pipelines/outputs/education_dropout"


def load_tables(data_dir: str):
	education = pd.read_csv(f"{data_dir}/education_records.csv")
	residents = pd.read_csv(f"{data_dir}/residents.csv")
	visits = pd.read_csv(f"{data_dir}/home_visitations.csv")
	incidents = pd.read_csv(f"{data_dir}/incident_reports.csv")
	return education, residents, visits, incidents


def build_dataset(education: pd.DataFrame, residents: pd.DataFrame, visits: pd.DataFrame, incidents: pd.DataFrame):
	education["record_date"] = pd.to_datetime(education["record_date"], errors="coerce")
	visits["visit_date"] = pd.to_datetime(visits["visit_date"], errors="coerce")
	incidents["incident_date"] = pd.to_datetime(incidents["incident_date"], errors="coerce")

	# Most recent education snapshot per resident
	last_edu = education.sort_values("record_date").groupby("resident_id", as_index=False).tail(1)

	# Trend features from last 3 education records
	edu_sorted = education.sort_values(["resident_id", "record_date"])
	last3 = edu_sorted.groupby("resident_id", as_index=False).tail(3)
	edu_agg = last3.groupby("resident_id", as_index=False).agg(
		attendance_recent_mean=("attendance_rate", "mean"),
		progress_recent_mean=("progress_percent", "mean"),
		attendance_recent_min=("attendance_rate", "min"),
		progress_recent_min=("progress_percent", "min"),
		num_edu_records_recent=("education_record_id", "count"),
	)

	# Dropout target proxy
	# Dataset may not include explicit dropout statuses, so build a risk-event proxy:
	# high risk if attendance/progress collapse or educational status suggests disengagement.
	disengaged_statuses = {"DroppedOut", "Inactive", "Withdrawn", "NotEnrolled"}
	last_edu["dropout_label"] = (
		(last_edu["enrollment_status"].isin(disengaged_statuses)) |
		(pd.to_numeric(last_edu["attendance_rate"], errors="coerce").fillna(1.0) < 0.55) |
		(pd.to_numeric(last_edu["progress_percent"], errors="coerce").fillna(100.0) < 35.0)
	).astype(int)

	# Visitation features in last 180 days from each resident's latest education date
	ref_dates = last_edu[["resident_id", "record_date"]].rename(columns={"record_date": "ref_date"})
	v = visits.merge(ref_dates, on="resident_id", how="inner")
	v["days_from_ref"] = (v["ref_date"] - v["visit_date"]).dt.days
	v_recent = v[(v["days_from_ref"] >= 0) & (v["days_from_ref"] <= 180)]
	visit_agg = v_recent.groupby("resident_id", as_index=False).agg(
		visits_180d=("visitation_id", "count"),
		uncooperative_visits_180d=("family_cooperation_level", lambda s: int((s == "Uncooperative").sum())),
		safety_concerns_180d=("safety_concerns_noted", lambda s: int(pd.Series(s).fillna(False).astype(bool).sum())),
	)

	# Incident features in last 180 days
	inc = incidents.merge(ref_dates, on="resident_id", how="inner")
	inc["days_from_ref"] = (inc["ref_date"] - inc["incident_date"]).dt.days
	inc_recent = inc[(inc["days_from_ref"] >= 0) & (inc["days_from_ref"] <= 180)]
	inc_agg = inc_recent.groupby("resident_id", as_index=False).agg(
		incidents_180d=("incident_id", "count"),
		high_severity_incidents_180d=("severity", lambda s: int((s == "High").sum())),
		unresolved_incidents_180d=("resolved", lambda s: int((~pd.Series(s).fillna(False).astype(bool)).sum())),
	)

	# Resident profile features
	res_cols = [
		"resident_id", "case_status", "sex", "case_category", "reintegration_status",
		"initial_risk_level", "current_risk_level", "present_age", "length_of_stay", "referral_source",
		"is_pwd", "has_special_needs", "family_is_4ps"
	]
	resident_base = residents[[c for c in res_cols if c in residents.columns]].copy()

	# Assemble model frame
	df = last_edu.merge(edu_agg, on="resident_id", how="left")
	df = df.merge(resident_base, on="resident_id", how="left")
	df = df.merge(visit_agg, on="resident_id", how="left")
	df = df.merge(inc_agg, on="resident_id", how="left")

	# Fold incident burden into proxy label
	df["dropout_label"] = (
		df["dropout_label"].astype(bool) |
		(pd.to_numeric(df.get("high_severity_incidents_180d", 0), errors="coerce").fillna(0) >= 1) |
		(pd.to_numeric(df.get("unresolved_incidents_180d", 0), errors="coerce").fillna(0) >= 2)
	).astype(int)

	# Fill numeric missing
	for c in [
		"attendance_recent_mean", "progress_recent_mean", "attendance_recent_min", "progress_recent_min",
		"num_edu_records_recent", "visits_180d", "uncooperative_visits_180d", "safety_concerns_180d",
		"incidents_180d", "high_severity_incidents_180d", "unresolved_incidents_180d"
	]:
		if c in df.columns:
			df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)

	feature_cols = [
		"education_level", "completion_status", "attendance_rate", "progress_percent",
		"attendance_recent_mean", "progress_recent_mean", "attendance_recent_min", "progress_recent_min",
		"num_edu_records_recent", "case_status", "sex", "case_category", "reintegration_status",
		"initial_risk_level", "current_risk_level", "present_age", "length_of_stay", "referral_source",
		"is_pwd", "has_special_needs", "family_is_4ps", "visits_180d", "uncooperative_visits_180d",
		"safety_concerns_180d", "incidents_180d", "high_severity_incidents_180d", "unresolved_incidents_180d"
	]
	feature_cols = [c for c in feature_cols if c in df.columns]

	X = df[feature_cols].copy()
	y = df["dropout_label"].astype(int)
	meta = df[["resident_id", "record_date", "enrollment_status"]].copy()
	return X, y, meta


def build_preprocessor(X: pd.DataFrame):
	numeric_cols = X.select_dtypes(include=[np.number, "float", "int", "bool"]).columns.tolist()
	cat_cols = [c for c in X.columns if c not in numeric_cols]
	prep = ColumnTransformer(
		[
			("num", SimpleImputer(strategy="median"), numeric_cols),
			("cat", Pipeline(steps=[
				("imputer", SimpleImputer(strategy="most_frequent")),
				("ohe", OneHotEncoder(handle_unknown="ignore"))
			]), cat_cols),
		],
		remainder="drop"
	)
	return prep


def pick_model(X_train, y_train, X_test, y_test):
	prep = build_preprocessor(X_train)
	candidates = {
		"log_reg": LogisticRegression(max_iter=300, class_weight="balanced", solver="liblinear"),
		"random_forest": RandomForestClassifier(n_estimators=350, min_samples_leaf=4, class_weight="balanced", random_state=42, n_jobs=-1)
	}
	best_name = None
	best_pipe = None
	best_tuple = (-1.0, -1.0)  # recall, auc
	report = []
	for name, clf in candidates.items():
		pipe = Pipeline([("prep", prep), ("clf", clf)])
		pipe.fit(X_train, y_train)
		p = pipe.predict_proba(X_test)[:, 1]
		yhat = (p >= 0.5).astype(int)
		rec = recall_score(y_test, yhat, zero_division=0)
		try:
			auc = roc_auc_score(y_test, p)
		except ValueError:
			auc = 0.5
		report.append({"model": name, "recall": float(rec), "roc_auc": float(auc)})
		if (rec, auc) > best_tuple:
			best_tuple = (rec, auc)
			best_name = name
			best_pipe = pipe
	return best_name, best_pipe, report


def explain_row(r: pd.Series) -> str:
	reasons = []
	if float(r.get("attendance_rate", 1.0)) < 0.70:
		reasons.append("low current attendance")
	if float(r.get("progress_percent", 100.0)) < 50:
		reasons.append("slow academic progress")
	if float(r.get("uncooperative_visits_180d", 0)) >= 2:
		reasons.append("repeated uncooperative home visits")
	if float(r.get("unresolved_incidents_180d", 0)) >= 1:
		reasons.append("recent unresolved incident")
	if float(r.get("high_severity_incidents_180d", 0)) >= 1:
		reasons.append("high-severity incident history")
	if not reasons:
		return "risk pattern detected from combined profile and trend features"
	return ", ".join(reasons)


def action_for_row(r: pd.Series) -> str:
	if float(r.get("attendance_rate", 1.0)) < 0.70:
		return "Attendance intervention plan + weekly mentor check-ins"
	if float(r.get("progress_percent", 100.0)) < 50:
		return "Academic support tutoring + individualized learning goals"
	if float(r.get("unresolved_incidents_180d", 0)) >= 1:
		return "Immediate psychosocial follow-up + case conference"
	return "Standard retention support and monthly progress review"


def main():
	parser = argparse.ArgumentParser(description="Train education dropout risk pipeline")
	parser.add_argument("--data_dir", type=str, default=DATA_DIR_DEFAULT)
	parser.add_argument("--out_dir", type=str, default=OUT_DIR_DEFAULT)
	args = parser.parse_args()

	out_dir = Path(args.out_dir)
	out_dir.mkdir(parents=True, exist_ok=True)

	education, residents, visits, incidents = load_tables(args.data_dir)
	X, y, meta = build_dataset(education, residents, visits, incidents)

	if y.nunique() < 2:
		raise ValueError("Dropout label has only one class in current data; cannot train classifier.")

	X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
	best_name, model, eval_report = pick_model(X_train, y_train, X_test, y_test)

	model_path = out_dir / f"education_dropout_{best_name}.joblib"
	joblib.dump(model, model_path)

	# Score all residents
	risk = model.predict_proba(X)[:, 1]
	scores = meta.copy()
	scores["dropout_risk"] = risk
	scores["dropout_label"] = y.values
	thr = scores["dropout_risk"].quantile(0.80)
	scores["at_risk_top20"] = (scores["dropout_risk"] >= thr).astype(int)

	aux = X.copy()
	aux["risk_reason"] = aux.apply(explain_row, axis=1)
	aux["suggested_action"] = aux.apply(action_for_row, axis=1)
	scores["risk_reason"] = aux["risk_reason"].values
	scores["suggested_action"] = aux["suggested_action"].values

	scores_path = out_dir / "education_dropout_scores.parquet"
	scores.to_parquet(scores_path, index=False)

	metrics = {"selected_model": best_name, "evaluation": eval_report}
	with open(out_dir / "metrics.json", "w", encoding="utf-8") as f:
		json.dump(metrics, f, indent=2)

	print(f"Saved model: {model_path}")
	print(f"Saved scores: {scores_path}")


if __name__ == "__main__":
	main()

