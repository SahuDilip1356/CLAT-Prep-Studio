#!/usr/bin/env python3
"""Validate provenance and structural integrity of staged digitized mocks."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate(repo_root: Path, mock_path: Path) -> list[str]:
    errors: list[str] = []
    data = json.loads(mock_path.read_text(encoding="utf-8"))
    questions = data.get("questions", [])
    passages = data.get("passages", [])
    source = data.get("source", {})

    expected_count = data.get("mock", {}).get("questionCount")
    if expected_count != len(questions):
        errors.append(f"questionCount is {expected_count}; found {len(questions)} questions")

    numbers = [question.get("number") for question in questions]
    if numbers != list(range(1, len(questions) + 1)):
        errors.append("question numbers are not a complete sequential range starting at 1")

    ids = [question.get("id") for question in questions]
    if len(ids) != len(set(ids)):
        errors.append("question IDs are not unique")

    passage_ids = {passage.get("id") for passage in passages}
    if None in passage_ids or len(passage_ids) != len(passages):
        errors.append("passage IDs are missing or duplicated")

    passage_by_id = {passage.get("id"): passage for passage in passages}
    assigned_by_passage: dict[str, list[int]] = {passage_id: [] for passage_id in passage_ids}
    metadata_pattern = re.compile(r"(?:Directions? for questions|Passage\s*[–—-]\s*\d+)", re.I)

    for question in questions:
        label = f"Q{question.get('number', '?')}"
        if question.get("questionType") == "MCQ":
            if len(question.get("options", [])) != 4:
                errors.append(f"{label} does not have exactly four options")
            if question.get("correctOption") not in {"A", "B", "C", "D"}:
                errors.append(f"{label} has an invalid or missing correctOption")
        if question.get("passageId") not in passage_ids:
            errors.append(f"{label} references an unknown passageId")
        else:
            passage_id = question["passageId"]
            assigned_by_passage[passage_id].append(question.get("number"))
            passage = passage_by_id[passage_id]
            if "passageText" in question and question.get("passageText", "") != passage.get("text", ""):
                errors.append(f"{label} passageText disagrees with its passage record")
        if not question.get("questionText"):
            errors.append(f"{label} has no questionText")
        if not question.get("solution"):
            errors.append(f"{label} has no solution")
        if not isinstance(question.get("sourcePage"), int):
            errors.append(f"{label} has no integer sourcePage")
        if question.get("answerKeyRaw") != question.get("correctOption"):
            errors.append(f"{label} answerKeyRaw disagrees with correctOption")
        for option_index, option in enumerate(question.get("options", []), start=1):
            if metadata_pattern.search(option):
                errors.append(f"{label} option {option_index} contains passage/directions metadata")

    for passage_id, assigned_numbers in assigned_by_passage.items():
        declared = passage_by_id[passage_id].get("questionNumbers", [])
        if declared != assigned_numbers:
            errors.append(f"{passage_id} questionNumbers disagree with question records")

    expected_section_counts = data.get("mock", {}).get("sectionCounts")
    if expected_section_counts:
        actual_section_counts = {}
        for question in questions:
            section = question.get("section")
            actual_section_counts[section] = actual_section_counts.get(section, 0) + 1
        if expected_section_counts != actual_section_counts:
            errors.append("mock sectionCounts disagree with question records")

    question_catalogue_id = source.get("catalogueId") or source.get("questionCatalogueId")
    question_hash = source.get("sha256") or source.get("questionSha256")
    source_path = repo_root / source.get("path", "")
    if not source_path.is_file():
        errors.append(f"source PDF does not exist: {source_path}")
    elif question_hash != sha256_file(source_path):
        errors.append("source PDF SHA-256 does not match the staged mock")

    catalogue_path = repo_root / "src/data/source_catalogue.json"
    if catalogue_path.is_file():
        catalogue = json.loads(catalogue_path.read_text(encoding="utf-8"))
        records_by_id = {item.get("id"): item for item in catalogue.get("sources", [])}
        source_record = records_by_id.get(question_catalogue_id)
        if not source_record:
            errors.append("source catalogue ID is missing from source_catalogue.json")
        elif source_record.get("sha256") != question_hash:
            errors.append("source catalogue hash disagrees with the staged mock hash")
        elif any(
            isinstance(question.get("sourcePage"), int)
            and question["sourcePage"] > (source_record.get("pdf", {}).get("pages") or 0)
            for question in questions
        ):
            errors.append("a question sourcePage exceeds the source PDF page count")

        answer_catalogue_id = source.get("answerCatalogueId")
        if answer_catalogue_id:
            answer_record = records_by_id.get(answer_catalogue_id)
            answer_path = repo_root / source.get("answerPath", "")
            if not answer_record:
                errors.append("answer catalogue ID is missing from source_catalogue.json")
            elif not answer_path.is_file():
                errors.append(f"answer PDF does not exist: {answer_path}")
            elif source.get("answerSha256") != sha256_file(answer_path):
                errors.append("answer PDF SHA-256 does not match the staged mock")
            elif answer_record.get("sha256") != source.get("answerSha256"):
                errors.append("answer catalogue hash disagrees with the staged mock hash")
            elif any(
                not isinstance(question.get("answerSourcePage"), int)
                or question["answerSourcePage"] > (answer_record.get("pdf", {}).get("pages") or 0)
                for question in questions
            ):
                errors.append("an answerSourcePage is missing or exceeds the answer PDF page count")

    return errors


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="*", type=Path)
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    repo_root = args.repo_root.resolve()
    if args.paths:
        paths = args.paths
    else:
        paths = []
        for candidate in sorted((repo_root / "src/data/staging").glob("**/*.json")):
            try:
                candidate_data = json.loads(candidate.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            if "mock" in candidate_data and "questions" in candidate_data:
                paths.append(candidate)

    failed = False
    for path in paths:
        absolute_path = path if path.is_absolute() else repo_root / path
        errors = validate(repo_root, absolute_path)
        if errors:
            failed = True
            print(f"FAIL {absolute_path.relative_to(repo_root)}")
            for error in errors:
                print(f"  - {error}")
        else:
            print(f"PASS {absolute_path.relative_to(repo_root)}")

    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
