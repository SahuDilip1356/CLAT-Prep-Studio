#!/usr/bin/env python3
"""Validate human review decisions and publish a batch only when every gate passes."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
QUEUE_PATH = REPO_ROOT / "public/data/mock_batch_1_review_queue.json"
DECISIONS_PATH = REPO_ROOT / "data/mock_review/batch_1_review_decisions.json"
VALIDATION_PATH = REPO_ROOT / "data/mock_review/batch_1_release_validation.json"
REPORT_PATH = REPO_ROOT / "docs/BATCH_1_RELEASE_GATE_2026-08-03.md"
PUBLISH_PATH = REPO_ROOT / "src/data/staging/clat_batch_1_verified.json"
LETTERS = {"A", "B", "C", "D"}


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def word_count(value: object) -> int:
    return len(re.findall(r"\b\w+\b", str(value or "")))


def decision_map(payload: dict) -> tuple[dict[str, dict], list[str]]:
    records = payload.get("decisions", [])
    if isinstance(records, dict):
        records = list(records.values())
    mapped: dict[str, dict] = {}
    duplicates: list[str] = []
    for record in records if isinstance(records, list) else []:
        item_id = record.get("itemId") if isinstance(record, dict) else None
        if not item_id:
            continue
        if item_id in mapped:
            duplicates.append(item_id)
        mapped[item_id] = record
    return mapped, sorted(set(duplicates))


def validate(queue: dict, decisions_payload: dict) -> tuple[dict, dict | None]:
    decisions, duplicate_decisions = decision_map(decisions_payload)
    items = queue.get("items", [])
    queue_summary = queue.get("summary") or {}
    expected_items = int(queue_summary.get("expectedQuestions") or 600)
    expected_mocks = int(queue_summary.get("sources") or 5)
    item_ids = [item.get("id") for item in items]
    queue_duplicates = sorted(item_id for item_id, count in Counter(item_ids).items() if count > 1)
    by_mock: defaultdict[str, list[int]] = defaultdict(list)
    item_results = []

    for item in items:
        by_mock[item.get("mockId")].append(item.get("number"))
        decision = decisions.get(item.get("id"), {})
        failures = []
        has_decision = bool(decision)
        content = decision if has_decision else {
            **(item.get("content") or {}),
            "difficultyLevel": item.get("difficultyLevel"),
            "skillId": item.get("skillId"),
        }
        if not has_decision or decision.get("decision") != "APPROVED":
            failures.append("ACADEMIC_APPROVAL_MISSING")
        if has_decision:
            if decision.get("auditVersion") != queue.get("auditVersion"):
                failures.append("AUDIT_VERSION_MISMATCH")
            if not str(decision.get("reviewer") or "").strip():
                failures.append("REVIEWER_MISSING")
            if not decision.get("reviewedAt"):
                failures.append("REVIEW_TIMESTAMP_MISSING")
        if not str(content.get("questionText") or "").strip():
            failures.append("QUESTION_TEXT_MISSING")
        options = content.get("options") or []
        if len(options) != 4 or any(not str(option).strip() for option in options):
            failures.append("FOUR_OPTIONS_REQUIRED")
        if str(content.get("correctOption") or "").upper() not in LETTERS:
            failures.append("ANSWER_REQUIRED")
        if word_count(content.get("explanation")) < 8:
            failures.append("EXPLANATION_REQUIRED")
        if content.get("difficultyLevel") not in {1, 2, 3}:
            failures.append("DIFFICULTY_REQUIRED")
        if not str(content.get("skillId") or "").strip():
            failures.append("SKILL_REQUIRED")
        source = item.get("source") or {}
        answer_source = item.get("answerSource") or {}
        if not source.get("sourceId") or not isinstance(source.get("page"), int) or not source.get("sha256"):
            failures.append("QUESTION_PROVENANCE_INCOMPLETE")
        if not answer_source.get("sourceId") or not isinstance(answer_source.get("page"), int) or not answer_source.get("sha256"):
            failures.append("ANSWER_PROVENANCE_INCOMPLETE")
        if has_decision and (
            decision.get("sourceId") != source.get("sourceId")
            or decision.get("sourcePage") != source.get("page")
            or decision.get("answerSourceId") != answer_source.get("sourceId")
            or decision.get("answerPage") != answer_source.get("page")
        ):
            failures.append("DECISION_PROVENANCE_MISMATCH")
        item_results.append({"id": item.get("id"), "passed": not failures, "failures": sorted(set(failures))})

    structural_failures = []
    if len(items) != expected_items:
        structural_failures.append(f"EXPECTED_{expected_items}_ITEMS_FOUND_{len(items)}")
    if queue_duplicates:
        structural_failures.append("DUPLICATE_QUEUE_IDS")
    if duplicate_decisions:
        structural_failures.append("DUPLICATE_DECISION_IDS")
    if len(by_mock) != expected_mocks:
        structural_failures.append(f"EXPECTED_{expected_mocks}_MOCKS_FOUND_{len(by_mock)}")
    for mock_id, numbers in sorted(by_mock.items()):
        if sorted(numbers) != list(range(1, 121)):
            structural_failures.append(f"{mock_id}_QUESTION_SEQUENCE_INVALID")

    failure_counts = Counter(failure for result in item_results for failure in result["failures"])
    passed_items = sum(result["passed"] for result in item_results)
    publishable = not structural_failures and passed_items == expected_items
    result = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "batchId": queue.get("batchId"),
        "status": "PUBLISHABLE" if publishable else "BLOCKED",
        "publishable": publishable,
        "summary": {
            "queueItems": len(items),
            "decisionRecords": len(decisions),
            "approvedAndValid": passed_items,
            "blocked": len(items) - passed_items,
            "byFailureCode": dict(sorted(failure_counts.items())),
            "structuralFailures": structural_failures,
        },
        "duplicateQueueIds": queue_duplicates,
        "duplicateDecisionIds": duplicate_decisions,
        "items": item_results,
    }
    release = None
    if publishable:
        release_items = []
        queue_by_id = {item["id"]: item for item in items}
        for item_id in item_ids:
            item = queue_by_id[item_id]
            decision = decisions[item_id]
            release_items.append({
                "id": item_id,
                "batchId": queue.get("batchId"),
                "mockId": item["mockId"],
                "number": item["number"],
                "module": item["module"],
                "passageText": item["content"].get("passageText", ""),
                "questionText": decision["questionText"].strip(),
                "options": [str(option).strip() for option in decision["options"]],
                "correctOption": decision["correctOption"].upper(),
                "explanation": decision["explanation"].strip(),
                "difficultyLevel": decision["difficultyLevel"],
                "skillId": decision["skillId"].strip(),
                "provenance": {"question": item["source"], "answer": item["answerSource"]},
                "approval": {"reviewer": decision["reviewer"].strip(), "reviewedAt": decision["reviewedAt"]},
            })
        release = {
            "schemaVersion": 1,
            "batchId": queue.get("batchId"),
            "publishedAt": result["generatedAt"],
            "items": release_items,
        }
    return result, release


def write_markdown(result: dict, path: Path) -> None:
    summary = result["summary"]
    batch_number = int(str(result.get("batchId") or "1").rsplit("-", 1)[-1])
    lines = [
        f"# Batch {batch_number} release gate",
        "",
        f"Batch: `{result['batchId']}`  ",
        f"Generated: {result['generatedAt']}  ",
        f"Status: **{result['status']}**",
        "",
        "## Gate summary",
        "",
        f"- Queue items: {summary['queueItems']}",
        f"- Imported decision records: {summary['decisionRecords']}",
        f"- Approved and valid: {summary['approvedAndValid']}",
        f"- Blocked: {summary['blocked']}",
        "",
        "## Blocking reasons",
        "",
        "| Reason | Items |",
        "|---|---:|",
    ]
    if summary["byFailureCode"]:
        lines.extend(f"| `{code}` | {count} |" for code, count in summary["byFailureCode"].items())
    else:
        lines.append("| None | 0 |")
    if summary["structuralFailures"]:
        lines.extend(["", "## Structural failures", "", *[f"- `{failure}`" for failure in summary["structuralFailures"]]])
    lines.extend([
        "",
        "## Rule",
        "",
        f"The release file is generated only when all {summary['queueItems']} questions pass every content, provenance and academic-approval check. A blocked validation never overwrites the verified library.",
        "",
    ])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-number", type=int, default=1)
    parser.add_argument("--queue", type=Path)
    parser.add_argument("--decisions", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--report-output", type=Path)
    parser.add_argument("--publish", action="store_true", help="Write the verified release only if every gate passes.")
    parser.add_argument("--publish-output", type=Path)
    parser.add_argument("--strict", action="store_true", help="Exit non-zero when the release is blocked.")
    args = parser.parse_args()
    queue_path = args.queue or (REPO_ROOT / f"public/data/mock_batch_{args.batch_number}_review_queue.json")
    decisions_path = args.decisions or (REPO_ROOT / f"data/mock_review/batch_{args.batch_number}_review_decisions.json")
    output_path = args.output or (REPO_ROOT / f"data/mock_review/batch_{args.batch_number}_release_validation.json")
    report_path = args.report_output or (REPO_ROOT / f"docs/BATCH_{args.batch_number}_RELEASE_GATE_2026-08-03.md")
    publish_path = args.publish_output or (REPO_ROOT / f"src/data/staging/clat_batch_{args.batch_number}_verified.json")
    decisions = read_json(decisions_path) if decisions_path.exists() else {"schemaVersion": 1, "decisions": []}
    result, release = validate(read_json(queue_path), decisions)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_markdown(result, report_path)
    if args.publish and release is not None:
        publish_path.parent.mkdir(parents=True, exist_ok=True)
        publish_path.write_text(json.dumps(release, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"batchId": result["batchId"], "status": result["status"], **result["summary"]}, indent=2))
    if args.strict and not result["publishable"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
