import argparse
import os
import json
import math
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
import sys

# Ensure project root is importable
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.feature_engineering import load_raw_data, build_features, apply_log_transforms
from src.modeling import build_preprocessor, fit_best_model, permutation_feature_importance
from src.eda import univariate_summary, bivariate_analysis
from sklearn.model_selection import train_test_split


def _default(path_fragment: str) -> str:
    """Resolve a path relative to the project root so defaults are portable."""
    return str(PROJECT_ROOT / path_fragment)


def parse_args():
    parser = argparse.ArgumentParser(description="Train donor churn model")
    parser.add_argument(
        "--data_dir", type=str,
        default=_default("data"),
        help="Directory containing donations.csv, supporters.csv, donation_allocations.csv, social_media_posts.csv",
    )
    parser.add_argument(
        "--out_dir", type=str,
        default=_default("outputs/donor_retention"),
        help="Directory to save models and outputs",
    )
    parser.add_argument("--churn_window_days", type=int, default=180)
    parser.add_argument("--prioritize", type=str, choices=["recall", "roc_auc"], default="recall")
    parser.add_argument("--test_size", type=float, default=0.2, help="Fraction of data held out for honest test evaluation (Ch. 11/15)")
    parser.add_argument("--tune", action=argparse.BooleanOptionalAction, default=True, help="Run RandomizedSearchCV tuning (Ch. 15)")
    parser.add_argument("--skew_threshold", type=float, default=1.0, help="Skewness threshold for log1p transforms (Ch. 7)")
    return parser.parse_args()


