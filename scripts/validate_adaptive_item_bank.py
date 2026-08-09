#!/usr/bin/env python3
"""Validate the learner-facing adaptive bank and gated candidate priors."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
BANK_PATH = REPO_ROOT / "src/data/adaptive_verified_mock_bank.json"
CALIBRATION_PATH = REPO_ROOT / "src/data/adaptive_item_calibration.json"
CLAT_BANK_PATH = REPO_ROOT / "src/data/clat_mock_bank.json"
CANDIDATE_PATH = REPO_ROOT / "data/mock_ingestion/adaptive_candidate_priors.jsonl"
OUTPUT_PATH = REPO_ROOT / "data/mock_ingestion/adaptive_validation_report.json"
MODULES = {"ENGLISH", "GK", "LEGAL", "LOGICAL", "QUANT"}
LEVELS = {1, 2, 3}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bank", type=Path, default=BANK_PATH)
    parser.add_argument("--calibration", type=Path, default=CALIBRATION_PATH)
    parser.add_argument("--candidate-priors", type=Path, default=CANDIDATE_PATH)
    parser.add_argument("--report-output", type=Path, default=OUTPUT_PATH)
    args = parser.parse_args()

    bank = json.loads(args.bank.read_text(encoding="utf-8"))
    calibration = json.loads(args.calibration.read_text(encoding="utf-8"))
    clat_bank = json.loads(CLAT_BANK_PATH.read_text(encoding="utf-8"))
    clat_ids = {question["id"] for mock in clat_bank["mocks"] for question in mock["questions"]}
    errors = []
    items = bank["itemOverlays"] + bank["standaloneItems"]
    ids = [item.get("id") for item in items]
    if len(ids) != len(set(ids)):
        errors.append("Learner-facing adaptive item IDs are not unique.")
    if len(items) != bank["summary"]["verifiedItems"]:
        errors.append("Verified adaptive summary count does not match items.")

    by_module = Counter()
    by_difficulty = Counter()
    for item in items:
        label = item.get("id", "unknown")
        module = item.get("tutorModule")
        level = item.get("difficultyLevel")
        by_module[module] += 1
        by_difficulty[(module, level)] += 1
        if module not in MODULES:
            errors.append(f"{label}: invalid module {module}")
        if level not in LEVELS:
            errors.append(f"{label}: invalid difficulty {level}")
        if not item.get("skillId") or not item.get("topic"):
            errors.append(f"{label}: missing skill tag")
        if not item.get("adaptiveEligibility", {}).get("eligible"):
            errors.append(f"{label}: learner item is not eligible")
        parameters = item.get("adaptiveCalibration", {})
        if parameters.get("model") != "3PL_PRIOR":
            errors.append(f"{label}: missing 3PL prior")
        if not 0 < float(parameters.get("guessingC", 0)) <= 0.25:
            errors.append(f"{label}: invalid guessing prior")

    overlay_ids = {item["id"] for item in bank["itemOverlays"]}
    if not overlay_ids <= clat_ids:
        errors.append("One or more adaptive overlays have no verified mock-bank item.")
    for item in bank["standaloneItems"]:
        if len(item.get("options", [])) < 4 or item.get("correctOption") not in {"A", "B", "C", "D"}:
            errors.append(f"{item.get('id')}: standalone item is not a verified four-option MCQ")
    for module in MODULES:
        if by_module[module] == 0:
            errors.append(f"No learner-facing items for {module}")
        for level in LEVELS:
            if by_difficulty[(module, level)] == 0:
                errors.append(f"No difficulty {level} learner items for {module}")

    calibration_ids = [item.get("id") for item in calibration.get("items", [])]
    unknown_calibration_ids = set(calibration_ids) - set(ids)
    if unknown_calibration_ids:
        errors.append(f"Calibration contains unknown items: {sorted(unknown_calibration_ids)[:5]}")

    candidate_count = 0
    candidate_eligibility_errors = 0
    for line_number, raw in enumerate(args.candidate_priors.read_text(encoding="utf-8").splitlines(), start=1):
        if not raw.strip():
            continue
        candidate_count += 1
        item = json.loads(raw)
        if item.get("adaptiveEligibility", {}).get("eligible"):
            candidate_eligibility_errors += 1
            errors.append(f"Candidate line {line_number} was incorrectly made learner-eligible.")

    report = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "valid": not errors,
        "summary": {
            "verifiedAdaptiveItems": len(items),
            "candidatePriors": candidate_count,
            "candidateEligibilityErrors": candidate_eligibility_errors,
            "calibratedItems": len(calibration_ids),
            "byModule": dict(sorted(by_module.items())),
            "byDifficulty": {
                module: {str(level): by_difficulty[(module, level)] for level in sorted(LEVELS)}
                for module in sorted(MODULES)
            },
            "errors": len(errors),
        },
        "errors": errors,
    }
    args.report_output.parent.mkdir(parents=True, exist_ok=True)
    args.report_output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"valid": report["valid"], **report["summary"]}, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
