import pandas as pd
from pathlib import Path


def main():
	# Default scores path produced by training script
	scores_path = Path("C:/Users/Lukeb/OneDrive/Desktop/Pipelines/outputs/donor_retention/donor_risk_scores.parquet")
	out_html = Path("C:/Users/Lukeb/OneDrive/Desktop/Pipelines/outputs/donor_retention/quick_view.html")
	out_html.parent.mkdir(parents=True, exist_ok=True)

	if not scores_path.exists():
		raise FileNotFoundError(f"Scores not found at: {scores_path}. Run the training script first.")

	df = pd.read_parquet(scores_path)
	df = df.sort_values("churn_risk", ascending=False).reset_index(drop=True)

	# Basic styling
	css = """
	<style>
	body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, Arial, 'Helvetica Neue', sans-serif; margin: 24px; }
	h1 { margin-bottom: 8px; }
	.subtitle { color: #666; margin-bottom: 20px; }
	table { border-collapse: collapse; width: 100%; }
	th, td { text-align: left; padding: 8px; border-bottom: 1px solid #eee; }
	tr:nth-child(even) { background: #fafafa; }
	.badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; background: #fde047; }
	.risk { font-variant-numeric: tabular-nums; }
	</style>
	"""

	# Limit to top 100 rows for quick glance
	view = df.head(100).copy()
	if "at_risk_top20" in view.columns:
		view["segment"] = view["at_risk_top20"].map({1: "Top 20%", 0: "Other"})
	cols = [c for c in ["supporter_id", "churn_risk", "label_churn", "segment", "suggested_action", "suggested_why"] if c in view.columns]
	view = view[cols]
	view["churn_risk"] = view["churn_risk"].map(lambda x: f"{x:.3f}")

	table_html = view.to_html(index=False, escape=False)

	html = f"""
	<!doctype html>
	<html lang="en">
	<meta charset="utf-8" />
	<title>Donor Retention - Quick View</title>
	{css}
	<body>
		<h1>Donor Retention Prediction</h1>
		<div class="subtitle">Top-scored donors (first 100 rows)</div>
		{table_html}
		<p style="margin-top:16px;color:#666">Tip: Use the Streamlit app for filtering and exploration.</p>
	</body>
	</html>
	"""
	out_html.write_text(html, encoding="utf-8")
	print(f"Wrote quick view to: {out_html}")


if __name__ == "__main__":
	main()

