#!/usr/bin/env python3
"""Catalogue CLAT source PDFs before question-bank ingestion.

The catalogue is intentionally provenance-first. It records the original path,
hash, PDF characteristics, likely role, answer-key pairing, and extraction
readiness without modifying the source PDFs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


SOURCE_DIRECTORIES = ("CLAT Mock Papers", "CA Download")


def run_command(*args: str) -> tuple[int, str]:
    completed = subprocess.run(
        args,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        errors="replace",
    )
    return completed.returncode, completed.stdout


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_pdf_info(path: Path) -> dict:
    code, output = run_command("pdfinfo", str(path))
    if code != 0:
        return {"readable": False, "error": output.strip()[:500]}

    values = {}
    for line in output.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        values[key.strip()] = value.strip()

    def integer_value(key: str) -> int | None:
        match = re.search(r"\d+", values.get(key, ""))
        return int(match.group()) if match else None

    return {
        "readable": True,
        "pages": integer_value("Pages"),
        "encrypted": values.get("Encrypted", "unknown").lower() == "yes",
        "pageSize": values.get("Page size"),
        "pdfVersion": values.get("PDF version"),
        "tagged": values.get("Tagged", "unknown").lower() == "yes",
    }


def text_sample(path: Path, pages: int | None) -> dict:
    page_count = pages or 3
    ranges = [(1, min(page_count, 3))]
    if page_count > 3:
        ranges.append((max(4, page_count - 2), page_count))

    outputs = []
    for first_page, last_page in ranges:
        code, output = run_command(
            "pdftotext", "-f", str(first_page), "-l", str(last_page),
            "-layout", str(path), "-"
        )
        if code == 0:
            outputs.append(output)
    if not outputs:
        return {"status": "extraction_error", "characters": 0, "preview": ""}

    cleaned = re.sub(r"\s+", " ", "\n".join(outputs)).strip()
    character_count = len(cleaned)
    if character_count >= 1000:
        status = "digital_text"
    elif character_count >= 120:
        status = "sparse_text"
    else:
        status = "image_only_or_near_empty"
    return {
        "status": status,
        "characters": character_count,
        "preview": cleaned[:280],
    }


def ascii_fold(value: str) -> str:
    return unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")


def normalized_tokens(filename: str) -> str:
    value = ascii_fold(filename).lower()
    value = re.sub(r"\.pdf(?:\.pdf)?$", "", value)
    value = re.sub(r"@clat[_ ]?(?:owner|owmer|vision)", " ", value)
    value = re.sub(r"\((?:ak|qs|answer key|solutions?|\d+)\)", " ", value)
    value = re.sub(r"\b(?:ak|qs|answer key|answers?|solutions?)\b", " ", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def infer_provider(name: str) -> str:
    folded = ascii_fold(name).lower()
    providers = (
        ("12MTC", ("12mtc", "12minutestoclat")),
        ("Law Prep Tutorial", ("lpt", "law prep", "cmr")),
        ("Career Launcher", ("cl ", "career launcher")),
        ("LegalEdge", ("le ", "legaledge")),
        ("Origin", ("origin",)),
        ("RSM", ("rsm",)),
        ("CLAT Vision", ("clat_vision", "clat vision")),
    )
    for provider, markers in providers:
        if any(marker in folded for marker in markers):
            return provider
    return "Unclassified"


def infer_exam(name: str) -> str:
    upper = ascii_fold(name).upper()
    if "AILET" in upper:
        return "AILET"
    if "CLAT" in upper:
        return "CLAT"
    return "Reference/unspecified"


def infer_asset_kind(name: str, sample: dict, pages: int | None) -> str:
    folded = ascii_fold(name).lower()
    preview = sample.get("preview", "").lower()
    if re.search(r"answer\s*(?:&|and)\s*explanations?|answer key", preview):
        return "answer_key_or_explanation"
    if re.search(r"\((?:ak|answer key|solution)\)|\bak\b", folded):
        return "answer_key_or_explanation"
    if re.search(r"\((?:qs|question sheet)\)|\bqs\b", folded):
        return "question_sheet"
    if pages and pages <= 5 and "score comparison report" in preview:
        return "score_report"
    if any(term in folded for term in ("schedule", "diary", "topics index", "past year exam paper topics")):
        return "planning_reference"
    if "current affairs" in folded or "ca-gk" in folded or "memory based revision" in folded:
        return "current_affairs_source"
    if "mock" in folded and "ailet" in folded:
        return "ailet_mock_paper"
    if "mock" in folded and "clat" in folded:
        return "clat_mock_paper"
    if any(term in folded for term in ("booklet", "compilation", "legal", "vocabulary", "idiomatic", "reading comprehension")):
        return "sectional_source"
    return "reference_source"


def readiness(
    asset_kind: str,
    sample_status: str,
    has_key: bool,
    answer_key_statuses: list[str] | None = None,
) -> str:
    if asset_kind in {"score_report", "planning_reference", "reference_source"}:
        return "reference_only"
    if sample_status in {"image_only_or_near_empty", "sparse_text"}:
        return "needs_ocr"
    question_assets = {
        "clat_mock_paper", "ailet_mock_paper", "question_sheet",
        "sectional_source",
    }
    if asset_kind in question_assets and not has_key:
        return "text_ready_needs_answer_key"
    if answer_key_statuses and not any(status == "digital_text" for status in answer_key_statuses):
        return "paper_text_ready_key_needs_ocr"
    return "ready_for_structured_extraction"


def pair_catalogue(records: list[dict]) -> None:
    by_pair_key: dict[str, list[dict]] = defaultdict(list)
    for record in records:
        by_pair_key[record["pairKey"]].append(record)

    for record in records:
        candidates = by_pair_key[record["pairKey"]]
        paper_kinds = {
            "clat_mock_paper", "ailet_mock_paper", "question_sheet",
            "sectional_source",
        }
        if record["assetKind"] in paper_kinds:
            matches = [
                candidate["id"]
                for candidate in candidates
                if candidate["assetKind"] == "answer_key_or_explanation"
            ]
            record["answerKeyIds"] = matches
            record["hasAnswerKey"] = bool(matches)
        elif record["assetKind"] == "answer_key_or_explanation":
            matches = [
                candidate["id"]
                for candidate in candidates
                if candidate["assetKind"] in paper_kinds
            ]
            record["questionPaperIds"] = matches
            record["hasQuestionPaper"] = bool(matches)

    by_id = {record["id"]: record for record in records}
    for record in records:
        answer_key_statuses = [
            by_id[source_id]["textExtraction"]["status"]
            for source_id in record.get("answerKeyIds", [])
        ]
        record["ingestionReadiness"] = readiness(
            record["assetKind"],
            record["textExtraction"]["status"],
            bool(record.get("hasAnswerKey") or record["assetKind"] == "answer_key_or_explanation"),
            answer_key_statuses,
        )


def duplicate_catalogue(records: list[dict]) -> None:
    by_hash: dict[str, list[dict]] = defaultdict(list)
    for record in records:
        by_hash[record["sha256"]].append(record)
    for group in by_hash.values():
        if len(group) < 2:
            continue
        ids = [record["id"] for record in group]
        for record in group:
            record["exactDuplicateIds"] = [item for item in ids if item != record["id"]]


def apply_staging_links(repo_root: Path, records: list[dict]) -> None:
    by_id = {record["id"]: record for record in records}
    staging_root = repo_root / "src/data/staging"
    if not staging_root.is_dir():
        return
    for staging_path in sorted(staging_root.glob("**/*.json")):
        try:
            data = json.loads(staging_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        source = data.get("source", {})
        source_id = source.get("catalogueId") or source.get("questionCatalogueId")
        record = by_id.get(source_id)
        if not record:
            continue
        record["digitizationStatus"] = "partially_digitized_to_staging"
        record.setdefault("stagingArtifacts", []).append({
            "path": staging_path.relative_to(repo_root).as_posix(),
            "mockId": data.get("mock", {}).get("id"),
            "questionCount": len(data.get("questions", [])),
            "status": data.get("status"),
        })


def build_summary(records: list[dict]) -> dict:
    counter_fields = (
        "collection", "exam", "provider", "assetKind", "ingestionReadiness", "digitizationStatus"
    )
    summary = {
        "totalFiles": len(records),
        "totalBytes": sum(record["bytes"] for record in records),
        "totalPages": sum(record["pdf"].get("pages") or 0 for record in records),
        "exactDuplicateGroups": len(
            {tuple(sorted([record["id"], *record.get("exactDuplicateIds", [])])) for record in records if record.get("exactDuplicateIds")}
        ),
        "pairedQuestionPapers": sum(1 for record in records if record.get("hasAnswerKey")),
    }
    for field in counter_fields:
        summary[f"by{field[0].upper()}{field[1:]}"] = dict(sorted(Counter(record[field] for record in records).items()))
    return summary


def source_number(source_id: str) -> int:
    match = re.fullmatch(r"SRC-(\d+)", source_id or "")
    return int(match.group(1)) if match else 0


def catalogue(
    repo_root: Path,
    existing_catalogue: dict | None = None,
    source_directories: tuple[str, ...] = SOURCE_DIRECTORIES,
) -> dict:
    paths = []
    for directory in source_directories:
        directory_path = Path(directory)
        if not directory_path.is_absolute():
            directory_path = repo_root / directory_path
        paths.extend(
            path for path in directory_path.rglob("*")
            if path.is_file() and path.name.lower().endswith(".pdf")
        )
    paths = sorted(path for path in paths if path.is_file())

    indexed_at = datetime.now(timezone.utc).isoformat()
    existing_sources = (existing_catalogue or {}).get("sources", [])
    existing_by_path = {record["path"]: record for record in existing_sources}
    existing_by_hash: dict[str, list[dict]] = defaultdict(list)
    for record in existing_sources:
        existing_by_hash[record.get("sha256", "")].append(record)
    next_source_number = max((source_number(record.get("id", "")) for record in existing_sources), default=0) + 1
    used_source_ids: set[str] = set()
    records = []
    changes = {"new": [], "modified": [], "moved": [], "unchanged": [], "missing": []}

    for path in paths:
        relative_path = path.relative_to(repo_root)
        relative_path_string = relative_path.as_posix()
        file_stat = path.stat()
        previous = existing_by_path.get(relative_path_string)
        can_reuse_scan = bool(
            previous
            and previous.get("bytes") == file_stat.st_size
            and previous.get("modifiedTimeNs") == file_stat.st_mtime_ns
            and previous.get("sha256")
        )
        content_hash = previous["sha256"] if can_reuse_scan else sha256_file(path)
        change_status = "unchanged"
        previous_path = None
        if previous:
            source_id = previous["id"]
            if previous.get("sha256") != content_hash:
                change_status = "modified"
        else:
            moved_candidates = [
                candidate for candidate in existing_by_hash.get(content_hash, [])
                if candidate.get("id") not in used_source_ids
            ]
            if moved_candidates:
                previous = moved_candidates[0]
                source_id = previous["id"]
                previous_path = previous.get("path")
                change_status = "moved"
            else:
                source_id = f"SRC-{next_source_number:04d}"
                next_source_number += 1
                change_status = "new"
        used_source_ids.add(source_id)
        if can_reuse_scan:
            pdf = previous["pdf"]
            sample = previous["textExtraction"]
        else:
            pdf = parse_pdf_info(path)
            sample = text_sample(path, pdf.get("pages")) if pdf.get("readable") else {
                "status": "unreadable_pdf", "characters": 0, "preview": ""
            }
        collection = relative_path.parts[0]
        asset_kind = infer_asset_kind(path.name, sample, pdf.get("pages"))
        revision = (previous or {}).get("sourceRevision", 1)
        if change_status == "modified":
            revision += 1
        record = {
            "id": source_id,
            "collection": collection,
            "path": relative_path_string,
            "filename": path.name,
            "bytes": file_stat.st_size,
            "modifiedTimeNs": file_stat.st_mtime_ns,
            "sha256": content_hash,
            "sourceRevision": revision,
            "firstSeenAt": (previous or {}).get("firstSeenAt", (existing_catalogue or {}).get("generatedAt", indexed_at)),
            "lastIndexedAt": indexed_at,
            "indexChangeStatus": change_status,
            "provider": infer_provider(path.name),
            "exam": infer_exam(path.name),
            "assetKind": asset_kind,
            "pairKey": normalized_tokens(path.name),
            "pdf": pdf,
            "textExtraction": sample,
            "digitizationStatus": "not_started",
        }
        if previous_path:
            record["previousPath"] = previous_path
        records.append(record)
        changes[change_status].append(source_id)

    current_paths = {record["path"] for record in records}
    changes["missing"] = [
        record["id"] for record in existing_sources if record.get("path") not in current_paths
        and record.get("id") not in used_source_ids
    ]

    duplicate_catalogue(records)
    pair_catalogue(records)
    apply_staging_links(repo_root, records)
    return {
        "schemaVersion": 2,
        "generatedAt": indexed_at,
        "sourceDirectories": list(source_directories),
        "changes": changes,
        "summary": build_summary(records),
        "sources": records,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output", type=Path, default=Path("src/data/source_catalogue.json"))
    parser.add_argument("--source-directory", action="append", dest="source_directories")
    args = parser.parse_args()

    repo_root = args.repo_root.resolve()
    output = args.output if args.output.is_absolute() else repo_root / args.output
    existing_catalogue = None
    if output.is_file():
        try:
            existing_catalogue = json.loads(output.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            existing_catalogue = None
    source_directories = tuple(args.source_directories or SOURCE_DIRECTORIES)
    result = catalogue(repo_root, existing_catalogue, source_directories)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(result["summary"], indent=2))


if __name__ == "__main__":
    main()
