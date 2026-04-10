# ML Pipelines

## Integrated Pipelines (3)

These are the pipelines deployed and integrated into the application:

| Pipeline | API File | Railway Service | Purpose |
|---|---|---|---|
| Reintegration Readiness | `api.py` | `determined-gentleness` | Predicts resident reintegration readiness scores and type |
| Donor Retention Risk | `donor_retention_risk_api.py` | `determined-gentleness` | Scores donor churn risk for the admin dashboard |
| Social Donation ML | `social_donation_ml/api/main.py` | `sweet-essence` | Optimizes social media posting schedules to maximize donations |

## Exploratory / Not Integrated

The following pipelines were developed during exploration but are **not integrated** into the deployed application:

- `health_deterioration_pipeline/` — Health deterioration prediction (exploratory notebook + standalone app)
- `education_dropout_risk_package/` — Education dropout risk model (training script only)
