#!/usr/bin/env python3
"""Audit a staged mock batch before academic review begins."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
QUEUE_PATH = REPO_ROOT / "public/data/mock_batch_1_review_queue.json"
OUTPUT_PATH = REPO_ROOT / "data/mock_review/batch_1_content_integrity.json"
REPORT_PATH = REPO_ROOT / "docs/BATCH_1_CONTENT_INTEGRITY_2026-08-03.md"
EXPECTED_STANDARD_MODULES = {"ENGLISH": 24, "GK": 28, "LEGAL": 32, "LOGICAL": 24, "QUANT": 12}
LEGACY_STANDARD_MODULES = {"ENGLISH": 24, "GK": 28, "LEGAL": 30, "LOGICAL": 26, "QUANT": 12}
ALTERNATE_STANDARD_MODULES = {"ENGLISH": 24, "GK": 30, "LEGAL": 30, "LOGICAL": 24, "QUANT": 12}
KNOWN_FIVE_MODULE_DISTRIBUTIONS = (
    EXPECTED_STANDARD_MODULES,
    LEGACY_STANDARD_MODULES,
    ALTERNATE_STANDARD_MODULES,
)
VALID_MODULES = set(EXPECTED_STANDARD_MODULES)
NOISE = re.compile(
    r"\[\[PAGE|Dear\s+Lptians|SPACE\s+FOR\s+ROUGH\s+WORK|MOCK\s+REVIEW\s+AND\s+FEEDBACK|"
    r"(?:lawpreptutorial|toprankers)\.com|Unauthorised\s+copying",
    re.I,
)


def audit(queue: dict, question_only: bool = False) -> dict:
    items = queue.get("items", [])
    queue_summary = queue.get("summary") or {}
    expected_items = int(queue_summary.get("expectedQuestions") or 600)
    expected_mocks = int(queue_summary.get("sources") or 5)
    by_mock: defaultdict[str, list[dict]] = defaultdict(list)
    for item in items:
        by_mock[item.get("mockId")].append(item)
    failures = []
    warnings = []

    if len(items) != expected_items:
        failures.append({"code": "ITEM_COUNT", "message": f"Expected {expected_items} questions; found {len(items)}."})
    if len(by_mock) != expected_mocks:
        failures.append({"code": "MOCK_COUNT", "message": f"Expected {expected_mocks} mocks; found {len(by_mock)}."})

    for mock_id, rows in sorted(by_mock.items()):
        numbers = sorted(item.get("number") for item in rows)
        if numbers != list(range(1, 121)):
            failures.append({"code": "QUESTION_SEQUENCE", "mockId": mock_id, "message": "Question sequence is not exactly 1-120."})
        ordered_rows = sorted(rows, key=lambda item: item.get("number") or 0)
        module_sequence = [item.get("module") for item in ordered_rows]
        modules = Counter(module_sequence)
        unknown = set(modules) - VALID_MODULES
        runs = [module for index, module in enumerate(module_sequence) if index == 0 or module != module_sequence[index - 1]]
        if unknown or None in modules:
            failures.append({"code": "MODULE_CLASSIFICATION", "mockId": mock_id, "found": dict(modules)})
        elif len(runs) != len(modules):
            failures.append({"code": "MODULE_CONTIGUITY", "mockId": mock_id, "runs": runs})
        elif set(modules) == VALID_MODULES and dict(modules) not in KNOWN_FIVE_MODULE_DISTRIBUTIONS:
            failures.append({
                "code": "MODULE_DISTRIBUTION",
                "mockId": mock_id,
                "found": dict(modules),
                "expectedOneOf": KNOWN_FIVE_MODULE_DISTRIBUTIONS,
            })
        elif len(modules) < 3:
            failures.append({"code": "MODULE_COVERAGE", "mockId": mock_id, "found": dict(modules)})

    explanation_kinds = Counter()
    for item in items:
        content = item.get("content") or {}
        item_id = item.get("id")
        options = content.get("options") or []
        if not str(content.get("questionText") or "").strip():
            failures.append({"code": "QUESTION_TEXT_MISSING", "itemId": item_id})
        if len(options) != 4 or any(not str(option).strip() for option in options):
            failures.append({"code": "FOUR_OPTIONS_REQUIRED", "itemId": item_id})
        if any(len(str(option)) > 500 for option in options):
            failures.append({"code": "OPTION_OVERFLOW", "itemId": item_id})
        if any(NOISE.search(str(option)) for option in options) or NOISE.search(str(content.get("questionText") or "")):
            failures.append({"code": "PAGE_FURNITURE_IN_QUESTION", "itemId": item_id})
        passage = str(content.get("passageText") or "").strip()
        # Standalone critical-reasoning items legitimately use compact
        # arguments rather than CLAT's long shared passages. Fifteen words is
        # still enough to detect an accidentally detached stimulus while not
        # rejecting valid assumption/strengthen/weaken prompts.
        minimum_passage_words = 15 if item.get("module") == "LOGICAL" else 50
        question_words = len(str(content.get("questionText") or "").split())
        standalone_logical = (
            item.get("module") == "LOGICAL"
            and question_words >= 20
            and re.fullmatch(r"(?is)(?:logical\s+reasoning\s*)?(?:answer\s+the\s+following\s+questions?\s*:?)?", passage)
        )
        if len(passage.split()) < minimum_passage_words and not standalone_logical:
            failures.append({"code": "PASSAGE_CONTEXT_MISSING", "itemId": item_id})
        if content.get("correctOption") not in {"A", "B", "C", "D"}:
            (warnings if question_only else failures).append({"code": "ANSWER_MISSING", "itemId": item_id})
        if len(str(content.get("explanation") or "").split()) < 8:
            (warnings if question_only else failures).append({"code": "EXPLANATION_MISSING", "itemId": item_id})
        provenance = item.get("explanationProvenance") or {}
        explanation_kinds[provenance.get("kind") or "MISSING"] += 1
        if provenance.get("reviewStatus") == "DRAFT_REVIEW_REQUIRED":
            warnings.append({"code": "EXPLANATION_DRAFT_REVIEW_REQUIRED", "itemId": item_id})
        source = item.get("source") or {}
        answer_source = item.get("answerSource") or {}
        if not source.get("sourceId") or not isinstance(source.get("page"), int) or not source.get("sha256"):
            failures.append({"code": "QUESTION_PROVENANCE", "itemId": item_id})
        if not answer_source.get("sourceId") or not isinstance(answer_source.get("page"), int) or not answer_source.get("sha256"):
            (warnings if question_only else failures).append({"code": "ANSWER_PROVENANCE", "itemId": item_id})

    failure_counts = Counter(item["code"] for item in failures)
    warning_counts = Counter(item["code"] for item in warnings)
    return {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "batchId": queue.get("batchId"),
        "status": (
            "QUESTIONS_READY_KEY_REQUIRED"
            if question_only and not failures
            else "READY_FOR_ACADEMIC_REVIEW" if not failures
            else "BLOCKED"
        ),
        "summary": {
            "items": len(items),
            "mocks": len(by_mock),
            "failures": len(failures),
            "warnings": len(warnings),
            "byFailureCode": dict(sorted(failure_counts.items())),
            "byWarningCode": dict(sorted(warning_counts.items())),
            "explanationProvenance": dict(sorted(explanation_kinds.items())),
            "moduleTotals": dict(sorted(Counter(item.get("module") for item in items).items())),
        },
        "failures": failures,
        "warnings": warnings,
    }


def write_markdown(result: dict, path: Path) -> None:
    summary = result["summary"]
    batch_number = int(str(result.get("batchId") or "1").rsplit("-", 1)[-1])
    lines = [
        f"# Batch {batch_number} content-integrity audit",
        "",
        f"Status: **{result['status']}**  ",
        f"Generated: {result['generatedAt']}",
        "",
        f"The audit checked {summary['items']} questions across {summary['mocks']} mocks. It found {summary['failures']} blocking content defects and {summary['warnings']} review warnings.",
        "",
        "## Explanation provenance",
        "",
        "| Kind | Questions |",
        "|---|---:|",
        *[f"| `{kind}` | {count} |" for kind, count in summary["explanationProvenance"].items()],
        "",
        "## Module totals",
        "",
        "| Module | Questions |",
        "|---|---:|",
        *[f"| {module} | {count} |" for module, count in summary["moduleTotals"].items()],
        "",
        "## Gate",
        "",
        (
            "`QUESTIONS_READY_KEY_REQUIRED` means question text, options, modules, and provenance passed; answers, explanations, scoring, and publication remain blocked until an authoritative key is supplied."
            if result["status"] == "QUESTIONS_READY_KEY_REQUIRED"
            else "`READY_FOR_ACADEMIC_REVIEW` means the content package is complete enough to review. It does not mean any question is approved or publishable."
        ),
        "",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-number", type=int, default=1)
    parser.add_argument("--queue", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--report-output", type=Path)
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--question-only", action="store_true")
    args = parser.parse_args()
    queue_path = args.queue or (REPO_ROOT / f"public/data/mock_batch_{args.batch_number}_review_queue.json")
    output_path = args.output or (REPO_ROOT / f"data/mock_review/batch_{args.batch_number}_content_integrity.json")
    report_path = args.report_output or (REPO_ROOT / f"docs/BATCH_{args.batch_number}_CONTENT_INTEGRITY_2026-08-03.md")
    result = audit(json.loads(queue_path.read_text(encoding="utf-8")), question_only=args.question_only)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_markdown(result, report_path)
    print(json.dumps({"status": result["status"], **result["summary"]}, indent=2))
    if args.strict and result["status"] not in {"READY_FOR_ACADEMIC_REVIEW", "QUESTIONS_READY_KEY_REQUIRED"}:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
