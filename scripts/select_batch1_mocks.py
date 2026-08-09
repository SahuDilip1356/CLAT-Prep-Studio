#!/usr/bin/env python3
"""Rank answer-key-OCR-pending CLAT mocks and freeze the first review batch."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = REPO_ROOT / "src/data/mock_ingestion_manifest.json"
CANDIDATE_DIR = REPO_ROOT / "data/mock_ingestion/candidates"
OUTPUT_PATH = REPO_ROOT / "data/mock_review/batch_1_selection.json"
REPORT_PATH = REPO_ROOT / "docs/BATCH_1_CLAT_MOCK_SELECTION_2026-08-03.md"


def rank_candidates(manifest: dict) -> list[dict]:
    ranked = []
    for item in manifest["items"]:
        if item.get("exam") != "CLAT" or item.get("workflow", {}).get("state") != "ANSWER_KEY_OCR_PENDING":
            continue
        candidate_path = CANDIDATE_DIR / f"{item['sourceId']}.json"
        if not candidate_path.exists():
            continue
        candidate = json.loads(candidate_path.read_text(encoding="utf-8"))
        summary = candidate.get("summary", {})
        parsed = int(summary.get("parsedQuestions") or 0)
        four_options = int(summary.get("fourOptionQuestions") or 0)
        attached = int(summary.get("answerCandidatesAttached") or 0)
        visual = int(summary.get("visualReviewQuestions") or 0)
        key_pages = int(item.get("ocr", {}).get("answerKeyPages") or 0)
        safe_yield = min(120, parsed, four_options, attached)
        yield_score = round(
            safe_yield * 100 / 120
            - max(0, 120 - parsed) * 0.3
            - visual * 0.05
            - key_pages * 0.03,
            3,
        )
        ranked.append({
            "sourceId": item["sourceId"],
            "path": item["path"],
            "provider": item["provider"],
            "answerKeySourceIds": item["answerKeySourceIds"],
            "questionPages": item["ocr"]["questionPages"],
            "answerKeyPages": key_pages,
            "parsedQuestions": parsed,
            "fourOptionQuestions": four_options,
            "answerCandidatesAttached": attached,
            "visualReviewQuestions": visual,
            "safeImmediateYield": safe_yield,
            "yieldScore": yield_score,
            "selectionReason": "Highest expected verified-item yield after structural, answer and review-burden penalties.",
        })
    return sorted(ranked, key=lambda row: (-row["yieldScore"], -row["safeImmediateYield"], row["sourceId"]))


def rank_missing_key_candidates(manifest: dict) -> list[dict]:
    """Rank full CLAT mocks whose question text exists but whose key is absent.

    Batches 8 onward digitize the question layer only.  Eligibility therefore
    keys off TEXT_BLOCKED_MISSING_KEY rather than ANSWER_KEY_OCR_PENDING, and
    section-only compilations and AILET papers are excluded because they carry
    no 120-question full-mock structure.  Ordering is by source id so the queue
    is stable and reproducible across runs.
    """
    ranked = []
    for item in manifest["items"]:
        if item.get("exam") != "CLAT":
            continue
        if item.get("assetKind") != "clat_mock_paper":
            continue
        if item.get("workflow", {}).get("state") != "TEXT_BLOCKED_MISSING_KEY":
            continue
        candidate_path = CANDIDATE_DIR / f"{item['sourceId']}.json"
        if not candidate_path.exists():
            continue
        summary = json.loads(candidate_path.read_text(encoding="utf-8")).get("summary", {})
        ranked.append({
            "sourceId": item["sourceId"],
            "path": item["path"],
            "provider": item["provider"],
            "answerKeySourceIds": item["answerKeySourceIds"],
            "questionPages": item["ocr"]["questionPages"],
            "answerKeyPages": int(item.get("ocr", {}).get("answerKeyPages") or 0),
            "parsedQuestions": int(summary.get("parsedQuestions") or 0),
            "fourOptionQuestions": int(summary.get("fourOptionQuestions") or 0),
            "answerCandidatesAttached": int(summary.get("answerCandidatesAttached") or 0),
            "visualReviewQuestions": int(summary.get("visualReviewQuestions") or 0),
            "safeImmediateYield": 0,
            "yieldScore": 0,
            "selectionReason": "Question paper is native-text readable; official answer key is not present.",
        })
    return sorted(ranked, key=lambda row: row["sourceId"])


def build_missing_key(batch_number: int, batch_size: int = 5) -> dict:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    ranked = rank_missing_key_candidates(manifest)
    excluded_ids = set()
    for prior_number in range(1, batch_number):
        prior_path = REPO_ROOT / f"data/mock_review/batch_{prior_number}_selection.json"
        if prior_path.exists():
            prior = json.loads(prior_path.read_text(encoding="utf-8"))
            excluded_ids.update(item["sourceId"] for item in prior.get("selected", []))
    eligible = [item for item in ranked if item["sourceId"] not in excluded_ids]
    selected = eligible[:batch_size]
    remaining = eligible[batch_size:]
    return {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "batchId": f"CLAT-BATCH-{batch_number:03d}",
        "status": "QUESTION_DIGITIZATION_SELECTED_KEY_ACQUISITION_PENDING",
        "selectionPolicy": {
            "exam": "CLAT",
            "targetMocks": batch_size,
            "ranking": (
                "next five indexed full CLAT mocks whose question text is available but whose "
                "official answer key is missing; AILET and section-only compilations are excluded"
            ),
            "publicationRule": (
                "Questions may be repaired and classified now; scoring and learner publication "
                "remain blocked until an authoritative key is paired and academically approved."
            ),
        },
        "summary": {
            "eligibleSources": len(eligible),
            "selectedSources": len(selected),
            "selectedSafeImmediateYield": 0,
            "remainingMissingKeySources": len(remaining),
        },
        "selected": [dict(item, rank=index + 1) for index, item in enumerate(selected)],
        "remaining": {
            "missingKeySources": len(remaining),
            "nextSourceId": remaining[0]["sourceId"] if remaining else None,
        },
    }


def build(batch_number: int = 1, batch_size: int = 5) -> dict:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    ranked = rank_candidates(manifest)
    excluded_ids = set()
    for prior_number in range(1, batch_number):
        prior_path = REPO_ROOT / f"data/mock_review/batch_{prior_number}_selection.json"
        if prior_path.exists():
            prior = json.loads(prior_path.read_text(encoding="utf-8"))
            excluded_ids.update(item["sourceId"] for item in prior.get("selected", []))
    eligible = [item for item in ranked if item["sourceId"] not in excluded_ids]
    selected = eligible[:batch_size]
    selected_ids = {item["sourceId"] for item in selected}
    return {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "batchId": f"CLAT-BATCH-{batch_number:03d}",
        "status": "SELECTED_FOR_KEY_VERIFICATION",
        "selectionPolicy": {
            "eligibleWorkflow": "ANSWER_KEY_OCR_PENDING",
            "exam": "CLAT",
            "targetMocks": batch_size,
            "ranking": "safe immediate yield minus parsed-gap, visual-review and answer-page burden",
            "publicationRule": "No item publishes until official key and rendered evidence pass review.",
        },
        "summary": {
            "eligibleSources": len(eligible),
            "selectedSources": len(selected),
            "selectedSafeImmediateYield": sum(item["safeImmediateYield"] for item in selected),
            "remainingHighYieldSources": len(eligible) - len(selected),
        },
        "selected": [dict(item, rank=index + 1) for index, item in enumerate(selected)],
        "remaining": [dict(item, rank=index + 1) for index, item in enumerate(eligible) if item["sourceId"] not in selected_ids],
    }


def write_markdown(batch: dict, path: Path) -> None:
    batch_number = int(batch["batchId"].rsplit("-", 1)[-1])
    lines = [
        f"# Batch {batch_number} CLAT mock selection",
        "",
        f"Batch: `{batch['batchId']}`  ",
        f"Generated: {batch['generatedAt']}",
        "",
        "## Decision",
        "",
        f"{batch['summary']['selectedSources']} sources were selected from {batch['summary']['eligibleSources']} remaining answer-key-OCR-pending CLAT mocks. Their conservative immediate yield is {batch['summary']['selectedSafeImmediateYield']} structurally complete questions before academic repair.",
        "",
        "| Rank | Source | Provider | Parsed | Four options | Answers attached | Safe yield | Key pages | Score |",
        "|---:|---|---|---:|---:|---:|---:|---:|---:|",
    ]
    for item in batch["selected"]:
        lines.append(
            f"| {item['rank']} | `{item['sourceId']}` | {item['provider']} | {item['parsedQuestions']} | "
            f"{item['fourOptionQuestions']} | {item['answerCandidatesAttached']} | {item['safeImmediateYield']} | "
            f"{item['answerKeyPages']} | {item['yieldScore']} |"
        )
    lines.extend([
        "",
        "## Gate",
        "",
        "Selection is not approval. Each answer must be reconciled to the official answer source, each question must be repaired against its rendered page, and each mock must pass completeness and publication validators.",
        "",
    ])
    path.write_text("\n".join(lines), encoding="utf-8")


def write_missing_key_markdown(batch: dict, path: Path) -> None:
    batch_number = int(batch["batchId"].rsplit("-", 1)[-1])
    selected = batch["selected"]
    lines = [
        f"# Batch {batch_number} CLAT mock selection",
        "",
        f"Batch: `{batch['batchId']}`  ",
        f"Generated: {batch['generatedAt']}",
        "",
        "## Selection",
        "",
        f"Batch {batch_number} selects the next {len(selected)} eligible full CLAT mocks:",
        "",
    ]
    for item in selected:
        title = Path(item["path"]).stem
        lines.append(f"{item['rank']}. `{item['sourceId']}` - {title}")
    remaining = batch["remaining"]["missingKeySources"]
    next_id = batch["remaining"]["nextSourceId"]
    lines.extend([
        "",
        "All five question layers have been structurally recovered and classified. Correct answers, "
        "explanations, scoring, academic approval, and learner publication remain blocked until their "
        "authoritative answer keys are supplied.",
        "",
    ])
    if remaining:
        lines.append(
            f"After Batch {batch_number}, {remaining} indexed full-mock missing-key CLAT sources remain, "
            f"beginning with `{next_id}`."
        )
    else:
        lines.append(
            f"Batch {batch_number} consumes the final indexed full-mock missing-key CLAT source. "
            "No full CLAT mock remains un-digitized."
        )
    lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-number", type=int, default=1)
    parser.add_argument("--batch-size", type=int, default=5)
    parser.add_argument("--missing-key", action="store_true",
                        help="Select question-only mocks whose official answer key is absent (batches 8+).")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--report-output", type=Path)
    args = parser.parse_args()
    batch = (
        build_missing_key(args.batch_number, args.batch_size)
        if args.missing_key
        else build(args.batch_number, args.batch_size)
    )
    output = args.output or (REPO_ROOT / f"data/mock_review/batch_{args.batch_number}_selection.json")
    report_output = args.report_output or (REPO_ROOT / f"docs/BATCH_{args.batch_number}_CLAT_MOCK_SELECTION_2026-08-03.md")
    output.parent.mkdir(parents=True, exist_ok=True)
    report_output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(batch, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if args.missing_key:
        write_missing_key_markdown(batch, report_output)
    else:
        write_markdown(batch, report_output)
    print(json.dumps({"batchId": batch["batchId"], **batch["summary"], "selected": [item["sourceId"] for item in batch["selected"]]}, indent=2))


if __name__ == "__main__":
    main()
