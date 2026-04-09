"""Automated EDA helpers for the donor retention pipeline.

Implements univariate (Ch. 6–7) and bivariate (Ch. 8) summary functions.
All functions take already-loaded DataFrames and return tidy DataFrames
suitable for saving to CSV or displaying in a notebook.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats


def univariate_summary(X: pd.DataFrame) -> pd.DataFrame:
    """Compute per-column summary statistics (Ch. 6 automation pattern).

    Returns a tidy DataFrame with one row per column containing:
    dtype, missing counts, unique count, and (for numeric columns)
    mean, std, min/max, quartiles, and skewness.
    """
    rows: list[dict] = []
    for col in X.columns:
        series = X[col]
        s_notna = series.dropna()
        row: dict = {
            "column": col,
            "dtype": str(series.dtype),
            "n_missing": int(series.isna().sum()),
            "pct_missing": round(float(series.isna().mean()) * 100, 2),
            "n_unique": int(series.nunique()),
        }
        if pd.api.types.is_numeric_dtype(series) and len(s_notna) > 0:
            row.update(
                {
                    "mean": round(float(s_notna.mean()), 4),
                    "std": round(float(s_notna.std()), 4),
                    "min": round(float(s_notna.min()), 4),
                    "p25": round(float(s_notna.quantile(0.25)), 4),
                    "median": round(float(s_notna.median()), 4),
                    "p75": round(float(s_notna.quantile(0.75)), 4),
                    "max": round(float(s_notna.max()), 4),
                    "skew": round(float(s_notna.skew()), 4) if len(s_notna) > 2 else None,
                }
            )
        else:
            top_val = s_notna.value_counts().index[0] if len(s_notna) > 0 else None
            row.update({"top_value": top_val})
        rows.append(row)
    return pd.DataFrame(rows)


def bivariate_analysis(X_train: pd.DataFrame, y_train: pd.Series) -> pd.DataFrame:
    """Compute bivariate statistics between each feature and the binary target (Ch. 8).

    Selection rule:
      - Numeric feature → Pearson r + p-value (N2N relationship type).
      - Categorical feature → Chi-square statistic + p-value (C2C relationship type).

    Always fits on training data only — never call with test data.
    """
    rows: list[dict] = []
    for col in X_train.columns:
        series = X_train[col]
        row: dict = {"feature": col, "dtype": str(series.dtype)}

        if pd.api.types.is_numeric_dtype(series):
            aligned = series.dropna()
            y_al = y_train.loc[aligned.index]
            try:
                r, p = stats.pearsonr(aligned.astype(float), y_al.astype(float))
                row.update(
                    {
                        "stat_type": "pearson_r",
                        "stat_value": round(float(r), 4),
                        "p_value": round(float(p), 4),
                    }
                )
            except Exception:
                row.update({"stat_type": "pearson_r", "stat_value": None, "p_value": None})
        else:
            try:
                ct = pd.crosstab(series.fillna("(missing)"), y_train)
                chi2, p, _, _ = stats.chi2_contingency(ct)
                row.update(
                    {
                        "stat_type": "chi2",
                        "stat_value": round(float(chi2), 4),
                        "p_value": round(float(p), 4),
                    }
                )
            except Exception:
                row.update({"stat_type": "chi2", "stat_value": None, "p_value": None})

        rows.append(row)
    return pd.DataFrame(rows)
