"""Explanatory models (chapter-style): logistic for dropout risk + OLS for attendance trend."""

import numpy as np
import pandas as pd
import statsmodels.api as sm
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from config import ARTIFACT_DIR, SURROGATE_TARGET, TARGET_COLUMN
from models.evaluate import evaluate_binary, save_json

LEAKAGE_COLS = {
    TARGET_COLUMN,
    SURROGATE_TARGET,
    "resident_id",
}


def _feature_cols(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if c not in LEAKAGE_COLS]


def run_logistic(df: pd.DataFrame) -> None:
    d = df.dropna(subset=[TARGET_COLUMN]).copy()
    X = d[_feature_cols(d)]
    y = d[TARGET_COLUMN].astype(int)

    num_cols = X.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = [c for c in X.columns if c not in num_cols]

    pre = ColumnTransformer(
        [
            ("num", Pipeline([("imp", SimpleImputer(strategy="median")), ("sc", StandardScaler())]), num_cols),
            ("cat", Pipeline([("imp", SimpleImputer(strategy="most_frequent")), ("ohe", OneHotEncoder(handle_unknown="ignore"))]), cat_cols),
        ]
    )
    pipe = Pipeline([("pre", pre), ("clf", LogisticRegression(max_iter=3000, class_weight="balanced", C=0.7))])
    pipe.fit(X, y)
    proba = pipe.predict_proba(X)[:, 1]

    metrics = evaluate_binary(y, proba)
    save_json(metrics, ARTIFACT_DIR / "explanatory_logistic_metrics.json")

    feat = pipe.named_steps["pre"].get_feature_names_out()
    coef = pipe.named_steps["clf"].coef_[0]
    out = pd.DataFrame({"feature": feat, "coefficient": coef, "odds_ratio": np.exp(coef)})
    out["abs_coef"] = np.abs(out["coefficient"])
    out.sort_values("abs_coef", ascending=False).drop(columns=["abs_coef"]).to_csv(
        ARTIFACT_DIR / "explanatory_logistic_effects.csv", index=False
    )


def run_ols(df: pd.DataFrame) -> None:
    d = df.dropna(subset=[SURROGATE_TARGET]).copy()
    feats = _feature_cols(d)
    X = pd.get_dummies(d[feats], drop_first=True)
    X = X.apply(pd.to_numeric, errors="coerce")
    X = X.fillna(X.median(numeric_only=True))
    X = X.astype(float)
    X = sm.add_constant(X, has_constant="add")
    y = d[SURROGATE_TARGET].astype(float)

    fit = sm.OLS(y, X).fit(cov_type="HC3")
    conf = fit.conf_int()
    conf.columns = ["ci_low", "ci_high"]
    table = pd.DataFrame(
        {
            "feature": fit.params.index,
            "coef": fit.params.values,
            "std_err": fit.bse.values,
            "t": fit.tvalues.values,
            "pvalue": fit.pvalues.values,
            "ci_low": conf["ci_low"].values,
            "ci_high": conf["ci_high"].values,
        }
    )
    table["abs_coef"] = np.abs(table["coef"])
    table.sort_values("abs_coef", ascending=False).drop(columns=["abs_coef"]).to_csv(
        ARTIFACT_DIR / "explanatory_ols_attendance_change.csv", index=False
    )
    save_json(
        {
            "target": SURROGATE_TARGET,
            "n_obs": int(fit.nobs),
            "r_squared": float(fit.rsquared),
            "r_squared_adj": float(fit.rsquared_adj),
        },
        ARTIFACT_DIR / "explanatory_ols_attendance_change_metrics.json",
    )


def main() -> None:
    df = pd.read_csv(ARTIFACT_DIR / "train_dataset.csv")
    run_logistic(df)
    run_ols(df)
    print("Saved explanatory outputs.")


if __name__ == "__main__":
    main()
