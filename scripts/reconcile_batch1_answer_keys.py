#!/usr/bin/env python3
"""Reconcile Batch 1 answer-key OCR with parsed questions and build a review queue."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from enrich_adaptive_item_bank import skill_tags
from parse_mock_question_candidates import estimate_difficulty


REPO_ROOT = Path(__file__).resolve().parents[1]
SELECTION_PATH = REPO_ROOT / "data/mock_review/batch_1_selection.json"
CANDIDATE_DIR = REPO_ROOT / "data/mock_ingestion/candidates"
PAGE_DIR = REPO_ROOT / "data/mock_ingestion/pages"
CATALOGUE_PATH = REPO_ROOT / "src/data/source_catalogue.json"
OUTPUT_PATH = REPO_ROOT / "data/mock_review/batch_1_key_reconciliation.json"
QUEUE_PATH = REPO_ROOT / "public/data/mock_batch_1_review_queue.json"
REPORT_PATH = REPO_ROOT / "docs/BATCH_1_ANSWER_KEY_RECONCILIATION_2026-08-03.md"
SUPPLEMENTAL_OCR_PATH = REPO_ROOT / "data/mock_review/batch_1_sparse_key_ocr.json"
EXPLANATION_OVERRIDES_PATH = REPO_ROOT / "data/mock_review/batch_1_explanation_overrides.json"
KEY_VISUAL_AUDITS_PATH = REPO_ROOT / "data/mock_review/batch_1_key_visual_audits.json"

ANSWER_HEADING = re.compile(r"(?im)^\s*(\d{1,3})\s*[.,)?]?\s*Answer\s*[:\-]?\s*\(?([A-D])\)?\b")
ANY_ANSWER_HEADING = re.compile(r"(?im)^\s*(?:(\d{1,3})\s*[.,)?]?\s*)?Answer\s*[:\-]?\s*\(?([A-D])\)?\b")
GRID_PAIR = re.compile(r"(?im)(?:^|\s)(\d{1,3})[.)]\s*([A-D])(?=\s|$)")
CORRECT_OPTION_PATTERNS = [
    re.compile(r"(?i)\boption\s*\(?([a-d])\)?\s+(?:is\s+)?correct(?:ly)?\b"),
    re.compile(r"(?i)(?<![A-Za-z])\(([a-d])\)\s+(?:is\s+)?correct(?:ly)?\b"),
    re.compile(r"(?i)\bcorrect\s*(?:option|answer)?\s*[:\-]?\s*\(?([a-d])\)?\b"),
]
HEADER_NOISE = re.compile(r"(?im)^.*(?:LAW PREP|ANSWER\s*&\s*EXPLANATIONS|www\.lawpreptutorial\.com).*$")


def load_review_candidate(source_id: str) -> dict:
    """Use the stronger verified staging parse when one already exists.

    Career Launcher Prime mocks were digitized with their layout-specific
    parser before the generic ingestion parser existed. Reusing that complete
    120-question artifact avoids replacing verified text with a weaker generic
    OCR parse while still sending every item through current key and review
    gates.
    """
    candidate_path = CANDIDATE_DIR / f"{source_id}.json"
    candidate = json.loads(candidate_path.read_text(encoding="utf-8"))
    staging_relative = candidate.get("verifiedStagingArtifact")
    if not staging_relative:
        return candidate
    staging_path = REPO_ROOT / staging_relative
    if not staging_path.is_file():
        return candidate
    staging = json.loads(staging_path.read_text(encoding="utf-8"))
    passages = {passage.get("id"): passage for passage in staging.get("passages", [])}
    converted = []
    for row in staging.get("questions", []):
        module = "GK" if row.get("module") == "CA" else row.get("module")
        passage = passages.get(row.get("passageId"), {})
        stimulus = str(passage.get("text") or "").strip()
        stem = str(row.get("questionText") or "").strip()
        # A few standalone critical-reasoning prompts were stored in the stem
        # because they do not share a passage. Split their final interrogative
        # so the source argument remains reviewable as stimulus evidence.
        if not stimulus and len(stem.split()) >= 50:
            split = re.search(
                r"\s+(?=(?:Which of the following|The argument (?:above )?(?:relies|depends))\b[^?]*\?\s*$)",
                stem,
                re.I,
            )
            if split:
                stimulus, stem = stem[:split.start()].strip(), stem[split.start():].strip()
        if not stimulus:
            stimulus = str(passage.get("directionsText") or "").strip()
        option_texts = [str(option).strip() for option in row.get("options", [])]
        options = [
            {"label": label, "text": text}
            for label, text in zip("abcd", option_texts)
        ]
        difficulty = estimate_difficulty(stem, options, stimulus, module)
        converted.append({
            "id": f"{source_id}-P{int(row.get('sourcePage') or 0):04d}-Q{int(row['number']):03d}",
            "sourceQuestionNumber": int(row["number"]),
            "page": int(row.get("sourcePage") or 0) or None,
            "module": module,
            "moduleSubtype": None,
            "classificationMethod": "verified_layout_specific_staging",
            "stimulus": stimulus or None,
            "stem": stem,
            "options": options,
            "correctOption": str(row.get("correctOption") or "").lower() or None,
            "answerStatus": "VISUALLY_TRANSCRIBED_STAGING_KEY",
            "difficulty": difficulty,
            "provenance": {
                "sourceId": source_id,
                "page": int(row.get("sourcePage") or 0) or None,
                "rawBlockSha256": None,
            },
            "validation": {
                "fourOptions": len(options) == 4,
                "nonEmptyStem": bool(stem),
                "nonEmptyOptions": len(options) == 4 and all(option["text"] for option in options),
                "requiresVisualReview": True,
            },
        })
    if len(converted) != 120:
        raise ValueError(f"Verified staging candidate {source_id} contains {len(converted)} questions; expected 120")
    return {**candidate, "questions": converted}


def clean_text(value: str) -> str:
    value = HEADER_NOISE.sub(" ", value or "")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def best_answer_page(base: dict, supplemental: dict | None) -> dict:
    if not supplemental:
        return base
    base_text = base.get("text") or ""
    supplemental_text = supplemental.get("text") or ""
    base_signals = len(ANY_ANSWER_HEADING.findall(base_text)) + len(GRID_PAIR.findall(base_text))
    supplemental_signals = len(ANY_ANSWER_HEADING.findall(supplemental_text)) + len(GRID_PAIR.findall(supplemental_text))
    if supplemental_signals > base_signals:
        return supplemental
    if supplemental_signals < base_signals:
        return base
    base_confidence = float(base.get("ocrConfidence") or 0)
    supplemental_confidence = float(supplemental.get("ocrConfidence") or 0)
    return supplemental if supplemental_confidence >= base_confidence else base


def corroborating_correct_options(block: str) -> list[str]:
    found = []
    for pattern in CORRECT_OPTION_PATTERNS:
        found.extend(match.upper() for match in pattern.findall(block))
    return found


def short_explanation(block: str, answer: str) -> str:
    raw = HEADER_NOISE.sub("", block or "")
    explanation_heading = re.search(r"(?is)\bExplanation\s*:\s*", raw)
    if explanation_heading:
        raw = raw[explanation_heading.end():]
    # Preserve line boundaries while locating authored option-analysis blocks.
    # This prevents a prose phrase such as "Option (a) captures the idea" from
    # being mistaken for the beginning of a new option section.
    option_marker = re.compile(
        r"(?im)^\s*(?:Option\s*)?(?:\(([a-d])\)|([a-d])[).:])"
        r"\s*(?:(?:Correct|Incorrect)\b\s*[:—-]?|[:—-])?\s+"
    )
    markers = list(option_marker.finditer(raw))
    if markers:
        matching_segment = ""
        for index, marker in enumerate(markers):
            end = markers[index + 1].start() if index + 1 < len(markers) else len(raw)
            marker_answer = (marker.group(1) or marker.group(2)).upper()
            if marker_answer == answer.upper():
                segment = raw[marker.end():end].strip()
                if re.search(
                    r"(?i)\b(correct|correctly|accurate|accurately|best|follows|directly|consistent|matches|reflects|supports|captures|shows|states|explains|demonstrates|indicates)\b",
                    segment,
                ):
                    matching_segment = segment
                    break
        # Some official solutions explain the correct answer first and only
        # label the subsequent distractors.  In that layout, the preamble is
        # the source-grounded correct explanation.
        if not matching_segment:
            preamble = raw[:markers[0].start()].strip()
            if len(re.findall(r"\b\w+\b", clean_text(preamble))) >= 8:
                matching_segment = preamble
        if not matching_segment:
            return ""
        text = clean_text(matching_segment)
    else:
        text = clean_text(raw)
    if re.search(r"(?i)^\s*(?:option\s*)?\(?[a-d]\)?\s+(?:is\s+)?incorrect\b", text):
        return ""
    text = re.sub(r"(?i)hence,?\s+option\s*\(?[a-d]\)?\s+is\s+(?:not\s+)?the\s+correct\s+answer\.?", "", text)
    text = re.sub(r"(?i)^(?:this\s+option\s+is\s+correct\s*(?:because|as)?\s*|correct\s*[:.]?\s*)", "", text).strip()
    text = re.sub(r"(?i)\s*difficulty\s+level\s*:.*$", "", text).strip()
    if re.match(r"(?i)^(?:reference|ref)\s+line\s*:", text):
        return ""
    if re.fullmatch(r"(?i)(?:is\s+)?(?:the\s+)?correct\s+answer\.?", text):
        return ""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    useful = " ".join(sentence for sentence in sentences[:2] if sentence).strip()
    if len(re.findall(r"\b\w+\b", useful)) < 8:
        return ""
    return useful[:500].rstrip()


def extract_page_evidence(cache: dict) -> dict[int, list[dict]]:
    evidence: defaultdict[int, list[dict]] = defaultdict(list)
    chunks = []
    spans = []
    cursor = 0
    for page in cache.get("pages", []):
        page_number = page["pageNumber"]
        text = page.get("text") or ""
        # On answer pages Tesseract regularly reads the digits 40 and 41 as
        # the letter pairs AO and Al.  Restrict repair to explicit numbered
        # Answer headings so prose is never changed.
        text = re.sub(r"(?im)^\s*AO(?=\s*[.,)]?\s*Answer\s*:)", "40", text)
        text = re.sub(r"(?im)^\s*A[lI](?=\s*[.,)]?\s*Answer\s*:)", "41", text)
        text = re.sub(r"(?im)^\s*4[lI1](?=\s*[.,)]?\s*Answer\b)", "41", text)
        text = re.sub(r"(?im)^\s*7A(?=\s*[.,)]?\s*Answer\b)", "74", text)
        text = re.sub(r"(?im)^\s*271(?=\s*[.,)]?\s*Answer\b)", "27", text)
        if (
            re.search(r"(?im)^\s*31\s*[.,)]?\s*Answer\b", text)
            and re.search(r"(?im)^\s*82\s*[.,)]?\s*Answer\b", text)
            and re.search(r"(?im)^\s*33\s*[.,)]?\s*Answer\b", text)
        ):
            text = re.sub(r"(?im)^\s*82(?=\s*[.,)]?\s*Answer\b)", "32", text)
        chunk = text + "\n"
        chunks.append(chunk)
        spans.append((cursor, cursor + len(chunk), page))
        cursor += len(chunk)
        if not ANY_ANSWER_HEADING.search(text) or page.get("method") == "native_text":
            for match in GRID_PAIR.finditer(text):
                number = int(match.group(1))
                if 1 <= number <= 120:
                    evidence[number].append({
                        "answer": match.group(2).upper(),
                        "page": page_number,
                        "method": "number_letter_grid",
                        "pageMethod": page.get("method"),
                        "ocrConfidence": page.get("ocrConfidence"),
                        "corroboratingCorrectOptions": [],
                        "explanation": "",
                    })
    document = "".join(chunks)
    raw_headings = list(ANY_ANSWER_HEADING.finditer(document))
    headings = []
    last_number = None
    for match in raw_headings:
        raw_number = int(match.group(1)) if match.group(1) else None
        method = "numbered_answer_heading"
        if raw_number is None:
            if last_number is None or last_number >= 120:
                continue
            number = last_number + 1
            method = "sequential_unnumbered_answer_heading"
        else:
            number = raw_number
            expected = (last_number + 1) if last_number is not None else None
            if expected and raw_number <= last_number and raw_number == expected % 10:
                number = expected
                method = "sequential_digit_loss_repair"
        if not 1 <= number <= 120:
            continue
        headings.append((match, number, method))
        last_number = number
    for index, (match, number, method) in enumerate(headings):
        answer = match.group(2).upper()
        end = headings[index + 1][0].start() if index + 1 < len(headings) else len(document)
        block = document[match.end():end]
        page = next((page for start, finish, page in spans if start <= match.start() < finish), {})
        corroboration = corroborating_correct_options(block)
        evidence[number].append({
            "answer": answer,
            "page": page.get("pageNumber"),
            "method": method,
            "pageMethod": page.get("method"),
            "ocrConfidence": page.get("ocrConfidence"),
            "corroboratingCorrectOptions": corroboration,
            "explanation": short_explanation(block, answer),
        })
    return evidence


def resolve_evidence(evidence: list[dict]) -> dict:
    if not evidence:
        return {"answer": None, "status": "KEY_EVIDENCE_MISSING", "evidence": [], "conflicts": {}}
    counts = Counter(item["answer"] for item in evidence)
    answer, count = counts.most_common(1)[0]
    tied = len(counts) > 1 and count == counts.most_common(2)[1][1]
    selected = [item for item in evidence if item["answer"] == answer]
    if tied:
        status = "KEY_CONFLICT_REVIEW_REQUIRED"
        answer = None
    else:
        high_quality = all(
            item["pageMethod"] == "native_text" or float(item.get("ocrConfidence") or 0) >= 90
            for item in selected
        )
        all_native = all(item["pageMethod"] == "native_text" for item in selected)
        if high_quality and all_native:
            status = "NATIVE_KEY_RECONCILED_PENDING_VISUAL_APPROVAL"
        elif high_quality:
            status = "OCR_RECONCILED_PENDING_VISUAL_APPROVAL"
        else:
            status = "LOW_CONFIDENCE_KEY_REVIEW_REQUIRED"
    return {
        "answer": answer,
        "status": status,
        "evidence": selected if answer else evidence,
        "conflicts": dict(sorted(counts.items())) if len(counts) > 1 else {},
    }


def merge_evidence_maps(*maps: dict[int, list[dict]]) -> dict[int, list[dict]]:
    merged: defaultdict[int, dict[tuple, dict]] = defaultdict(dict)
    for evidence_map in maps:
        for number, records in evidence_map.items():
            for record in records:
                identity = (record.get("answer"), record.get("page"), record.get("method"))
                existing = merged[number].get(identity)
                record_score = (bool(record.get("explanation")), float(record.get("ocrConfidence") or 0))
                existing_score = (
                    bool((existing or {}).get("explanation")),
                    float((existing or {}).get("ocrConfidence") or 0),
                )
                if existing is None or record_score > existing_score:
                    merged[number][identity] = record
    return {number: list(records.values()) for number, records in merged.items()}


def build(batch_number: int = 1) -> tuple[dict, dict]:
    selection_path = REPO_ROOT / f"data/mock_review/batch_{batch_number}_selection.json"
    supplemental_ocr_path = REPO_ROOT / f"data/mock_review/batch_{batch_number}_sparse_key_ocr.json"
    explanation_overrides_path = REPO_ROOT / f"data/mock_review/batch_{batch_number}_explanation_overrides.json"
    key_visual_audits_path = REPO_ROOT / f"data/mock_review/batch_{batch_number}_key_visual_audits.json"
    selection = json.loads(selection_path.read_text(encoding="utf-8"))
    catalogue = json.loads(CATALOGUE_PATH.read_text(encoding="utf-8"))
    sources = {source["id"]: source for source in catalogue["sources"]}
    supplemental_pages = defaultdict(dict)
    if supplemental_ocr_path.exists():
        supplemental = json.loads(supplemental_ocr_path.read_text(encoding="utf-8"))
        for page in supplemental.get("pages", []):
            supplemental_pages[page["sourceId"]][page["pageNumber"]] = page
    explanation_overrides = {}
    if explanation_overrides_path.exists():
        override_payload = json.loads(explanation_overrides_path.read_text(encoding="utf-8"))
        explanation_overrides = {item["itemId"]: item for item in override_payload.get("items", [])}
    visual_audits = {}
    visual_audits_by_number = {}
    if key_visual_audits_path.exists():
        audit_payload = json.loads(key_visual_audits_path.read_text(encoding="utf-8"))
        for audit in audit_payload.get("pages", []):
            for number, answer in audit.get("answers", {}).items():
                visual_audits[(audit["sourceId"], audit["page"], int(number))] = {**audit, "answer": answer}
                visual_audits_by_number[(audit["sourceId"], int(number))] = {**audit, "answer": answer}
        # A source run records a complete, sequential key after every rendered
        # answer page has been inspected. Per-question evidence retains the
        # page already found by OCR; a narrower range can override omissions.
        for audit in audit_payload.get("sourceRuns", []):
            start = int(audit["start"])
            answers = str(audit.get("answers") or "").upper()
            for offset, answer in enumerate(answers):
                if answer not in "ABCD":
                    raise ValueError(f"Invalid visual-audit answer {answer!r}")
                number = start + offset
                visual_audits_by_number[(audit["sourceId"], number)] = {**audit, "answer": answer}
        # Compact range records keep previously reviewed answer grids
        # auditable without duplicating hundreds of number/value properties.
        for audit in audit_payload.get("ranges", []):
            start = int(audit["start"])
            answers = str(audit.get("answers") or "").upper()
            for offset, answer in enumerate(answers):
                if answer not in "ABCD":
                    raise ValueError(f"Invalid visual-audit answer {answer!r}")
                number = start + offset
                visual_audits[(audit["sourceId"], audit["page"], number)] = {**audit, "answer": answer}
                visual_audits_by_number[(audit["sourceId"], number)] = {**audit, "answer": answer}
    queue_items = []
    source_reports = []

    for selected in selection["selected"]:
        source_id = selected["sourceId"]
        key_source_ids = selected.get("answerKeySourceIds") or []
        key_source_id = key_source_ids[0] if key_source_ids else None
        candidate = load_review_candidate(source_id)
        key_cache = (
            json.loads((PAGE_DIR / f"{key_source_id}.json").read_text(encoding="utf-8"))
            if key_source_id else {"pages": []}
        )
        base_evidence_map = extract_page_evidence(key_cache) if key_source_id else {}
        if key_source_id and supplemental_pages.get(key_source_id):
            key_cache["pages"] = [
                best_answer_page(page, supplemental_pages[key_source_id].get(page["pageNumber"]))
                for page in key_cache.get("pages", [])
            ]
        question_cache = json.loads((PAGE_DIR / f"{source_id}.json").read_text(encoding="utf-8"))
        page_by_number = {page["pageNumber"]: page for page in question_cache.get("pages", [])}
        question_by_number = {question["sourceQuestionNumber"]: question for question in candidate.get("questions", [])}
        evidence_map = merge_evidence_maps(base_evidence_map, extract_page_evidence(key_cache))
        statuses = Counter()
        reconciled = 0
        structurally_complete = 0

        for number in range(1, 121):
            item_id = f"{selection['batchId']}-{source_id}-Q{number:03d}"
            question = question_by_number.get(number)
            resolution = resolve_evidence(evidence_map.get(number, []))
            if not key_source_id:
                resolution["status"] = "ANSWER_KEY_SOURCE_MISSING"
            resolution_page = resolution["evidence"][0].get("page") if resolution.get("evidence") else None
            visual_audit = (
                visual_audits.get((key_source_id, resolution_page, number))
                or visual_audits_by_number.get((key_source_id, number))
            )
            if visual_audit:
                resolution["answer"] = visual_audit.get("answer")
                resolution["status"] = "VISUAL_AUDIT_RECONCILED_PENDING_ACADEMIC_APPROVAL"
                resolution["evidence"] = [
                    item for item in resolution.get("evidence", [])
                    if item.get("answer") == visual_audit.get("answer")
                ] or [{
                    "answer": visual_audit.get("answer"),
                    "page": visual_audit.get("page") or resolution_page,
                    "method": "implementation_visual_audit",
                    "pageMethod": "rendered_page",
                    "ocrConfidence": None,
                    "corroboratingCorrectOptions": [],
                    "explanation": "",
                }]
                resolution["visualAudit"] = {
                    "auditor": visual_audit.get("auditor"),
                    "auditedAt": visual_audit.get("auditedAt"),
                    "sourceSha256": visual_audit.get("sourceSha256"),
                }
            issues = []
            if question is None:
                issues.append({"severity": "BLOCKER", "code": "QUESTION_NOT_PARSED", "message": "Question number is missing from parser output."})
            else:
                if not question.get("validation", {}).get("fourOptions"):
                    issues.append({"severity": "BLOCKER", "code": "OPTION_SET_REPAIR", "message": "Exactly four ordered options were not parsed."})
                elif not question.get("validation", {}).get("nonEmptyOptions"):
                    issues.append({"severity": "BLOCKER", "code": "OPTION_TEXT_REPAIR", "message": "One or more option texts are empty."})
                else:
                    structurally_complete += 1
            if resolution["answer"] is None:
                message = (
                    "Official answer key has not been supplied for this mock."
                    if resolution["status"] == "ANSWER_KEY_SOURCE_MISSING"
                    else "Official answer needs source-page review."
                )
                issues.append({"severity": "BLOCKER", "code": resolution["status"], "message": message})
            elif resolution["status"] == "LOW_CONFIDENCE_KEY_REVIEW_REQUIRED":
                issues.append({"severity": "BLOCKER", "code": resolution["status"], "message": "Official answer was found on a low-confidence OCR page and requires transcription review."})
            elif (
                question and question.get("correctOption")
                and question["correctOption"].upper() != resolution["answer"]
                and resolution["status"] != "VISUAL_AUDIT_RECONCILED_PENDING_ACADEMIC_APPROVAL"
            ):
                issues.append({"severity": "BLOCKER", "code": "PARSER_KEY_CONFLICT", "message": "Question candidate and independently re-parsed key disagree."})
            else:
                reconciled += 1
            if question and question.get("validation", {}).get("requiresVisualReview"):
                issues.append({"severity": "MAJOR", "code": "QUESTION_PAGE_VISUAL_REVIEW", "message": "Question page was OCR-routed or contains visual-risk signals."})
            if resolution["status"] in {"OCR_RECONCILED_PENDING_VISUAL_APPROVAL", "NATIVE_KEY_RECONCILED_PENDING_VISUAL_APPROVAL"}:
                issues.append({"severity": "MAJOR", "code": "KEY_VISUAL_APPROVAL_PENDING", "message": "Extracted key agrees structurally but the rendered key page still needs approval."})
            elif resolution["status"] == "VISUAL_AUDIT_RECONCILED_PENDING_ACADEMIC_APPROVAL":
                issues.append({"severity": "MAJOR", "code": "KEY_ACADEMIC_APPROVAL_PENDING", "message": "Rendered key evidence was visually reconciled; named academic approval remains required."})

            evidence = resolution["evidence"][0] if resolution["evidence"] else {}
            explanation = evidence.get("explanation") or ""
            if len(explanation.split()) < 8:
                explanation = ""
            explanation_provenance = {
                "kind": "OFFICIAL_SOURCE_EXTRACT",
                "sourceId": key_source_id,
                "page": evidence.get("page"),
                "reviewStatus": "PENDING",
            } if explanation else None
            override = explanation_overrides.get(item_id)
            if not explanation and override and override.get("correctOption") == resolution.get("answer"):
                explanation = str(override.get("explanation") or "").strip()
                explanation_provenance = {
                    "kind": override.get("kind", "AUTHORED_DRAFT"),
                    "sourceId": override.get("sourceId"),
                    "page": override.get("sourcePage"),
                    "reviewStatus": "DRAFT_REVIEW_REQUIRED",
                }
                issues.append({"severity": "MAJOR", "code": "EXPLANATION_DRAFT_REVIEW_REQUIRED", "message": "A source-grounded draft explanation was added and requires academic approval."})
            if not explanation:
                issues.append({"severity": "BLOCKER", "code": "EXPLANATION_REQUIRED", "message": "A safe short explanation could not be isolated from the official source."})
            answer_page = evidence.get("page")
            source_page = question.get("page") if question else None
            answer_record = sources.get(key_source_id, {})
            source_record = sources.get(source_id, {})
            options = [option.get("text", "") for option in (question or {}).get("options", [])]
            adaptive_skill = None
            if question and question.get("module"):
                adaptive_skill = skill_tags(
                    question["module"],
                    question.get("stem") or "",
                    question.get("stimulus") or "",
                    options,
                )
            queue_items.append({
                "id": item_id,
                "batchId": selection["batchId"],
                "mockId": source_id,
                "mockTitle": Path(selected["path"]).stem,
                "provider": selected["provider"],
                "number": number,
                "module": (question or {}).get("module"),
                "status": "BLOCKED" if any(issue["severity"] == "BLOCKER" for issue in issues) else "REVIEW_REQUIRED",
                "issues": issues,
                "source": {
                    "sourceId": source_id,
                    "path": source_record.get("path", selected["path"]),
                    "page": source_page,
                    "sha256": source_record.get("sha256"),
                    "renderedImage": f"/review-assets/batch-{batch_number}/{source_id}-p{source_page:04d}.jpg" if isinstance(source_page, int) else None,
                    "extractionMethod": page_by_number.get(source_page, {}).get("method") if source_page else None,
                },
                "answerSource": {
                    "sourceId": key_source_id,
                    "path": answer_record.get("path"),
                    "page": answer_page,
                    "sha256": answer_record.get("sha256"),
                    "renderedImage": f"/review-assets/batch-{batch_number}/{key_source_id}-p{answer_page:04d}.jpg" if isinstance(answer_page, int) else None,
                    "extractionMethod": evidence.get("pageMethod"),
                    "ocrConfidence": evidence.get("ocrConfidence"),
                },
                "content": {
                    "passageId": None,
                    "passageText": (question or {}).get("stimulus") or "",
                    "directionsText": "",
                    "questionText": (question or {}).get("stem") or "",
                    "options": options,
                    "correctOption": resolution["answer"] or "",
                    "explanation": explanation,
                },
                "explanationProvenance": explanation_provenance,
                "keyReconciliation": resolution,
                "difficultyLevel": (question or {}).get("difficulty", {}).get("level"),
                "skillId": adaptive_skill.get("primarySkillId") if adaptive_skill else None,
                "skillClassification": adaptive_skill,
                "review": {"decision": "PENDING", "reviewer": None, "reviewedAt": None, "notes": ""},
            })
            statuses[resolution["status"]] += 1

        source_reports.append({
            **selected,
            "expectedQuestions": 120,
            "directKeyEvidence": sum(1 for number in range(1, 121) if evidence_map.get(number)),
            "reconciledAnswers": reconciled,
            "structurallyComplete": structurally_complete,
            "statusCounts": dict(sorted(statuses.items())),
            "status": "REVIEW_QUEUE_READY" if key_source_id else "QUESTION_REVIEW_QUEUE_READY_KEY_PENDING",
        })

    issue_counts = Counter(issue["code"] for item in queue_items for issue in item["issues"])
    status_counts = Counter(item["status"] for item in queue_items)
    report = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "batchId": selection["batchId"],
        "status": (
            "KEY_RECONCILIATION_COMPLETE_REVIEW_PENDING"
            if all(item.get("answerKeySourceIds") for item in selection["selected"])
            else "QUESTION_DIGITIZATION_COMPLETE_KEY_ACQUISITION_PENDING"
        ),
        "summary": {
            "sources": len(source_reports),
            "expectedQuestions": len(source_reports) * 120,
            "reconciledAnswers": sum(item["reconciledAnswers"] for item in source_reports),
            "structurallyComplete": sum(item["structurallyComplete"] for item in source_reports),
            "byQueueStatus": dict(sorted(status_counts.items())),
            "byIssueCode": dict(sorted(issue_counts.items())),
        },
        "sources": source_reports,
    }
    queue = {
        "schemaVersion": 1,
        "generatedAt": report["generatedAt"],
        "auditVersion": f"batch-{batch_number}-key-reconciliation-v1",
        "batchId": selection["batchId"],
        "summary": {
            "items": len(queue_items),
            "byStatus": dict(sorted(status_counts.items())),
            "explanationDebt": sum(not item["content"]["explanation"] for item in queue_items),
            **report["summary"],
        },
        "items": queue_items,
    }
    return report, queue


def write_markdown(report: dict, path: Path) -> None:
    summary = report["summary"]
    batch_number = int(report["batchId"].rsplit("-", 1)[-1])
    lines = [
        f"# Batch {batch_number} answer-key OCR reconciliation",
        "",
        f"Batch: `{report['batchId']}`  ",
        f"Generated: {report['generatedAt']}",
        "",
        "## Outcome",
        "",
        f"Official answer evidence was re-parsed for five mocks. {summary['reconciledAnswers']} of {summary['expectedQuestions']} expected answers have deterministic OCR/native-text reconciliation; rendered visual approval remains mandatory before publication.",
        "",
        "| Source | Direct key evidence | Reconciled | Structurally complete | State |",
        "|---|---:|---:|---:|---|",
    ]
    for source in report["sources"]:
        lines.append(f"| `{source['sourceId']}` | {source['directKeyEvidence']} | {source['reconciledAnswers']} | {source['structurallyComplete']} | {source['status']} |")
    lines.extend(["", "## Review issues", "", "| Issue | Count |", "|---|---:|"])
    lines.extend(f"| `{code}` | {count} |" for code, count in summary["byIssueCode"].items())
    lines.extend([
        "",
        "## Publication rule",
        "",
        f"OCR reconciliation is evidence preparation, not academic approval. Any missing question, option defect, key conflict or unapproved rendered key page blocks that item from Batch {batch_number} publication.",
        "",
    ])
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-number", type=int, default=1)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--queue-output", type=Path)
    parser.add_argument("--report-output", type=Path)
    args = parser.parse_args()
    report, queue = build(args.batch_number)
    output = args.output or (REPO_ROOT / f"data/mock_review/batch_{args.batch_number}_key_reconciliation.json")
    queue_output = args.queue_output or (REPO_ROOT / f"public/data/mock_batch_{args.batch_number}_review_queue.json")
    report_output = args.report_output or (REPO_ROOT / f"docs/BATCH_{args.batch_number}_ANSWER_KEY_RECONCILIATION_2026-08-03.md")
    output.parent.mkdir(parents=True, exist_ok=True)
    queue_output.parent.mkdir(parents=True, exist_ok=True)
    report_output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    queue_output.write_text(json.dumps(queue, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_markdown(report, report_output)
    print(json.dumps({"batchId": report["batchId"], **report["summary"]}, indent=2))


if __name__ == "__main__":
    main()
