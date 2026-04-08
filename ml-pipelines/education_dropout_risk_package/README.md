# Education dropout risk pipeline

Chapter-aligned ML pipeline for identifying residents at higher risk of education disengagement (dropout risk proxy) and separating explanatory analysis from predictive modeling.

## Business question
Which resident/context factors and intervention patterns are associated with elevated education dropout risk, and how well can we predict that risk for proactive support?

## Package layout

```
education_dropout_risk_package/
  README.md
  ml_pipeline/
    Education_Dropout_Risk_Pipeline.ipynb
    _build_notebook.py
    config.py
    run_all.py
    requirements.txt
    data/loaders.py
    features/build_dataset.py
    models/train_explanatory.py
    models/train_predictive.py
    models/evaluate.py
    artifacts/   # generated outputs
```

## Target design (proxy)
Because `education_records.csv` does not include an explicit `DroppedOut` label, the binary target is a documented proxy:

- last record not `Completed`, and
- weak education engagement trajectory (low attendance/progress and/or deterioration across records).

Target column: `target_dropout_risk`.

A continuous surrogate target (`attendance_change`) is also produced for OLS-style explanatory modeling.

## Run

```bash
cd ml_pipeline
python run_all.py
```

Artifacts are written to `ml_pipeline/artifacts/`.

Notebook run (chapter-aligned walkthrough):

```bash
cd ml_pipeline
jupyter notebook Education_Dropout_Risk_Pipeline.ipynb
```

## Outputs

- `train_dataset.csv`
- `explanatory_logistic_effects.csv`
- `explanatory_ols_attendance_change.csv`
- `predictive_dropout_importance.csv`
- `predictive_dropout_metrics.json`
- `predictive_attendance_change_importance.csv`
- `predictive_attendance_change_metrics.json`

## Interpretation note
Treat explanatory coefficients as **associations**, not causal effects.
Use predictive metrics/importances for screening and prioritization, not policy conclusions on causality.
