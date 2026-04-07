from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent.parent
DATA_DIR = REPO_ROOT
ARTIFACT_DIR = BASE_DIR / "artifacts"

PREDICTION_CUTOFF_DATE = "2025-12-31"
TARGET_COLUMN = "target_dropout_risk"
SURROGATE_TARGET = "attendance_change"

TABLES = {
    "residents": "residents.csv",
    "education_records": "education_records.csv",
    "process_recordings": "process_recordings.csv",
    "intervention_plans": "intervention_plans.csv",
    "home_visitations": "home_visitations.csv",
    "health_wellbeing_records": "health_wellbeing_records.csv",
}

NEG_EMOTION = {"Angry", "Distressed", "Anxious", "Sad", "Withdrawn"}
POS_EMOTION = {"Calm", "Hopeful", "Happy"}
