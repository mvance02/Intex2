import subprocess
import sys
from pathlib import Path


def run(cmd: list[str]) -> None:
    print(f"\\n>>> {' '.join(cmd)}")
    subprocess.run(cmd, check=True)


def main() -> None:
    root = Path(__file__).resolve().parent
    py = sys.executable

    run([py, "-m", "features.build_dataset"])
    run([py, "-m", "models.train_explanatory"])
    run([py, "-m", "models.train_predictive"])

    print("\\nEducation dropout risk pipeline complete.")
    print(f"Artifacts saved in: {root / 'artifacts'}")


if __name__ == "__main__":
    main()
