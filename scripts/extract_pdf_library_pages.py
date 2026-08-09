#!/usr/bin/env python3
"""Extract every indexed PDF page using native text first and Tesseract as fallback.

The output is a provenance-rich, incremental cache. It is deliberately separate
from scored questions: OCR text must still pass the structural and answer-key
validators before publication.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
CATALOGUE_PATH = REPO_ROOT / "src/data/source_catalogue.json"
OUTPUT_ROOT = REPO_ROOT / "data/mock_ingestion/pages"
SUMMARY_PATH = REPO_ROOT / "data/mock_ingestion/extraction_summary.json"
TEMP_ROOT = REPO_ROOT / "tmp/pdfs/library_ocr"
PIPELINE_VERSION = 5
ROUTING_VERSION = 3
MIN_NATIVE_CHARACTERS = 80
MIN_QUESTION_NATIVE_CHARACTERS = 250
QUESTION_ASSET_KINDS = {"clat_mock_paper", "ailet_mock_paper", "question_sheet", "sectional_source"}
STRUCTURED_ASSET_KINDS = QUESTION_ASSET_KINDS | {"answer_key_or_explanation"}

VISUAL_PATTERNS = {
    "table": re.compile(r"\b(?:table|tabular|data below)\b", re.I),
    "chart_or_graph": re.compile(r"\b(?:chart|graph|pie chart|bar graph|line graph)\b", re.I),
    "diagram_or_figure": re.compile(r"\b(?:diagram|figure|shown below|image below)\b", re.I),
    "map": re.compile(r"\bmap\b", re.I),
    "mathematical_layout": re.compile(
        r"(?:\b(?:fraction|equation|ratio|percentage|square root)\b|[²³√∑≈≤≥])", re.I
    ),
    "handwriting_or_mark": re.compile(r"\b(?:handwritten|tick mark|checkbox|circle the)\b", re.I),
}


def run_command(args: list[str]) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            args,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            errors="replace",
            timeout=300,
        )
    except subprocess.TimeoutExpired as error:
        return subprocess.CompletedProcess(
            args=args,
            returncode=124,
            stdout=error.stdout or "",
            stderr=f"Command timed out after 300 seconds: {' '.join(args[:2])}",
        )


def split_native_pages(pdf_path: Path, expected_pages: int) -> list[str]:
    result = run_command(["pdftotext", "-layout", str(pdf_path), "-"])
    if result.returncode != 0:
        return [""] * expected_pages
    pages = result.stdout.split("\f")
    if len(pages) > expected_pages and not pages[-1].strip():
        pages.pop()
    if len(pages) < expected_pages:
        pages.extend([""] * (expected_pages - len(pages)))
    return pages[:expected_pages]


def meaningful_characters(text: str) -> int:
    return len(re.findall(r"[A-Za-z0-9]", text))


def clean_text(text: str) -> str:
    text = text.replace("\x00", "").replace("\r\n", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{5,}", "\n\n\n", text)
    return text.strip()


def visual_signals(text: str) -> list[str]:
    return [name for name, pattern in VISUAL_PATTERNS.items() if pattern.search(text)]


def tesseract_page(pdf_path: Path, page_number: int, work_dir: Path, psm: str) -> dict:
    image_prefix = work_dir / f"page-{page_number:04d}"
    render = run_command([
        "pdftoppm", "-f", str(page_number), "-l", str(page_number),
        "-r", "200", "-png", "-singlefile", str(pdf_path), str(image_prefix),
    ])
    image_path = image_prefix.with_suffix(".png")
    if render.returncode != 0 or not image_path.is_file():
        return {"text": "", "confidence": None, "error": render.stderr.strip()[:500]}

    ocr = run_command([
        "tesseract", str(image_path), "stdout", "-l", "eng", "--psm", psm, "tsv"
    ])
    if ocr.returncode != 0:
        return {"text": "", "confidence": None, "error": ocr.stderr.strip()[:500]}

    words = []
    confidences = []
    try:
        lines = ocr.stdout.splitlines()
        header = lines[0].split("\t") if lines else []
        columns = {name: index for index, name in enumerate(header)}
        for raw_row in lines[1:]:
            # Tesseract TSV does not quote literal double-quotes in recognized
            # text, so csv.DictReader can accidentally merge several rows.
            fields = raw_row.split("\t", len(header) - 1)
            if len(fields) != len(header):
                continue
            word = fields[columns["text"]].strip()
            if not word:
                continue
            confidence = float(fields[columns["conf"]] or -1)
            left = int(fields[columns["left"]])
            top = int(fields[columns["top"]])
            width = int(fields[columns["width"]])
            height = int(fields[columns["height"]])
            words.append({
                "left": left,
                "top": top,
                "width": width,
                "height": height,
                "center": top + height / 2,
                "word": word,
            })
            if confidence >= 0:
                confidences.append(confidence)
    except (ValueError, KeyError, IndexError):
        return {"text": "", "confidence": None, "error": "Invalid Tesseract TSV output"}

    # Tesseract can place a narrow question-number column in a separate block,
    # causing 14, 15, 16... to be emitted before their stems. Rebuild physical
    # lines from coordinates so numbers and text at the same y-position rejoin.
    physical_lines = []
    for item in sorted(words, key=lambda value: (value["center"], value["left"])):
        best = None
        best_distance = None
        for line in physical_lines[-4:]:
            distance = abs(item["center"] - line["center"])
            tolerance = max(9, min(16, (item["height"] + line["height"]) * 0.35))
            if distance <= tolerance and (best_distance is None or distance < best_distance):
                best = line
                best_distance = distance
        if best is None:
            physical_lines.append({"center": item["center"], "height": item["height"], "words": [item]})
        else:
            best["words"].append(item)
            count = len(best["words"])
            best["center"] = ((best["center"] * (count - 1)) + item["center"]) / count
            best["height"] = max(best["height"], item["height"])

    lines = []
    for line in sorted(physical_lines, key=lambda value: value["center"]):
        rendered = []
        previous_right = None
        for item in sorted(line["words"], key=lambda value: value["left"]):
            gap = item["left"] - previous_right if previous_right is not None else 0
            separator = "\t" if gap > 55 else " " if rendered else ""
            rendered.extend((separator, item["word"]))
            previous_right = item["left"] + item["width"]
        lines.append("".join(rendered))
    return {
        "text": clean_text("\n".join(lines)),
        "confidence": round(sum(confidences) / len(confidences), 2) if confidences else None,
        "error": None,
    }


def cache_matches(output_path: Path, record: dict) -> bool:
    if not output_path.is_file():
        return False
    try:
        cached = json.loads(output_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    routing_matches = (
        cached.get("routingVersion") == ROUTING_VERSION
        if record["assetKind"] in STRUCTURED_ASSET_KINDS
        else True
    )
    return bool(
        cached.get("pipelineVersion") == PIPELINE_VERSION
        and routing_matches
        and cached.get("source", {}).get("sha256") == record["sha256"]
        and len(cached.get("pages", [])) == (record.get("pdf", {}).get("pages") or 0)
    )


def extract_record(record: dict, ocr_mode: str, force: bool) -> dict:
    output_path = OUTPUT_ROOT / f"{record['id']}.json"
    if not force and cache_matches(output_path, record):
        cached = json.loads(output_path.read_text(encoding="utf-8"))
        return {
            "sourceId": record["id"],
            "status": "cached",
            "output": output_path,
            "summary": cached.get("summary", {}),
        }

    pdf_path = REPO_ROOT / record["path"]
    page_count = record.get("pdf", {}).get("pages") or 0
    if not pdf_path.is_file() or not page_count:
        return {"sourceId": record["id"], "status": "error", "error": "Missing PDF or page count"}

    native_pages = split_native_pages(pdf_path, page_count)
    tesseract_psm = "4" if record["assetKind"] in QUESTION_ASSET_KINDS else "3"
    native_threshold = (
        MIN_QUESTION_NATIVE_CHARACTERS
        if record["assetKind"] in STRUCTURED_ASSET_KINDS
        else MIN_NATIVE_CHARACTERS
    )
    pages = []
    errors = []
    TEMP_ROOT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=f"{record['id']}-", dir=TEMP_ROOT) as temporary:
        work_dir = Path(temporary)
        for index, raw_native in enumerate(native_pages, start=1):
            native_text = clean_text(raw_native)
            native_characters = meaningful_characters(native_text)
            should_ocr = ocr_mode == "force" or (
                ocr_mode == "auto" and native_characters < native_threshold
            )
            selected_text = native_text
            method = "native_text" if native_characters >= native_threshold else "native_sparse"
            ocr_confidence = None
            ocr_characters = 0
            ocr_error = None
            if should_ocr:
                ocr_result = tesseract_page(pdf_path, index, work_dir, tesseract_psm)
                ocr_text = ocr_result["text"]
                ocr_characters = meaningful_characters(ocr_text)
                ocr_confidence = ocr_result["confidence"]
                ocr_error = ocr_result["error"]
                if ocr_characters > native_characters:
                    selected_text = ocr_text
                    method = "tesseract_ocr"
                if ocr_error:
                    errors.append({"page": index, "error": ocr_error})

            signals = visual_signals(selected_text)
            pages.append({
                "pageNumber": index,
                "method": method,
                "text": selected_text,
                "nativeCharacters": native_characters,
                "ocrCharacters": ocr_characters,
                "ocrConfidence": ocr_confidence,
                "visualSignals": signals,
                "requiresVisualReview": bool(
                    signals or method != "native_text" or (ocr_confidence is not None and ocr_confidence < 88)
                ),
            })

    method_counts = Counter(page["method"] for page in pages)
    result = {
        "schemaVersion": 1,
        "pipelineVersion": PIPELINE_VERSION,
        "routingVersion": ROUTING_VERSION,
        "engines": {"native": "pdftotext-layout", "ocr": f"tesseract-eng-psm-{tesseract_psm}"},
        "extractedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "id": record["id"],
            "revision": record.get("sourceRevision", 1),
            "path": record["path"],
            "sha256": record["sha256"],
            "assetKind": record["assetKind"],
            "provider": record["provider"],
            "exam": record["exam"],
        },
        "summary": {
            "pages": len(pages),
            "methodCounts": dict(sorted(method_counts.items())),
            "visualReviewPages": sum(page["requiresVisualReview"] for page in pages),
            "errors": len(errors),
        },
        "errors": errors,
        "pages": pages,
    }
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    temporary_output = output_path.with_suffix(".json.tmp")
    temporary_output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temporary_output.replace(output_path)
    return {"sourceId": record["id"], "status": "extracted", "output": output_path, "summary": result["summary"]}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-id", action="append", dest="source_ids")
    parser.add_argument("--asset-kind", action="append", dest="asset_kinds")
    parser.add_argument("--ocr", choices=("auto", "never", "force"), default="auto")
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    catalogue = json.loads(CATALOGUE_PATH.read_text(encoding="utf-8"))
    records = catalogue["sources"]
    if args.source_ids:
        requested = set(args.source_ids)
        records = [record for record in records if record["id"] in requested]
    if args.asset_kinds:
        requested_kinds = set(args.asset_kinds)
        records = [record for record in records if record["assetKind"] in requested_kinds]
    if args.limit:
        records = records[:args.limit]

    results = []
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        futures = {
            executor.submit(extract_record, record, args.ocr, args.force): record
            for record in records
        }
        for completed, future in enumerate(as_completed(futures), start=1):
            record = futures[future]
            try:
                result = future.result()
            except Exception as error:  # Keep the library run resumable if one source is malformed.
                result = {
                    "sourceId": record["id"],
                    "status": "error",
                    "error": f"{type(error).__name__}: {error}",
                }
            results.append(result)
            detail = result.get("summary", {}).get("methodCounts", {})
            print(f"[{completed}/{len(records)}] {result['sourceId']} {result['status']} {detail}", flush=True)

    status_counts = Counter(result["status"] for result in results)
    method_counts = Counter()
    total_pages = 0
    visual_review_pages = 0
    for result in results:
        result_summary = result.get("summary", {})
        total_pages += result_summary.get("pages", 0)
        visual_review_pages += result_summary.get("visualReviewPages", 0)
        method_counts.update(result_summary.get("methodCounts", {}))
    summary = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "catalogueGeneratedAt": catalogue["generatedAt"],
        "requestedSources": len(records),
        "pages": total_pages,
        "methodCounts": dict(sorted(method_counts.items())),
        "visualReviewPages": visual_review_pages,
        "byStatus": dict(sorted(status_counts.items())),
        "errors": [result for result in results if result["status"] == "error"],
    }
    SUMMARY_PATH.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY_PATH.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))
    if summary["errors"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
