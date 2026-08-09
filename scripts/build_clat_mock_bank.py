#!/usr/bin/env python3
"""Build the compact browser payload from provenance-rich staged mock datasets."""

from __future__ import annotations

import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
STAGING_ROOT = REPO_ROOT / "src/data/staging/career_launcher_prime"
OUTPUT_PATH = REPO_ROOT / "src/data/clat_mock_bank.json"


def main() -> None:
    mocks = []
    for path in sorted(STAGING_ROOT.glob("cl-prime-*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        questions = []
        for question in data["questions"]:
            compact_question = {
                key: value
                for key, value in question.items()
                if key not in {"passageText", "directionsText"}
            }
            questions.append(compact_question)
        mocks.append({
            "mock": data["mock"],
            "status": data["status"],
            "source": data["source"],
            "answerKey": data["answerKey"],
            "passages": data["passages"],
            "questions": questions,
        })

    OUTPUT_PATH.write_text(
        json.dumps({"schemaVersion": 1, "mocks": mocks}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT_PATH.relative_to(REPO_ROOT)} with {sum(len(mock['questions']) for mock in mocks)} questions")


if __name__ == "__main__":
    main()
