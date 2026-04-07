"""
Generalizable data diagnostics (Course Ch6–Ch7).

Use after loading raw tables and before modeling. Feeds the “diagnose → wrangle → model” loop.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def unistats_profile(df: pd.DataFrame) -> pd.DataFrame:
    """
    Per-column profile: dtype, missing %, distinct count, and simple skew for numeric cols.

    Mirrors the role of unistats-style diagnostics described in Ch7 (what needs attention).
    """
    rows = []
    for col in df.columns:
        s = df[col]
        miss = s.isna().mean() * 100 if len(df) else 0.0
        nunique = s.nunique(dropna=True)
        dtype = str(s.dtype)
        skew = np.nan
        if pd.api.types.is_numeric_dtype(s):
            s2 = pd.to_numeric(s, errors="coerce").dropna()
            if len(s2) > 2:
                skew = float(s2.skew())
        rows.append(
            {
                "column": col,
                "dtype": dtype,
                "missing_pct": round(miss, 2),
                "n_distinct": int(nunique),
                "skew": round(skew, 3) if skew == skew else None,
            }
        )
    return pd.DataFrame(rows).sort_values("missing_pct", ascending=False)


def consolidate_rare_categories(
    series: pd.Series,
    min_count: int = 5,
    other_label: str = "(other)",
) -> pd.Series:
    """
    Collapse categories with frequency below min_count into other_label (Ch7 pattern).
    """
    vc = series.fillna("(missing)").astype(str).value_counts()
    keep = vc[vc >= min_count].index
    return series.fillna("(missing)").astype(str).where(series.fillna("(missing)").astype(str).isin(keep), other_label)
