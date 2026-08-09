#!/usr/bin/env python3
"""Create evidence-linked, non-publishable explanation drafts for review gaps."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
QUEUE_PATH = REPO_ROOT / "public/data/mock_batch_1_review_queue.json"
OVERRIDES_PATH = REPO_ROOT / "data/mock_review/batch_1_explanation_overrides.json"
REPORT_PATH = REPO_ROOT / "data/mock_review/legaledge_explanation_draft_report.json"
TARGET_SOURCE_ID = "SRC-0117"
STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "because", "been", "by", "can", "do", "does", "for",
    "from", "had", "has", "have", "how", "if", "in", "is", "it", "its", "may", "most", "not", "of",
    "on", "or", "that", "the", "their", "this", "to", "was", "were", "what", "which", "who", "why", "with",
}


def words(value: str) -> set[str]:
    return {word for word in re.findall(r"[a-z0-9]+", (value or "").lower()) if len(word) > 2 and word not in STOPWORDS}


def sentences(value: str) -> list[str]:
    value = re.sub(r"\s+", " ", value or "").strip()
    candidates = re.split(r"(?<=[.!?])\s+", value)
    return [
        sentence.strip()
        for sentence in candidates
        if 8 <= len(sentence.split()) <= 55
        and not re.search(r"instructions to candidates|duration of test|head office|https?://|page \d+ of", sentence, re.I)
    ]


def supporting_sentence(item: dict) -> tuple[str, float, float]:
    content = item["content"]
    correct_text = content.get("options", [""])[ord(content["correctOption"]) - 65]
    answer_terms = words(correct_text)
    query = words(f"{content.get('questionText', '')} {correct_text}")
    best = ""
    best_score = 0.0
    best_answer_coverage = 0.0
    for sentence in sentences(content.get("passageText", "")):
        candidate = words(sentence)
        if not candidate or not query:
            continue
        query_overlap = len(query & candidate) / max(len(query), 1)
        answer_coverage = len(answer_terms & candidate) / max(len(answer_terms), 1)
        score = query_overlap + (answer_coverage * 2)
        if score > best_score:
            best, best_score, best_answer_coverage = sentence, score, answer_coverage
    return best, round(best_score, 3), round(best_answer_coverage, 3)


def compact(value: str, limit: int = 230) -> str:
    value = re.sub(r"\s+", " ", value or "").strip()
    if len(value) <= limit:
        return value
    shortened = value[:limit].rsplit(" ", 1)[0].rstrip(" ,;:")
    return shortened + "…"


def draft(item: dict) -> tuple[str, str, float]:
    content = item["content"]
    answer = content["correctOption"]
    correct_text = compact(content["options"][ord(answer) - 65], 210).rstrip(". ")
    module = item["module"]
    evidence, overlap, answer_coverage = supporting_sentence(item)

    if module == "QUANT":
        explanation = (
            f"Using the figures in the caselet and carrying out the calculation requested in the stem gives {correct_text}. "
            f"Therefore option {answer} is the keyed numerical result."
        )
        return explanation, "LOW", overlap
    if module == "LOGICAL":
        explanation = (
            f"Applying all the stated constraints and eliminating inconsistent alternatives leaves {correct_text}. "
            f"Therefore option {answer} is the only result consistent with the arrangement."
        )
        return explanation, "LOW", overlap
    if module == "LEGAL":
        explanation = (
            f"Applying the rule stated in the passage to the facts in the question leads to this conclusion: {correct_text}. "
            f"Accordingly, option {answer} is the keyed legal result."
        )
        return explanation, "LOW", overlap
    if evidence and answer_coverage >= 0.5:
        lead = compact(evidence, 230)
        explanation = f"The passage states that {lead[0].lower() + lead[1:] if lead else lead} This supports {correct_text}, so option {answer} is correct."
        return explanation, "MEDIUM", overlap
    explanation = (
        f"The relevant fact or inference in the passage corresponds to {correct_text}. "
        f"Therefore option {answer} is the answer identified by the official key."
    )
    return explanation, "LOW", overlap


def build(
    batch_number: int = 1,
    target_source_id: str | None = TARGET_SOURCE_ID,
    only_missing: bool = False,
) -> tuple[dict, dict]:
    queue_path = REPO_ROOT / f"public/data/mock_batch_{batch_number}_review_queue.json"
    overrides_path = REPO_ROOT / f"data/mock_review/batch_{batch_number}_explanation_overrides.json"
    queue = json.loads(queue_path.read_text(encoding="utf-8"))
    overrides = json.loads(overrides_path.read_text(encoding="utf-8")) if overrides_path.exists() else {"schemaVersion": 1, "items": []}
    existing = {item["itemId"]: item for item in overrides.get("items", [])}
    if target_source_id:
        prefix = f"{queue['batchId']}-{target_source_id}-"
        existing = {item_id: item for item_id, item in existing.items() if not item_id.startswith(prefix)}
    target_items = [
        item for item in queue["items"]
        if (not target_source_id or item["mockId"] == target_source_id)
        and (
            not only_missing
            or any(issue.get("code") == "EXPLANATION_REQUIRED" for issue in item.get("issues", []))
            or (item.get("explanationProvenance") or {}).get("kind") == "EVIDENCE_LINKED_AUTO_DRAFT"
        )
        and item.get("content", {}).get("correctOption") in {"A", "B", "C", "D"}
    ]
    confidence_counts = Counter()
    overlap_values = []
    for item in target_items:
        explanation, confidence, overlap = draft(item)
        confidence_counts[confidence] += 1
        overlap_values.append(overlap)
        existing[item["id"]] = {
            "itemId": item["id"],
            "correctOption": item["content"]["correctOption"],
            "kind": "EVIDENCE_LINKED_AUTO_DRAFT",
            "sourceId": item["source"]["sourceId"],
            "sourcePage": item["source"]["page"],
            "confidence": confidence,
            "lexicalEvidenceOverlap": overlap,
            "explanation": explanation,
        }
    output = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "policy": "Drafts never bypass named academic approval; correctOption must still match reconciled official key evidence.",
        "items": [existing[key] for key in sorted(existing)],
    }
    report = {
        "schemaVersion": 1,
        "generatedAt": output["generatedAt"],
        "batchId": queue["batchId"],
        "sourceId": target_source_id or "ALL_EXPLANATION_GAPS",
        "drafts": len(target_items),
        "byConfidence": dict(sorted(confidence_counts.items())),
        "averageLexicalEvidenceOverlap": round(sum(overlap_values) / max(len(overlap_values), 1), 3),
        "status": "DRAFT_REVIEW_REQUIRED",
        "publicationRule": "Every draft requires rendered-source review and named academic approval.",
    }
    return output, report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-number", type=int, default=1)
    parser.add_argument("--target-source-id", default=TARGET_SOURCE_ID)
    parser.add_argument("--all-sources", action="store_true")
    parser.add_argument("--only-missing", action="store_true")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--report-output", type=Path)
    args = parser.parse_args()
    target_source_id = None if args.all_sources else args.target_source_id
    output, report = build(args.batch_number, target_source_id, args.only_missing)
    output_path = args.output or (REPO_ROOT / f"data/mock_review/batch_{args.batch_number}_explanation_overrides.json")
    if args.report_output:
        report_path = args.report_output
    elif args.batch_number == 1 and target_source_id == TARGET_SOURCE_ID:
        report_path = REPORT_PATH
    else:
        report_path = REPO_ROOT / f"data/mock_review/batch_{args.batch_number}_explanation_draft_report.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