def _safe_json(obj):
    """Replace NaN/Inf with None so json.dump produces valid JSON."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: _safe_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_safe_json(v) for v in obj]
    return obj


def main():
    args = parse_args()
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # ── Load ──────────────────────────────────────────────────────────────────
    donations, supporters, donation_allocations, social_posts = load_raw_data(args.data_dir)

    # ── Feature engineering ───────────────────────────────────────────────────
    X, y, meta = build_features(
        donations=donations,
        supporters=supporters,
        donation_allocations=donation_allocations,
        social_posts=social_posts,
        churn_window_days=args.churn_window_days,
    )

    # ── Ch. 6: Univariate EDA (before any transforms, on full feature matrix) ─
    eda_df = univariate_summary(X)
    eda_path = out_dir / "eda_univariate_summary.csv"
    eda_df.to_csv(eda_path, index=False)
    print(f"Saved EDA univariate summary → {eda_path}")
    print(eda_df.to_string(index=False))

    # ── Ch. 11/15: Stratified train/test split ────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, stratify=y, random_state=42
    )
    print(f"\nTrain: {len(X_train)} rows | Test: {len(X_test)} rows | Churn rate train: {y_train.mean():.3f}")

    # ── Ch. 8: Bivariate analysis (fit on train set only) ─────────────────────
    biv_df = bivariate_analysis(X_train, y_train)
    biv_path = out_dir / "eda_bivariate_analysis.csv"
    biv_df.to_csv(biv_path, index=False)
    print(f"\nSaved bivariate analysis → {biv_path}")
    print(biv_df.to_string(index=False))

    # ── Ch. 7: Log1p-transform skewed numeric features ────────────────────────
    X_train, transformed_cols = apply_log_transforms(X_train, skew_threshold=args.skew_threshold)
    if transformed_cols:
        X_test = X_test.copy()
        X_test[transformed_cols] = np.log1p(X_test[transformed_cols])
        print(f"\nLog1p-transformed columns (skew > {args.skew_threshold}): {transformed_cols}")
    else:
        print(f"\nNo columns exceeded skew threshold {args.skew_threshold}; no log transforms applied.")

    # ── Preprocessor ──────────────────────────────────────────────────────────
    prep, _, _ = build_preprocessor(X_train)

    # ── Ch. 13: Class imbalance weight for XGBoost ────────────────────────────
    neg = int((y_train == 0).sum())
    pos = int((y_train == 1).sum())
    pos_weight = neg / pos if pos > 0 else 1.0
    print(f"\nClass counts — negative: {neg}, positive: {pos}, XGBoost pos_weight: {pos_weight:.2f}")

    # ── Ch. 15: Model selection + tuning + evaluation ─────────────────────────
    best_name, pipe, test_metrics, eval_df, tune_info = fit_best_model(
        X_train=X_train,
        y_train=y_train,
        preprocessor=prep,
        X_test=X_test,
        y_test=y_test,
        prioritize=args.prioritize,
        tune=args.tune,
        pos_weight=pos_weight,
    )
    print(f"\nBest model: {best_name}")
    print(f"CV results:\n{eval_df.to_string(index=False)}")
    print(f"\nHeld-out test metrics: {test_metrics}")
    if tune_info:
        print(f"Tuning result: {tune_info}")

    # ── Ch. 16: Permutation feature importance ────────────────────────────────
    print("\nComputing permutation feature importance on test set (Ch. 16)...")
    imp_df = permutation_feature_importance(pipe, X_test, y_test, n_repeats=10)
    imp_path = out_dir / "feature_importance.csv"
    imp_df.to_csv(imp_path, index=False)
    print(f"Saved feature importance → {imp_path}")
    print(imp_df.to_string(index=False))

    # ── Persist model ─────────────────────────────────────────────────────────
    model_path = out_dir / f"donor_churn_{best_name}.joblib"
    joblib.dump(pipe, model_path)
    print(f"\nSaved model → {model_path}")

    # ── Score full universe ───────────────────────────────────────────────────
    X_full = X.copy()
    if transformed_cols:
        X_full[transformed_cols] = np.log1p(X_full[transformed_cols])

    probas = pipe.predict_proba(X_full)[:, 1]
    result = pd.DataFrame({
        "supporter_id": X_full.index,
        "churn_risk": probas,
        "label_churn": y.values,
    })
    threshold = result["churn_risk"].quantile(0.80)
    result["at_risk_top20"] = (result["churn_risk"] >= threshold).astype(int)

    # ── Suggested action (rule-based personalization) ─────────────────────────
    def personalized_action(x_row: pd.Series, meta_row) -> tuple:
        avg_amt = float(x_row.get("avg_donation_amount", 0) or 0)
        freq = float(x_row.get("donation_frequency", 0) or 0)
        recency_days = float(x_row.get("days_since_last_donation", 9999) or 9999)
        eng = float(x_row.get("engagement_score", 0) or 0)
        num_posts = float(x_row.get("num_posts", 0) or 0)
        cause = None
        if meta_row is not None and "cause_focus" in meta_row and pd.notna(meta_row["cause_focus"]) and meta_row["cause_focus"] != "unknown":
            cause = str(meta_row["cause_focus"])

        high_value = avg_amt >= 250
        mid_value = 75 <= avg_amt < 250
        high_freq = freq >= 12
        mid_freq = 4 <= freq < 12
        recently_lapsed = 180 <= recency_days < 270
        long_lapsed = recency_days >= 270
        engaged = (eng >= 10) or (num_posts >= 3)

        if high_value and long_lapsed:
            return (
                f"Director call + tailored {cause or 'impact'} report; invite to briefing",
                f"High average gift (${avg_amt:.0f}) and long lapse ({int(recency_days)} days).",
            )
        if high_value and recently_lapsed:
            return (
                f"Handwritten note + {cause or 'impact'} update; offer matched-gift opportunity",
                f"High average gift (${avg_amt:.0f}) and recent lapse ({int(recency_days)} days).",
            )
        if engaged and recently_lapsed:
            return (
                f"DM on social + story from {cause or 'their top cause'}; link to quick donate",
                f"High engagement (score {eng:.0f}) with recent lapse ({int(recency_days)} days).",
            )
        if engaged and long_lapsed:
            return (
                f"Re-engagement series highlighting recent {cause or 'program'} wins; invite to event",
                f"High engagement (score {eng:.0f}) but long lapse ({int(recency_days)} days).",
            )
        if high_freq and recently_lapsed:
            return (
                f"Set-it-and-forget-it monthly reminder; show {cause or 'impact'} progress bar",
                f"Historically frequent donor (~{freq:.1f}/yr) with recent lapse ({int(recency_days)} days).",
            )
        if mid_freq and mid_value:
            return (
                f"Upsell to recurring gift with {cause or 'impact'} milestone; thank-you email",
                f"Moderate frequency (~{freq:.1f}/yr) and mid average gift (${avg_amt:.0f}).",
            )
        if mid_value and long_lapsed:
            return (
                f"Limited-time match for {cause or 'priority program'}; show before/after outcomes",
                f"Mid average gift (${avg_amt:.0f}) with long lapse ({int(recency_days)} days).",
            )
        if avg_amt < 50 and long_lapsed:
            return (
                "Low-friction 1-click $15 ask + gratitude; option to choose favorite cause",
                f"Low average gift (${avg_amt:.0f}) and long lapse ({int(recency_days)} days).",
            )
        if avg_amt < 50 and recently_lapsed:
            return (
                "Friendly reminder with concrete $ impact examples; suggest small recurring gift",
                f"Low average gift (${avg_amt:.0f}) with recent lapse ({int(recency_days)} days).",
            )
        if cause:
            return (
                f"Send {cause} success story + evidence of impact; thank and invite feedback",
                f"Donor shows preference for {cause}.",
            )
        return (
            "Personalized email with recent impact story + easy donate link",
            "General follow-up due to risk and limited preference signals.",
        )

    actions, whys = [], []
    for sid in result["supporter_id"]:
        row_meta = meta.loc[sid] if sid in meta.index else None
        x_row = X_full.loc[sid] if sid in X_full.index else pd.Series()
        action, why = personalized_action(x_row, row_meta)
        actions.append(action)
        whys.append(why)
    result["suggested_action"] = actions
    result["suggested_why"] = whys

    # ── Save artifacts ────────────────────────────────────────────────────────
    metrics_payload = {
        "model_name": best_name,
        "test_metrics": test_metrics,
        "tune_info": tune_info,
        "cv_metrics": eval_df.to_dict(orient="records"),
        "log_transformed_cols": transformed_cols,
        "churn_window_days": args.churn_window_days,
        "prioritize": args.prioritize,
        "train_size": len(X_train),
        "test_size_n": len(X_test),
    }
    metrics_path = out_dir / "metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(_safe_json(metrics_payload), f, indent=2)

    scores_path = out_dir / "donor_risk_scores.parquet"
    result.to_parquet(scores_path, index=False)

    print(f"\nSaved metrics → {metrics_path}")
    print(f"Saved scores  → {scores_path}")
    print("Done.")


if __name__ == "__main__":
    main()
