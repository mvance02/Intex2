"""Generate course-aligned dropout risk notebook JSON."""
import json
from pathlib import Path


def md(s: str):
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": [line + "\\n" for line in s.strip().split("\\n")],
    }


def code(s: str):
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [line + "\\n" for line in s.strip().split("\\n")],
    }


cells = [
    md(
        """
# Education Dropout Risk - Course-Aligned Pipeline

This notebook follows the chapter flow in your `Chapters` folder.

| Phase | Chapter alignment | What this notebook does |
| --- | --- | --- |
| Business understanding | Ch01 | Define dropout-risk decision question + success criteria |
| Data understanding | Ch02-Ch04, Ch06 | Load core tables and run feature-level profile |
| Data preparation | Ch07 | Build resident-level matrix via `features.build_dataset` |
| Explanatory modeling | Ch09-Ch11, Ch13 | Logistic (association) + OLS surrogate with interpretation caveat |
| Predictive modeling | Ch12-Ch15 | Random forest classifier/regressor with held-out metrics |
| Deployment handoff | Ch17 | Save artifacts used by API dashboard |

**Important:** This dataset has no explicit `DroppedOut` flag, so target is a documented proxy in `features/build_dataset.py`.
        """
    ),
    md(
        """
## 1) Business understanding (Ch01)

**Business question:** Which girls show elevated education disengagement risk so case workers can intervene earlier?

- Primary target: `target_dropout_risk` (binary proxy)
- Surrogate target: `attendance_change` (continuous)
- Explanatory goal: identify associated factors
- Predictive goal: rank risk for triage support
        """
    ),
    code(
        """
from pathlib import Path
import sys

BASE = Path(".").resolve()
if BASE.name != "ml_pipeline":
    raise RuntimeError("Run notebook with working directory set to ml_pipeline")
if str(BASE) not in sys.path:
    sys.path.insert(0, str(BASE))

import pandas as pd
from config import DATA_DIR, TARGET_COLUMN, SURROGATE_TARGET
from data.loaders import load_table
from features.build_dataset import build_dataset

print("DATA_DIR:", DATA_DIR)
        """
    ),
    md(
        """
## 2) Data understanding (Ch02-Ch04, Ch06)

Use raw education records to inspect timeline quality, attendance ranges, and completion distribution.
        """
    ),
    code(
        """
edu = load_table("education_records")
res = load_table("residents")
print("education_records shape:", edu.shape)
print("residents shape:", res.shape)
print("enrollment_status counts:")
print(edu["enrollment_status"].value_counts(dropna=False))
print("completion_status counts:")
print(edu["completion_status"].value_counts(dropna=False))
print("attendance summary:")
print(edu["attendance_rate"].describe())
        """
    ),
    md(
        """
## 3) Data preparation pipeline (Ch07)

`build_dataset()` handles cutoff filtering, longitudinal aggregation, and resident-level joins.
        """
    ),
    code(
        """
df = build_dataset()
print("dataset shape:", df.shape)
display(df.head(10))
print("target distribution:")
print(df[TARGET_COLUMN].value_counts(dropna=False))
print("surrogate summary:")
print(df[SURROGATE_TARGET].describe())
        """
    ),
    md(
        """
## 4) Run explanatory and predictive scripts (Ch09-Ch15)

This reproduces the same artifact pipeline as CLI `python run_all.py`.
        """
    ),
    code(
        """
import subprocess, sys

py = sys.executable
subprocess.run([py, "-m", "models.train_explanatory"], check=True)
subprocess.run([py, "-m", "models.train_predictive"], check=True)
print("Training modules completed.")
        """
    ),
    md(
        """
## 5) Read model outputs (Ch13-Ch15)

Separate explanatory outputs from predictive outputs for textbook clarity.
        """
    ),
    code(
        """
from config import ARTIFACT_DIR

logit_eff = pd.read_csv(ARTIFACT_DIR / "explanatory_logistic_effects.csv")
ols_eff = pd.read_csv(ARTIFACT_DIR / "explanatory_ols_attendance_change.csv")
pred_m = pd.read_json(ARTIFACT_DIR / "predictive_dropout_metrics.json", typ="series")
imp = pd.read_csv(ARTIFACT_DIR / "predictive_dropout_importance.csv")

print("Top explanatory logistic coefficients:")
display(logit_eff.head(12))
print("Top explanatory OLS coefficients:")
display(ols_eff.head(12))
print("Predictive metrics:")
display(pred_m)
print("Top predictive importances:")
display(imp.head(12))
        """
    ),
    md(
        """
## 6) Interpretation guardrails (Ch10 + Ch17)

- Coefficients and feature importances are **associational** in this observational dataset.
- Use risk scores for triage support, not automated case decisions.
- Validate with practitioner review before operational rollout.
        """
    ),
]

nb = {
    "cells": cells,
    "metadata": {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3",
        },
        "language_info": {"name": "python", "version": "3"},
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}

out = Path(__file__).resolve().parent / "Education_Dropout_Risk_Pipeline.ipynb"
out.write_text(json.dumps(nb, indent=1))
print(f"Wrote {out}")
