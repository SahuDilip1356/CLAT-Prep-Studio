#!/usr/bin/env python3
"""OCR sparse-native Batch 1 answer pages that conceal dense scanned content."""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SELECTION_PATH = REPO_ROOT / "data/mock_review/batch_1_selection.json"
PAGE_DIR = REPO_ROOT / "data/mock_ingestion/pages"
CATALOGUE_PATH = REPO_ROOT / "src/data/source_catalogue.json"
OUTPUT_PATH = REPO_ROOT / "data/mock_review/batch_1_sparse_key_ocr.json"
QUEUE_PATH = REPO_ROOT / "public/data/mock_batch_1_review_queue.json"
TEMP_DIR = REPO_ROOT / "tmp/pdfs/batch1-sparse-key"
ANSWER_HEADING = re.compile(r"(?im)^\s*(\d{1,3})\s*[.,)]?\s*Answer\s*[:\-]?\s*\(?[A-D]\)?\b")
ANSWER_SIGNAL = re.compile(r"(?im)^\s*(?:\d{1,3}\s*[.,)]?\s*)?Answer\s*[:\-]?\s*\(?[A-D]\)?\b")


def base_cache_review_pages(source_id: str, cache: dict) -> set[tuple[str, int]]:
    """Derive durable targets from the immutable lower-resolution cache."""
    targets: set[tuple[str, int]] = set()
    number_pages = {}
    for page in cache.get("pages", []):
        page_number = page["pageNumber"]
        numbers = [int(match.group(1)) for match in ANSWER_HEADING.finditer(page.get("text") or "")]
        for number in numbers:
            if 1 <= number <= 120:
                number_pages[number] = page_number
        confidence = page.get("ocrConfidence")
        if numbers and confidence is not None and float(confidence) < 90:
            targets.add((source_id, page_number))
    for missing in (number for number in range(1, 121) if number not in number_pages):
        lower = next((number_pages[number] for number in range(missing - 1, 0, -1) if number in number_pages), None)
        upper = next((number_pages[number] for number in range(missing + 1, 121) if number in number_pages), None)
        if lower is not None and upper is not None:
            for page_number in range(min(lower, upper), max(lower, upper) + 1):
                targets.add((source_id, page_number))
        elif lower is not None:
            targets.add((source_id, lower))
        elif upper is not None:
            targets.add((source_id, upper))
    return targets


def tesseract_confidence(image_path: Path, psm: int) -> float | None:
    result = subprocess.run(
        ["tesseract", str(image_path), "stdout", "--psm", str(psm), "tsv"],
        capture_output=True,
        text=True,
    )
    if result.returncode:
        return None
    values = []
    for row in csv.DictReader(io.StringIO(result.stdout), delimiter="\t"):
        try:
            confidence = float(row.get("conf", "-1"))
        except ValueError:
            continue
        if confidence >= 0 and str(row.get("text") or "").strip():
            values.append(confidence)
    return round(sum(values) / len(values), 2) if values else None


def targeted_review_pages(queue_path: Path = QUEUE_PATH) -> set[tuple[str, int]]:
    if not queue_path.exists():
        return set()
    queue = json.loads(queue_path.read_text(encoding="utf-8"))
    items = queue.get("items", [])
    targets: set[tuple[str, int]] = set()
    by_mock = {}
    for item in items:
        by_mock.setdefault(item.get("mockId"), {})[item.get("number")] = item
        issue_codes = {issue.get("code") for issue in item.get("issues", [])}
        answer_source = item.get("answerSource") or {}
        if "LOW_CONFIDENCE_KEY_REVIEW_REQUIRED" in issue_codes and isinstance(answer_source.get("page"), int):
            targets.add((answer_source["sourceId"], answer_source["page"]))
    for item in items:
        issue_codes = {issue.get("code") for issue in item.get("issues", [])}
        if "KEY_EVIDENCE_MISSING" not in issue_codes:
            continue
        number = item.get("number")
        neighbours = by_mock.get(item.get("mockId"), {})
        boundaries = []
        for direction in (-1, 1):
            probe = number + direction
            while 1 <= probe <= 120:
                source = (neighbours.get(probe) or {}).get("answerSource") or {}
                if isinstance(source.get("page"), int):
                    targets.add((source["sourceId"], source["page"]))
                    boundaries.append((source["sourceId"], source["page"]))
                    break
                probe += direction
        if len(boundaries) == 2 and boundaries[0][0] == boundaries[1][0]:
            source_id = boundaries[0][0]
            for page_number in range(min(boundaries[0][1], boundaries[1][1]), max(boundaries[0][1], boundaries[1][1]) + 1):
                targets.add((source_id, page_number))
    return targets


