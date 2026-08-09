#!/usr/bin/env python3
"""Audit the 492-item verified seed and emit an evidence-first review queue."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
CLAT_BANK_PATH = REPO_ROOT / "src/data/clat_mock_bank.json"
ADAPTIVE_BANK_PATH = REPO_ROOT / "src/data/adaptive_verified_mock_bank.json"
QT_STAGING_PATH = REPO_ROOT / "src/data/staging/qt_compilation_mock_01.json"
CATALOGUE_PATH = REPO_ROOT / "src/data/source_catalogue.json"
OUTPUT_PATH = REPO_ROOT / "data/mock_review/gold_set_audit.json"
QUEUE_PATH = REPO_ROOT / "public/data/mock_review_queue.json"
REPORT_PATH = REPO_ROOT / "docs/GOLD_SET_AUDIT_2026-08-03.md"

MODULES = {"ENGLISH", "GK", "LEGAL", "LOGICAL", "QUANT"}
MODULE_ALIASES = {"CA": "GK"}
OPTIONS = {"A", "B", "C", "D"}
PLACEHOLDER_EXPLANATION = re.compile(
    r"^\s*(official\s+(source\s+)?answer\s+key\s*:\s*)?(choice|option|answer)?\s*[abcd][\s.]*$",
    re.IGNORECASE,
)


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalise_text(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9%₹$+\-./]", " ", str(value).lower())).strip()


def add_issue(issues: list[dict], severity: str, code: str, message: str, field: str | None = None) -> None:
    issues.append({
        "severity": severity,
        "code": code,
        "field": field,
        "message": message,
    })


def explanation_is_substantive(value: str) -> bool:
    text = str(value or "").strip()
    if not text or PLACEHOLDER_EXPLANATION.match(text):
        return False
    words = re.findall(r"\b\w+\b", text)
    return len(words) >= 8 and bool(re.search(r"\b(because|therefore|since|thus|implies|means|=|is correct|follows)\b", text, re.I))


def build_items() -> tuple[list[dict], dict[str, dict]]:
    clat_bank = read_json(CLAT_BANK_PATH)
    adaptive_bank = read_json(ADAPTIVE_BANK_PATH)
    qt_staging = read_json(QT_STAGING_PATH)
    overlays = {item["id"]: item for item in adaptive_bank["itemOverlays"]}
    standalone = {item["id"]: item for item in adaptive_bank["standaloneItems"]}
    items: list[dict] = []
    mock_meta: dict[str, dict] = {}

    for mock in clat_bank["mocks"]:
        passage_by_id = {passage["id"]: passage for passage in mock.get("passages", [])}
        mock_id = mock["mock"]["id"]
        mock_meta[mock_id] = mock
        for question in mock["questions"]:
            item = dict(question)
            item["adaptiveOverlay"] = overlays.get(question["id"])
            item["passage"] = passage_by_id.get(question.get("passageId"))
            item["mockTitle"] = mock["mock"]["title"]
            item["provider"] = mock["mock"].get("provider")
            item["source"] = mock["source"]
            item["seedKind"] = "MOCK_OVERLAY"
            items.append(item)

    qt_passages = {passage["id"]: passage for passage in qt_staging.get("passages", [])}
    for question in qt_staging["questions"]:
        adaptive = standalone.get(question["id"])
        item = dict(adaptive or question)
        item.setdefault("module", "QUANT")
        item["adaptiveOverlay"] = adaptive
        item["passage"] = qt_passages.get(question.get("passageId"))
        item["mockTitle"] = qt_staging["mock"]["title"]
        item["provider"] = "Law Prep Tutorial"
        item["source"] = {
            "questionCatalogueId": qt_staging["source"]["catalogueId"],
            "answerCatalogueId": qt_staging["source"]["catalogueId"],
            "path": qt_staging["source"]["path"],
            "questionSha256": qt_staging["source"]["sha256"],
            "answerPath": qt_staging["source"]["path"],
            "answerSha256": qt_staging["source"]["sha256"],
        }
        item["seedKind"] = "STANDALONE"
        items.append(item)

    return items, mock_meta


def audit() -> dict:
    items, mock_meta = build_items()
    catalogue = read_json(CATALOGUE_PATH)
    sources = {source["id"]: source for source in catalogue["sources"]}
    file_hash_cache: dict[str, str] = {}
    audited = []
    duplicate_groups: defaultdict[str, list[str]] = defaultdict(list)

    for item in items:
        issues: list[dict] = []
        item_id = item.get("id")
        raw_module = item.get("tutorModule") or item.get("module")
        module = MODULE_ALIASES.get(raw_module, raw_module)
        overlay = item.get("adaptiveOverlay") or {}
        source = item.get("source") or {}
        source_id = item.get("sourceCatalogueId") or source.get("questionCatalogueId")
        answer_source_id = item.get("answerSourceCatalogueId") or source.get("answerCatalogueId") or source_id
        source_record = sources.get(source_id)
        answer_record = sources.get(answer_source_id)
        options = item.get("options") or []
        correct = str(item.get("correctOption") or "").upper()
        source_page = item.get("sourcePage")
        answer_page = item.get("answerSourcePage")

        if not item_id:
            add_issue(issues, "BLOCKER", "MISSING_ID", "Stable question ID is missing.", "id")
        if module not in MODULES:
            add_issue(issues, "BLOCKER", "INVALID_MODULE", f"Module {module!r} is not canonical.", "module")
        if not str(item.get("questionText") or "").strip():
            add_issue(issues, "BLOCKER", "MISSING_STEM", "Question stem is empty.", "questionText")
        if len(options) != 4:
            add_issue(issues, "BLOCKER", "OPTION_COUNT", f"Expected four options; found {len(options)}.", "options")
        if any(not str(option).strip() for option in options):
            add_issue(issues, "BLOCKER", "EMPTY_OPTION", "At least one option is empty.", "options")
        if correct not in OPTIONS:
            add_issue(issues, "BLOCKER", "INVALID_ANSWER", f"Correct option {correct!r} is invalid.", "correctOption")
        if source_record is None:
            add_issue(issues, "BLOCKER", "SOURCE_NOT_CATALOGUED", f"Source {source_id!r} is absent from the catalogue.", "sourceCatalogueId")
        else:
            source_path = REPO_ROOT / source_record["path"]
            if not source_path.exists():
                add_issue(issues, "BLOCKER", "SOURCE_FILE_MISSING", f"Source file is missing: {source_record['path']}", "source")
            else:
                expected_hash = source.get("questionSha256") or source_record.get("sha256")
                if expected_hash:
                    actual_hash = file_hash_cache.setdefault(str(source_path), sha256(source_path))
                    if actual_hash != expected_hash or actual_hash != source_record.get("sha256"):
                        add_issue(issues, "BLOCKER", "SOURCE_HASH_MISMATCH", "Source bytes no longer match recorded provenance.", "source")
            pages = int(source_record.get("pdf", {}).get("pages") or 0)
            if not isinstance(source_page, int) or not 1 <= source_page <= pages:
                add_issue(issues, "BLOCKER", "SOURCE_PAGE_INVALID", f"Source page {source_page!r} is outside 1-{pages}.", "sourcePage")

        if answer_record is None:
            add_issue(issues, "BLOCKER", "ANSWER_SOURCE_NOT_CATALOGUED", f"Answer source {answer_source_id!r} is absent.", "answerSourceCatalogueId")
        elif answer_page is not None:
            answer_pages = int(answer_record.get("pdf", {}).get("pages") or 0)
            if not isinstance(answer_page, int) or not 1 <= answer_page <= answer_pages:
                add_issue(issues, "BLOCKER", "ANSWER_PAGE_INVALID", f"Answer page {answer_page!r} is outside 1-{answer_pages}.", "answerSourcePage")

        passage_id = item.get("passageId")
        passage = item.get("passage") or {}
        if item.get("contextRequired") and not passage_id:
            add_issue(issues, "BLOCKER", "PASSAGE_LINK_MISSING", "Context-dependent question has no passage ID.", "passageId")
        reviewable_context = str(
            passage.get("text")
            or item.get("passageText")
            or passage.get("directionsText")
            or item.get("directionsText")
            or ""
        ).strip()
        if passage_id and item.get("contextRequired") and not reviewable_context:
            add_issue(issues, "MAJOR", "PASSAGE_TEXT_MISSING", "Context-dependent item has no reviewable passage or directions.", "passageId")

        if not overlay:
            add_issue(issues, "BLOCKER", "ADAPTIVE_OVERLAY_MISSING", "Verified item has no adaptive overlay.", "adaptiveOverlay")
        else:
            if overlay.get("tutorModule") != module:
                add_issue(issues, "MAJOR", "MODULE_OVERLAY_CONFLICT", "Content and adaptive module labels disagree.", "tutorModule")
            if overlay.get("difficultyLevel") not in {1, 2, 3}:
                add_issue(issues, "MAJOR", "DIFFICULTY_UNRATED", "Difficulty prior is absent or invalid.", "difficultyLevel")
            if not overlay.get("skillId"):
                add_issue(issues, "MAJOR", "SKILL_MISSING", "Canonical skill is missing.", "skillId")
            eligibility = overlay.get("adaptiveEligibility", {})
            if not eligibility.get("eligible"):
                add_issue(issues, "MAJOR", "ADAPTIVE_INELIGIBLE", "Gold item is not adaptive-eligible.", "adaptiveEligibility")

        explanation = item.get("solution") or item.get("explanation") or ""
        if not explanation_is_substantive(explanation):
            add_issue(issues, "MINOR", "EXPLANATION_SHALLOW", "A short reasoning explanation is required.", "solution")

        fingerprint = "|".join([
            normalise_text(item.get("questionText") or ""),
            *[normalise_text(option) for option in options],
        ])
        if fingerprint.strip("|"):
            duplicate_groups[hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()].append(item_id)

        severities = Counter(issue["severity"] for issue in issues)
        status = "BLOCKED" if severities["BLOCKER"] else "REVIEW_REQUIRED" if issues else "PASS"
        audited.append({
            "id": item_id,
            "mockId": item.get("mockId"),
            "mockTitle": item.get("mockTitle"),
            "provider": item.get("provider"),
            "number": item.get("number"),
            "module": module,
            "skillId": overlay.get("skillId"),
            "difficultyLevel": overlay.get("difficultyLevel"),
            "difficultyLabel": overlay.get("difficultyLabel"),
            "status": status,
            "issues": issues,
            "source": {
                "sourceId": source_id,
                "path": source_record.get("path") if source_record else source.get("path"),
                "page": source_page,
                "sha256": source_record.get("sha256") if source_record else source.get("questionSha256"),
                "renderedImage": f"/review-assets/gold/{source_id}-p{source_page:04d}.jpg" if source_id and isinstance(source_page, int) else None,
            },
            "answerSource": {
                "sourceId": answer_source_id,
                "path": answer_record.get("path") if answer_record else source.get("answerPath"),
                "page": answer_page,
                "sha256": answer_record.get("sha256") if answer_record else source.get("answerSha256"),
                "renderedImage": f"/review-assets/gold/{answer_source_id}-p{answer_page:04d}.jpg" if answer_source_id and isinstance(answer_page, int) else None,
            },
            "content": {
                "passageId": passage_id,
                "passageText": passage.get("text") or item.get("passageText") or "",
                "directionsText": passage.get("directionsText") or item.get("directionsText") or "",
                "questionText": item.get("questionText"),
                "options": options,
                "correctOption": correct,
                "explanation": explanation,
            },
            "review": {
                "decision": "PENDING" if issues else "AUTO_AUDIT_PASS",
                "reviewer": None,
                "reviewedAt": None,
                "notes": "",
            },
        })

    duplicate_sets = [ids for ids in duplicate_groups.values() if len(ids) > 1]
    duplicate_ids = {item_id for group in duplicate_sets for item_id in group}
    for item in audited:
        if item["id"] in duplicate_ids:
            group = next(group for group in duplicate_sets if item["id"] in group)
            add_issue(item["issues"], "MAJOR", "EXACT_DUPLICATE_REVIEW", f"Exact content fingerprint matches: {', '.join(group)}.")
            if item["status"] == "PASS":
                item["status"] = "REVIEW_REQUIRED"
            item["review"]["decision"] = "PENDING"

    status_counts = Counter(item["status"] for item in audited)
    severity_counts = Counter(issue["severity"] for item in audited for issue in item["issues"])
    code_counts = Counter(issue["code"] for item in audited for issue in item["issues"])
    by_module = Counter(item["module"] for item in audited)
    by_mock = Counter(item["mockId"] for item in audited)
    substantive_explanations = sum(
        explanation_is_substantive(item["content"]["explanation"]) for item in audited
    )
    return {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "auditVersion": "gold-seed-audit-v1",
        "policy": {
            "candidateIsNotPublished": True,
            "blockersPreventPublication": True,
            "majorIssuesRequireAcademicReview": True,
            "minorExplanationDebtMayBeRepairedInBatch": True,
        },
        "summary": {
            "items": len(audited),
            "byStatus": dict(sorted(status_counts.items())),
            "bySeverity": dict(sorted(severity_counts.items())),
            "byIssueCode": dict(sorted(code_counts.items())),
            "byModule": dict(sorted(by_module.items())),
            "byMock": dict(sorted((str(key), value) for key, value in by_mock.items())),
            "substantiveExplanations": substantive_explanations,
            "explanationDebt": len(audited) - substantive_explanations,
            "exactDuplicateGroups": len(duplicate_sets),
        },
        "duplicateGroups": duplicate_sets,
        "items": audited,
    }


def write_markdown(report: dict, path: Path) -> None:
    summary = report["summary"]
    lines = [
        "# Existing 492-question gold-set audit",
        "",
        f"Generated: {report['generatedAt']}",
        "",
        "## Outcome",
        "",
        f"The seed contains **{summary['items']}** learner-eligible items. This audit separates correctness blockers, academic review issues and explanation debt; it does not equate prior staging status with final publication approval.",
        "",
        "| Measure | Count |",
        "|---|---:|",
        f"| Items audited | {summary['items']} |",
        f"| Blocked items | {summary['byStatus'].get('BLOCKED', 0)} |",
        f"| Review-required items | {summary['byStatus'].get('REVIEW_REQUIRED', 0)} |",
        f"| Audit-pass items | {summary['byStatus'].get('PASS', 0)} |",
        f"| Substantive explanations | {summary['substantiveExplanations']} |",
        f"| Explanation debt | {summary['explanationDebt']} |",
        f"| Exact duplicate groups | {summary['exactDuplicateGroups']} |",
        "",
        "## Module balance",
        "",
        "| Module | Items |",
        "|---|---:|",
    ]
    lines.extend(f"| {module} | {count} |" for module, count in summary["byModule"].items())
    lines.extend(["", "## Issue inventory", "", "| Issue | Count |", "|---|---:|"])
    lines.extend(f"| `{code}` | {count} |" for code, count in summary["byIssueCode"].items())
    lines.extend([
        "",
        "## Strengthening decision",
        "",
        "1. Blockers remain outside publication until corrected against rendered source evidence.",
        "2. Major issues require an explicit academic decision in the review workbench.",
        "3. Shallow answer-label solutions are retained as verified keys but queued for short explanations.",
        "4. Every reviewer edit must retain the original value, source region, reviewer and timestamp.",
        "5. The generated review queue is the working inventory; the adaptive bank is not edited directly.",
        "",
    ])
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    parser.add_argument("--queue-output", type=Path, default=QUEUE_PATH)
    parser.add_argument("--report-output", type=Path, default=REPORT_PATH)
    parser.add_argument("--strict", action="store_true", help="Exit non-zero when blocking issues exist.")
    args = parser.parse_args()

    report = audit()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.queue_output.parent.mkdir(parents=True, exist_ok=True)
    args.report_output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    queue = {
        "schemaVersion": 1,
        "generatedAt": report["generatedAt"],
        "auditVersion": report["auditVersion"],
        "summary": report["summary"],
        "items": report["items"],
    }
    args.queue_output.write_text(json.dumps(queue, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_markdown(report, args.report_output)
    print(json.dumps(report["summary"], indent=2))
    if args.strict and report["summary"]["byStatus"].get("BLOCKED", 0):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
