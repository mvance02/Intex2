import pandas as pd

from config import DATA_DIR, TABLES

DATE_COLUMNS = {
    "residents": ["date_of_admission", "date_closed", "date_enrolled", "created_at"],
    "education_records": ["record_date"],
    "process_recordings": ["session_date"],
    "intervention_plans": ["created_at", "updated_at", "target_date", "case_conference_date"],
    "home_visitations": ["visit_date"],
    "health_wellbeing_records": ["record_date"],
}


def _safe_parse_dates(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    for c in cols:
        if c in df.columns:
            df[c] = pd.to_datetime(df[c], errors="coerce")
    return df


def load_table(name: str) -> pd.DataFrame:
    df = pd.read_csv(DATA_DIR / TABLES[name])
    return _safe_parse_dates(df, DATE_COLUMNS.get(name, []))


def load_all_tables() -> dict[str, pd.DataFrame]:
    return {name: load_table(name) for name in TABLES}
