#!/usr/bin/env python3
"""Build the incremental work queue for mock-paper OCR and digitization."""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
CATALOGUE_PATH = REPO_ROOT / "src/data/source_catalogue.json"
OUTPUT_PATH = REPO_ROOT / "src/data/mock_ingestion_manifest.json"

MODULES = [
    {"id": "QUANT", "label": "Quantitative Techniques", "shortLabel": "QP (Quant)"},
    {"id": "GK", "label": "Static GK + Current Affairs", "shortLabel": "GK"},
    {"id": "LEGAL", "label": "Legal Reasoning", "shortLabel": "Legal"},
    {"id": "LOGICAL", "label": "Logical Reasoning", "shortLabel": "Analytical + Critical"},
    {"id": "ENGLISH", "label": "English Language", "shortLabel": "English"},
]
ALL_MODULE_IDS = [module["id"] for module in MODULES]
QUESTION_ASSET_KINDS = {
    "clat_mock_paper", "ailet_mock_paper", "question_sheet", "sectional_source"
}


def target_modules(record: dict) -> list[str]:
    if record["assetKind"] in {"clat_mock_paper", "ailet_mock_paper", "question_sheet"}:
        return ALL_MODULE_IDS
    name = record["filename"].lower()
    if re.search(r"quant|quantative|\bqt\b", name):
        return ["QUANT"]
    if re.search(r"legal", name):
        return ["LEGAL"]
    if re.search(r"logical|analytical|critical reasoning", name):
        return ["LOGICAL"]
    if re.search(r"english|reading comprehension|vocabulary|idiom|root word", name):
        return ["ENGLISH"]
    if re.search(r"current affairs|\bgk\b|general knowledge", name):
        return ["GK"]
    return ALL_MODULE_IDS


def workflow_state(record: dict, records_by_id: dict[str, dict]) -> tuple[str, int, str | None]:
    if record.get("digitizationStatus") != "not_started":
        return "DIGITIZED_STAGING", 0, None
    if record.get("exactDuplicateIds"):
        return "DUPLICATE_REVIEW", 90, "Exact duplicate must be resolved before extraction."

    question_status = record.get("textExtraction", {}).get("status")
    answer_records = [records_by_id[item] for item in record.get("answerKeyIds", []) if item in records_by_id]
    answer_statuses = [item.get("textExtraction", {}).get("status") for item in answer_records]
    has_key = bool(answer_records)
    paper_needs_ocr = question_status != "digital_text"
    key_needs_ocr = has_key and not any(status == "digital_text" for status in answer_statuses)

    if not has_key:
        if paper_needs_ocr:
            return "OCR_BLOCKED_MISSING_KEY", 70, "Question OCR can proceed, but scored publication requires an official key."
        return "TEXT_BLOCKED_MISSING_KEY", 60, "Official answer key is not matched."
    if paper_needs_ocr:
        return "FULL_OCR_PENDING", 30, None
    if key_needs_ocr:
        return "ANSWER_KEY_OCR_PENDING", 20, None
    return "READY_FOR_EXTRACTION", 10, None


def main() -> None:
    catalogue = json.loads(CATALOGUE_PATH.read_text(encoding="utf-8"))
    records = catalogue["sources"]
    records_by_id = {record["id"]: record for record in records}
    items = []
    for record in records:
        if record["assetKind"] not in QUESTION_ASSET_KINDS:
            continue
        state, priority, blocker = workflow_state(record, records_by_id)
        answer_records = [records_by_id[item] for item in record.get("answerKeyIds", []) if item in records_by_id]
        item = {
            "sourceId": record["id"],
            "sourceRevision": record.get("sourceRevision", 1),
            "path": record["path"],
            "provider": record["provider"],
            "exam": record["exam"],
            "assetKind": record["assetKind"],
            "targetModules": target_modules(record),
            "workflow": {
                "state": state,
                "priority": priority,
                "blocker": blocker,
            },
            "ocr": {
                "questionRequired": record.get("textExtraction", {}).get("status") != "digital_text",
                "questionPages": record.get("pdf", {}).get("pages"),
                "answerKeyRequired": bool(answer_records) and not any(
                    answer.get("textExtraction", {}).get("status") == "digital_text"
                    for answer in answer_records
                ),
                "answerKeyPages": sum(answer.get("pdf", {}).get("pages") or 0 for answer in answer_records),
                "engine": "tesseract",
                "renderedPageReviewRequired": True,
            },
            "answerKeySourceIds": [answer["id"] for answer in answer_records],
            "difficulty": {
                "status": "UNRATED",
                "level": None,
                "label": "Unrated",
                "assignmentPolicy": "content_rubric_then_learner_telemetry",
            },
            "indexChangeStatus": record.get("indexChangeStatus", "unknown"),
            "stagingArtifacts": record.get("stagingArtifacts", []),
        }
        items.append(item)

    items.sort(key=lambda item: (item["workflow"]["priority"], item["sourceId"]))
    workflow_counts = dict(sorted(Counter(item["workflow"]["state"] for item in items).items()))
    module_counts = dict(sorted(Counter(module for item in items for module in item["targetModules"]).items()))
    output = {
        "schemaVersion": 1,
        "generatedAt": catalogue["generatedAt"],
        "catalogueSchemaVersion": catalogue["schemaVersion"],
        "taxonomy": {"modules": MODULES},
        "qualityGates": [
            "stable_source_identity_and_hash",
            "complete_question_numbering",
            "section_and_passage_boundaries_reviewed",
            "four_ordered_options_per_mcq",
            "official_answer_key_verified",
            "tables_charts_and_superscripts_visually_reviewed",
            "difficulty_rubric_recorded",
            "validator_passed",
        ],
        "difficultyScale": [
            {"level": 1, "label": "Foundation"},
            {"level": 2, "label": "Exam Standard"},
            {"level": 3, "label": "Advanced"},
        ],
        "summary": {
            "questionSources": len(items),
            "byWorkflowState": workflow_counts,
            "byTargetModule": module_counts,
        },
        "items": items,
    }
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(output["summary"], indent=2))


if __name__ == "__main__":
    main()
