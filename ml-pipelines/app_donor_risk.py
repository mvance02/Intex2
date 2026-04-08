import pandas as pd
import streamlit as st
from pathlib import Path

st.set_page_config(page_title="Donor Retention Dashboard", layout="wide")
st.markdown(
    """
<style>
    .main-title {
        font-size: 2rem;
        font-weight: 800;
        margin-bottom: 0.2rem;
    }
    .subtitle {
        color: #4B5563;
        margin-bottom: 1rem;
    }
    .tip-box {
        background: linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 100%);
        border: 1px solid #E5E7EB;
        border-left: 6px solid #4F46E5;
        border-radius: 12px;
        padding: 0.9rem 1rem;
        margin: 0.6rem 0 1rem 0;
    }
    .kpi-card {
        border: 1px solid #E5E7EB;
        border-radius: 12px;
        padding: 0.8rem 1rem;
        background: #FFFFFF;
    }
    .kpi-label {
        color: #6B7280;
        font-size: 0.85rem;
    }
    .kpi-value {
        font-size: 1.55rem;
        font-weight: 800;
        color: #111827;
    }
</style>
""",
    unsafe_allow_html=True,
)

st.markdown('<div class="main-title">Donor Retention Dashboard</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="subtitle">Clear, non-technical view of who to contact first and what action to take.</div>',
    unsafe_allow_html=True,
)

st.markdown(
    """
<div class="tip-box">
<b>Quick guide:</b> <br/>
1) Filter donors on the left. <br/>
2) Start with <b>Critical</b> and <b>High</b> risk. <br/>
3) Use <b>Suggested Next Step</b> in the table for outreach.
</div>
""",
    unsafe_allow_html=True,
)

default_scores_path = str(Path(__file__).resolve().parent / "outputs" / "donor_retention" / "donor_risk_scores.parquet")
scores_path = st.text_input("Data file (parquet)", value=default_scores_path)

if not Path(scores_path).exists():
    st.warning("Data file not found yet. Please run donor model training first.")
    st.stop()

df = pd.read_parquet(scores_path)

if "churn_risk" not in df.columns:
    st.error("This file does not have a `churn_risk` column.")
    st.stop()


def risk_band(score: float) -> str:
    if score >= 0.75:
        return "Critical"
    if score >= 0.50:
        return "High"
    if score >= 0.25:
        return "Moderate"
    return "Low"


df = df.copy()
df["risk_band"] = df["churn_risk"].apply(risk_band)

st.sidebar.header("Filter Options")
only_top20 = st.sidebar.checkbox("Show only high priority donors (top 20%)", value=True)
min_risk = st.sidebar.slider("Minimum risk score", min_value=0.0, max_value=1.0, value=0.50, step=0.01)
risk_band_filter = st.sidebar.multiselect(
    "Risk level",
    options=["Critical", "High", "Moderate", "Low"],
    default=["Critical", "High", "Moderate", "Low"],
)

view = df.copy()
if only_top20 and "at_risk_top20" in view.columns:
    view = view[view["at_risk_top20"] == 1]
view = view[view["churn_risk"] >= min_risk]
view = view[view["risk_band"].isin(risk_band_filter)]
view = view.sort_values("churn_risk", ascending=False).reset_index(drop=True)

total = len(df)
shown = len(view)
high_priority_count = int(df["at_risk_top20"].sum()) if "at_risk_top20" in df.columns else 0
avg_risk = float(view["churn_risk"].mean()) if shown > 0 else 0.0

col1, col2, col3, col4 = st.columns(4)
with col1:
    st.markdown(
        f'<div class="kpi-card"><div class="kpi-label">Donors in file</div><div class="kpi-value">{total:,}</div></div>',
        unsafe_allow_html=True,
    )
with col2:
    st.markdown(
        f'<div class="kpi-card"><div class="kpi-label">Donors shown</div><div class="kpi-value">{shown:,}</div></div>',
        unsafe_allow_html=True,
    )
with col3:
    st.markdown(
        f'<div class="kpi-card"><div class="kpi-label">High priority donors</div><div class="kpi-value">{high_priority_count:,}</div></div>',
        unsafe_allow_html=True,
    )
with col4:
    st.markdown(
        f'<div class="kpi-card"><div class="kpi-label">Average risk shown</div><div class="kpi-value">{avg_risk:.2f}</div></div>',
        unsafe_allow_html=True,
    )

st.markdown("")
left_col, right_col = st.columns([2, 1])
with left_col:
    st.subheader("Risk Distribution (Filtered)")
    risk_dist = (
        view["risk_band"]
        .value_counts()
        .reindex(["Critical", "High", "Moderate", "Low"], fill_value=0)
        .rename_axis("Risk Level")
        .reset_index(name="Donors")
    )
    st.bar_chart(risk_dist.set_index("Risk Level"))
with right_col:
    st.subheader("Priority Snapshot")
    critical = int((view["risk_band"] == "Critical").sum())
    high = int((view["risk_band"] == "High").sum())
    moderate = int((view["risk_band"] == "Moderate").sum())
    low = int((view["risk_band"] == "Low").sum())
    st.write(f"Critical: **{critical:,}**")
    st.write(f"High: **{high:,}**")
    st.write(f"Moderate: **{moderate:,}**")
    st.write(f"Low: **{low:,}**")
    if shown > 0:
        st.info("Tip: Start outreach from Critical, then High.")
    else:
        st.warning("No donors match your current filters.")

display = view.copy()
rename_map = {
    "supporter_id": "Donor ID",
    "churn_risk": "Risk Score",
    "risk_band": "Risk Level",
    "at_risk_top20": "High Priority",
    "label_churn": "Past Churn Label",
    "suggested_action": "Suggested Next Step",
    "suggested_why": "Reason",
}
display = display.rename(columns=rename_map)

if "High Priority" in display.columns:
    display["High Priority"] = display["High Priority"].map({1: "Yes", 0: "No"}).fillna("No")

preferred_cols = [
    "Donor ID",
    "Risk Score",
    "Risk Level",
    "High Priority",
    "Suggested Next Step",
    "Reason",
    "Past Churn Label",
]
existing_cols = [c for c in preferred_cols if c in display.columns]
other_cols = [c for c in display.columns if c not in existing_cols]
display = display[existing_cols + other_cols]

st.subheader("Donor List (Highest Risk First)")
st.dataframe(
    display,
    use_container_width=True,
    height=600,
    column_config={
        "Risk Score": st.column_config.ProgressColumn(
            "Risk Score",
            help="Higher means higher chance of donor drop-off",
            min_value=0.0,
            max_value=1.0,
            format="%.2f",
        ),
        "Suggested Next Step": st.column_config.TextColumn("Suggested Next Step", width="large"),
        "Reason": st.column_config.TextColumn("Reason", width="large"),
    },
)

st.download_button(
    label="Download this filtered list (CSV)",
    data=view.to_csv(index=False).encode("utf-8"),
    file_name="donor_risk_filtered.csv",
    mime="text/csv",
)

st.subheader("Recommended Outreach Playbook")
st.markdown(
    """
- **Critical (0.75 to 1.00):** Reach out personally this week (call or direct message).
- **High (0.50 to 0.74):** Send a targeted impact update and easy donation link.
- **Moderate (0.25 to 0.49):** Add to warm follow-up sequence and monitor engagement.
- **Low (0.00 to 0.24):** Keep in regular nurture campaign.
"""
)
