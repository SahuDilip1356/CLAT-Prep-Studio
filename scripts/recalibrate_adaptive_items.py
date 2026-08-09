#!/usr/bin/env python3
"""Blend privacy-safe learner telemetry into adaptive item priors.

Input is newline-delimited JSON. Learner identifiers are used only to count
distinct pseudonymous learners and are never copied to the output.
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
BANK_PATH = REPO_ROOT / "src/data/adaptive_verified_mock_bank.json"
DEFAULT_EVENTS_PATH = REPO_ROOT / "data/mock_ingestion/telemetry/item_attempts.jsonl"
OUTPUT_PATH = REPO_ROOT / "src/data/adaptive_item_calibration.json"
REPORT_PATH = REPO_ROOT / "data/mock_ingestion/adaptive_calibration_report.json"


def clamp(value, minimum, maximum):
    return min(maximum, max(minimum, value))


def load_priors(bank_path=BANK_PATH):
    bank = json.loads(bank_path.read_text(encoding="utf-8"))
    items = bank["itemOverlays"] + bank["standaloneItems"]
    return {item["id"]: item for item in items}


def read_events(path, priors):
    grouped = defaultdict(list)
    errors = []
    if not path.is_file():
        return grouped, errors
    for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not raw.strip():
            continue
        try:
            event = json.loads(raw)
        except json.JSONDecodeError as error:
            errors.append({"line": line_number, "issue": f"invalid_json: {error.msg}"})
            continue
        item_id = str(event.get("itemId") or event.get("questionId") or "")
        if item_id not in priors:
            errors.append({"line": line_number, "issue": "unknown_item", "itemId": item_id})
            continue
        if not isinstance(event.get("isCorrect"), bool):
            errors.append({"line": line_number, "issue": "isCorrect_must_be_boolean", "itemId": item_id})
            continue
        grouped[item_id].append(event)
    return grouped, errors


def calibration_status(attempts):
    if attempts < 30:
        return "EXPERT_CONTENT_PRIOR"
    if attempts < 100:
        return "TELEMETRY_CALIBRATING"
    if attempts < 250:
        return "EMPIRICAL_PROVISIONAL"
    return "EMPIRICAL_STABLE"


def calibrate_item(prior, events):
    parameters = prior["adaptiveCalibration"]
    attempts = len(events)
    correct = sum(event["isCorrect"] for event in events)
    # A 20-attempt equivalent prior prevents small cohorts from swinging items.
    prior_probability = parameters["priorCorrectProbabilityAtTheta0"]
    posterior_probability = (correct + (20 * prior_probability)) / (attempts + 20)
    guessing = parameters["guessingC"]
    adjusted = clamp((posterior_probability - guessing) / max(1 - guessing, 0.001), 0.02, 0.98)
    observed_b = -math.log(adjusted / (1 - adjusted)) / max(parameters["discriminationA"], 0.2)
    observed_b = clamp(observed_b, -3, 3)
    blend_weight = attempts / (attempts + 50)
    blended_b = ((1 - blend_weight) * parameters["difficultyB"]) + (blend_weight * observed_b)
    level = 1 if blended_b < -0.5 else 2 if blended_b <= 0.5 else 3
    correct_times = [
        float(event.get("responseTimeSeconds") or event.get("timeSpentSeconds"))
        for event in events
        if event["isCorrect"] and float(event.get("responseTimeSeconds") or event.get("timeSpentSeconds") or 0) > 0
    ]
    distractors = Counter(
        str(event.get("selectedOption") or event.get("userAnswer"))
        for event in events
        if not event["isCorrect"] and (event.get("selectedOption") is not None or event.get("userAnswer") is not None)
    )
    learner_keys = {
        str(event.get("learnerKey"))
        for event in events
        if event.get("learnerKey") is not None
    }
    return {
        "id": prior["id"],
        "attempts": attempts,
        "distinctPseudonymousLearners": len(learner_keys),
        "correct": correct,
        "observedAccuracy": round(correct / attempts, 4) if attempts else None,
        "posteriorCorrectProbability": round(posterior_probability, 4),
        "priorDifficultyB": parameters["difficultyB"],
        "observedDifficultyB": round(observed_b, 3),
        "blendedDifficultyB": round(blended_b, 3),
        "empiricalWeight": round(blend_weight, 3),
        "difficultyLevel": level,
        "difficultyLabel": {1: "Foundation", 2: "Exam Standard", 3: "Advanced"}[level],
        "calibrationStatus": calibration_status(attempts),
        "medianCorrectResponseSeconds": round(statistics.median(correct_times), 1) if correct_times else None,
        "timedCorrectAttempts": len(correct_times),
        "distractorSelections": dict(sorted(distractors.items())),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--events", type=Path, default=DEFAULT_EVENTS_PATH)
    parser.add_argument("--bank", type=Path, default=BANK_PATH)
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    parser.add_argument("--report-output", type=Path, default=REPORT_PATH)
    args = parser.parse_args()
    priors = load_priors(args.bank)
    preserved_existing = False
    if not args.events.is_file() and args.output.is_file():
        existing = json.loads(args.output.read_text(encoding="utf-8"))
        calibrations = [item for item in existing.get("items", []) if item.get("id") in priors]
        errors = []
        events_by_item = {}
        preserved_existing = True
    else:
        events_by_item, errors = read_events(args.events, priors)
        calibrations = [
            calibrate_item(priors[item_id], events)
            for item_id, events in sorted(events_by_item.items())
        ]
    status_counts = Counter(item["calibrationStatus"] for item in calibrations)
    output = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceEvents": str(args.events.relative_to(REPO_ROOT)) if args.events.is_relative_to(REPO_ROOT) else str(args.events),
        "privacy": "Only aggregate item statistics are retained; learner keys are not copied.",
        "items": calibrations,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    report = {
        "schemaVersion": 1,
        "generatedAt": output["generatedAt"],
        "knownAdaptiveItems": len(priors),
        "eventsAccepted": sum(len(events) for events in events_by_item.values()),
        "itemsWithTelemetry": len(calibrations),
        "preservedExistingCalibration": preserved_existing,
        "byCalibrationStatus": dict(sorted(status_counts.items())),
        "eventErrors": errors,
    }
    args.report_output.parent.mkdir(parents=True, exist_ok=True)
    args.report_output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
