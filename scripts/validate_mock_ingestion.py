#!/usr/bin/env python3
"""Validate extraction integrity and report candidate-level review issues."""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
CATALOGUE_PATH = REPO_ROOT / "src/data/source_catalogue.json"
MANIFEST_PATH = REPO_ROOT / "src/data/mock_ingestion_manifest.json"
PAGE_ROOT = REPO_ROOT / "data/mock_ingestion/pages"
CANDIDATE_ROOT = REPO_ROOT / "data/mock_ingestion/candidates"
OUTPUT_PATH = REPO_ROOT / "data/mock_ingestion/validation_report.json"
MODULES = {"QUANT", "GK", "LEGAL", "LOGICAL", "ENGLISH"}


def main() -> None:
    catalogue = json.loads(CATALOGUE_PATH.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    integrity_errors = []
    review_issues = []
    page_methods = Counter()
    page_count = 0

    for source in catalogue["sources"]:
        path = PAGE_ROOT / f"{source['id']}.json"
        if not path.is_file():
            integrity_errors.append({"sourceId": source["id"], "issue": "page_cache_missing"})
            continue
        cache = json.loads(path.read_text(encoding="utf-8"))
        if cache.get("source", {}).get("sha256") != source["sha256"]:
            integrity_errors.append({"sourceId": source["id"], "issue": "page_cache_hash_mismatch"})
        expected_pages = source.get("pdf", {}).get("pages") or 0
        if len(cache.get("pages", [])) != expected_pages:
            integrity_errors.append({"sourceId": source["id"], "issue": "page_count_mismatch"})
        page_count += len(cache.get("pages", []))
        page_methods.update(page.get("method", "unknown") for page in cache.get("pages", []))

    status_counts = Counter()
    module_counts = Counter()
    question_count = 0
    answer_count = 0
    for item in manifest["items"]:
        path = CANDIDATE_ROOT / f"{item['sourceId']}.json"
        if not path.is_file():
            integrity_errors.append({"sourceId": item["sourceId"], "issue": "candidate_artifact_missing"})
            continue
        artifact = json.loads(path.read_text(encoding="utf-8"))
        if artifact.get("source", {}).get("sha256") != next(
            source["sha256"] for source in catalogue["sources"] if source["id"] == item["sourceId"]
        ):
            integrity_errors.append({"sourceId": item["sourceId"], "issue": "candidate_hash_mismatch"})
        questions = artifact.get("questions", [])
        ids = [question.get("id") for question in questions]
        if len(ids) != len(set(ids)):
            integrity_errors.append({"sourceId": item["sourceId"], "issue": "duplicate_candidate_ids"})
        status_counts[artifact.get("status", "UNKNOWN")] += 1
        question_count += len(questions)
        answer_count += sum(question.get("correctOption") in {"a", "b", "c", "d"} for question in questions)
        for question in questions:
            module = question.get("module")
            module_counts[module or "UNCLASSIFIED"] += 1
            labels = [option.get("label") for option in question.get("options", [])]
            issues = []
            if module not in MODULES:
                issues.append("module_unclassified")
            if labels != ["a", "b", "c", "d"]:
                issues.append("options_incomplete_or_unordered")
            if not question.get("stem"):
                issues.append("stem_requires_directions_context")
            if not all(option.get("text") for option in question.get("options", [])):
                issues.append("empty_option")
            if question.get("validation", {}).get("requiresVisualReview"):
                issues.append("visual_review_required")
            if issues:
                review_issues.append({"sourceId": item["sourceId"], "questionId": question.get("id"), "issues": issues})

    report = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "valid": not integrity_errors,
        "summary": {
            "indexedDocuments": len(catalogue["sources"]),
            "extractedPages": page_count,
            "questionSources": len(manifest["items"]),
            "questionCandidates": question_count,
            "answerCandidates": answer_count,
            "integrityErrors": len(integrity_errors),
            "reviewIssues": len(review_issues),
            "pageMethods": dict(sorted(page_methods.items())),
            "byCandidateStatus": dict(sorted(status_counts.items())),
            "byModule": dict(sorted(module_counts.items())),
        },
        "integrityErrors": integrity_errors,
        "reviewIssues": review_issues,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"valid": report["valid"], **report["summary"]}, indent=2))
    if integrity_errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