def build(dpi: int = 300, batch_number: int = 1, targeted_only: bool = False) -> dict:
    if not shutil.which("pdftoppm") or not shutil.which("tesseract"):
        raise RuntimeError("pdftoppm and tesseract are required")
    selection_path = REPO_ROOT / f"data/mock_review/batch_{batch_number}_selection.json"
    queue_path = REPO_ROOT / f"public/data/mock_batch_{batch_number}_review_queue.json"
    selection = json.loads(selection_path.read_text(encoding="utf-8"))
    catalogue = json.loads(CATALOGUE_PATH.read_text(encoding="utf-8"))
    sources = {source["id"]: source for source in catalogue["sources"]}
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    review_targets = targeted_review_pages(queue_path)
    records = []
    for selected in selection["selected"]:
        for key_source_id in selected["answerKeySourceIds"]:
            cache_path = PAGE_DIR / f"{key_source_id}.json"
            if not cache_path.exists():
                continue
            cache = json.loads(cache_path.read_text(encoding="utf-8"))
            if not targeted_only:
                review_targets.update(base_cache_review_pages(key_source_id, cache))
            source = sources[key_source_id]
            pdf_path = REPO_ROOT / source["path"]
            for page in cache.get("pages", []):
                page_number = page["pageNumber"]
                sparse_native = page.get("method") == "native_text" and len(page.get("text") or "") < 500
                targeted = (key_source_id, page_number) in review_targets
                if not targeted and (targeted_only or not sparse_native):
                    continue
                prefix = TEMP_DIR / f"{key_source_id}-p{page_number:04d}"
                image_path = prefix.with_suffix(".png")
                render = subprocess.run([
                    "pdftoppm", "-f", str(page_number), "-l", str(page_number),
                    "-r", str(dpi), "-png", "-singlefile", str(pdf_path), str(prefix),
                ], capture_output=True, text=True)
                if render.returncode or not image_path.exists():
                    raise RuntimeError(render.stderr.strip() or f"Failed to render {key_source_id} page {page_number}")
                variants = []
                for psm in (3, 4, 6):
                    ocr = subprocess.run(
                        ["tesseract", str(image_path), "stdout", "--psm", str(psm)],
                        capture_output=True,
                        text=True,
                    )
                    if ocr.returncode:
                        continue
                    text = ocr.stdout.strip()
                    variants.append({
                        "psm": psm,
                        "text": text,
                        "answerSignals": len(ANSWER_SIGNAL.findall(text)),
                        "confidence": tesseract_confidence(image_path, psm),
                    })
                if not variants:
                    raise RuntimeError(f"Failed to OCR {key_source_id} page {page_number}")
                selected_variant = max(
                    variants,
                    key=lambda value: (
                        value["answerSignals"],
                        float(value["confidence"] or 0),
                        len(value["text"]),
                    ),
                )
                records.append({
                    "sourceId": key_source_id,
                    "sourceRevision": source.get("sourceRevision", 1),
                    "sourceSha256": source["sha256"],
                    "pageNumber": page_number,
                    "method": f"tesseract_supplement_{dpi}dpi_psm{selected_variant['psm']}",
                    "text": selected_variant["text"],
                    "ocrConfidence": selected_variant["confidence"],
                    "answerSignals": selected_variant["answerSignals"],
                    "evaluatedPsmModes": [variant["psm"] for variant in variants],
                    "requiresVisualReview": True,
                    "reason": "low_or_missing_key_evidence" if targeted else "sparse_native_layer_over_dense_scanned_page",
                })
    return {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "dpi": dpi,
        "pageSegmentationModes": [3, 4, 6],
        "targetedOnly": targeted_only,
        "targetedReviewPages": len(review_targets),
        "pages": records,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-number", type=int, default=1)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--dpi", type=int, default=300)
    parser.add_argument("--targeted-only", action="store_true")
    args = parser.parse_args()
    report = build(args.dpi, args.batch_number, args.targeted_only)
    output = args.output or (REPO_ROOT / f"data/mock_review/batch_{args.batch_number}_sparse_key_ocr.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "supplementalPages": len(report["pages"]),
        "sources": sorted({page["sourceId"] for page in report["pages"]}),
        "averageConfidence": round(sum(page["ocrConfidence"] or 0 for page in report["pages"]) / max(len(report["pages"]), 1), 2),
    }, indent=2))


if __name__ == "__main__":
    main()
