import argparse
import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score


_SCRIPTS_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _SCRIPTS_DIR.parent

DATA_DIR_DEFAULT = str(_REPO_ROOT / "data")
OUT_DIR_DEFAULT = str(_REPO_ROOT / "outputs" / "first_visit_personalizer")


def build_training_frame(data_dir: str) -> pd.DataFrame:
	supporters = pd.read_csv(f"{data_dir}/supporters.csv")
	donations = pd.read_csv(f"{data_dir}/donations.csv")
	alloc = pd.read_csv(f"{data_dir}/donation_allocations.csv")

	# Keep monetary signals for ask sizing
	monetary = donations[donations["amount"].notna()].copy()
	monetary["amount"] = pd.to_numeric(monetary["amount"], errors="coerce")
	monetary = monetary[monetary["amount"].notna()]

	# Cause preference from allocation history (top program_area by allocated amount)
	d_alloc = alloc.merge(
		donations[["donation_id", "supporter_id"]],
		on="donation_id",
		how="left"
	)
	cause_pref = (
		d_alloc.groupby(["supporter_id", "program_area"], as_index=False)["amount_allocated"]
		.sum()
		.sort_values(["supporter_id", "amount_allocated"], ascending=[True, False])
	)
	cause_pref = cause_pref.drop_duplicates(subset=["supporter_id"], keep="first")
	cause_pref = cause_pref.rename(columns={"program_area": "target_cause"})

	# Ask bucket target based on each supporter's typical amount
	amount_stats = monetary.groupby("supporter_id", as_index=False).agg(
		avg_amount=("amount", "mean"),
		donation_count=("donation_id", "count"),
	)
	amount_stats["target_ask_bucket"] = pd.cut(
		amount_stats["avg_amount"],
		bins=[-np.inf, 300, 900, np.inf],
		labels=["low_ask", "mid_ask", "high_ask"]
	).astype(str)

	# Features available at first touch (or early profile)
	base_cols = [
		"supporter_id", "supporter_type", "relationship_type", "region", "country",
		"acquisition_channel", "status"
	]
	frame = supporters[base_cols].copy()
	frame = frame.merge(cause_pref[["supporter_id", "target_cause"]], on="supporter_id", how="left")
	frame = frame.merge(amount_stats[["supporter_id", "target_ask_bucket", "avg_amount"]], on="supporter_id", how="left")

	# Keep rows with at least one target for training
	frame = frame[(frame["target_cause"].notna()) | (frame["target_ask_bucket"].notna())].copy()
	frame["target_cause"] = frame["target_cause"].fillna("unknown")
	frame["target_ask_bucket"] = frame["target_ask_bucket"].fillna("mid_ask")
	return frame


def make_model(feature_cols):
	cat_features = feature_cols
	prep = ColumnTransformer(
		[
			(
				"cat",
				Pipeline(
					steps=[
						("imputer", SimpleImputer(strategy="most_frequent")),
						("onehot", OneHotEncoder(handle_unknown="ignore"))
					]
				),
				cat_features
			)
		],
		remainder="drop"
	)
	model = RandomForestClassifier(
		n_estimators=350,
		min_samples_leaf=5,
		random_state=42,
		n_jobs=-1
	)
	return Pipeline(steps=[("prep", prep), ("clf", model)])


def personalize_message(pred_cause: str, pred_ask: str, acquisition_channel: str, region: str):
	cause_text = pred_cause if pred_cause and pred_cause != "unknown" else "our programs"
	if pred_ask == "high_ask":
		ask_text = "Try a starter gift around PHP 1,000+"
	elif pred_ask == "mid_ask":
		ask_text = "Try a starter gift around PHP 500-900"
	else:
		ask_text = "Try a starter gift around PHP 100-300"

	channel_note = f"People joining via {acquisition_channel} often engage with impact stories." if acquisition_channel else "Many first-time visitors respond to short impact updates."
	region_note = f"We can highlight outcomes from {region} to keep this relevant." if region else "We can show local impact examples."

	suggestion = f"Show {cause_text} story first, then CTA: {ask_text}."
	why = f"Predicted from first-visit profile signals (channel, region, supporter type). {channel_note} {region_note}"
	return suggestion, why


def main():
	parser = argparse.ArgumentParser(description="Train first-visit personalizer using existing donor data")
	parser.add_argument("--data_dir", default=DATA_DIR_DEFAULT, type=str)
	parser.add_argument("--out_dir", default=OUT_DIR_DEFAULT, type=str)
	args = parser.parse_args()

	out_dir = Path(args.out_dir)
	out_dir.mkdir(parents=True, exist_ok=True)

	df = build_training_frame(args.data_dir)
	feature_cols = ["supporter_type", "relationship_type", "region", "country", "acquisition_channel", "status"]
	X = df[feature_cols]

	# Model 1: predict likely cause interest
	y_cause = df["target_cause"]
	cause_counts = y_cause.value_counts(dropna=False)
	cause_stratify = y_cause if int(cause_counts.min()) >= 2 else None
	X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
		X, y_cause, test_size=0.25, random_state=42, stratify=cause_stratify
	)
	cause_model = make_model(feature_cols)
	cause_model.fit(X_train_c, y_train_c)
	cause_pred = cause_model.predict(X_test_c)

	# Model 2: predict starter ask bucket
	y_ask = df["target_ask_bucket"]
	ask_counts = y_ask.value_counts(dropna=False)
	ask_stratify = y_ask if int(ask_counts.min()) >= 2 else None
	X_train_a, X_test_a, y_train_a, y_test_a = train_test_split(
		X, y_ask, test_size=0.25, random_state=42, stratify=ask_stratify
	)
	ask_model = make_model(feature_cols)
	ask_model.fit(X_train_a, y_train_a)
	ask_pred = ask_model.predict(X_test_a)

	# Save models
	joblib.dump(cause_model, out_dir / "first_visit_cause_model.joblib")
	joblib.dump(ask_model, out_dir / "first_visit_ask_model.joblib")

	# Create preview predictions across known supporters (as first-visit profile simulation)
	all_pred_cause = cause_model.predict(X)
	all_pred_ask = ask_model.predict(X)
	preview = df[["supporter_id"] + feature_cols].copy()
	preview["predicted_cause"] = all_pred_cause
	preview["predicted_ask_bucket"] = all_pred_ask
	messages = preview.apply(
		lambda r: personalize_message(
			r["predicted_cause"],
			r["predicted_ask_bucket"],
			r.get("acquisition_channel"),
			r.get("region"),
		),
		axis=1
	)
	preview["suggested_experience"] = [m[0] for m in messages]
	preview["why_explanation"] = [m[1] for m in messages]
	preview.to_parquet(out_dir / "first_visit_predictions.parquet", index=False)

	metrics = {
		"cause_accuracy": accuracy_score(y_test_c, cause_pred),
		"ask_bucket_accuracy": accuracy_score(y_test_a, ask_pred),
		"cause_report": classification_report(y_test_c, cause_pred, output_dict=True),
		"ask_bucket_report": classification_report(y_test_a, ask_pred, output_dict=True),
		"feature_columns": feature_cols
	}
	with open(out_dir / "metrics.json", "w", encoding="utf-8") as f:
		json.dump(metrics, f, indent=2)

	print(f"Saved models + predictions to: {out_dir}")


if __name__ == "__main__":
	main()

