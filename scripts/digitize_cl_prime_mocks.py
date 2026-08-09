#!/usr/bin/env python3
"""Digitize text-readable Career Launcher Prime mocks into staged JSON.

Answer keys are deliberately loaded from a separately reviewed transcription
file. This parser never guesses an answer from question text.
"""

from __future__ import annotations

import bisect
import json
import re
import subprocess
from pathlib import Path


MOCKS = [
    {
        "mockId": "cl-prime-2027-10",
        "title": "Career Launcher Prime Mock CLAT 10 (2027)",
        "questionSourceId": "SRC-0093",
        "answerSourceId": "SRC-0092",
        "path": "CLAT Mock Papers/CL • CLAT 2027  Prime MOCK 10 @CLAT_OWNER.pdf",
        "passageReplacements": {
            "The table below shows the weight ranges (in kg) for each of the 8 mango grades.": (
                "The weight ranges (in kg) are: G1 1–5, G2 6–10, G3 11–15, "
                "G4 16–20, G5 21–25, G6 26–30, G7 31–35, and G8 36–40."
            ),
        },
        "sectionRanges": [
            (1, 24, "English Language", "ENGLISH"),
            (25, 52, "Current Affairs including General Knowledge", "CA"),
            (53, 82, "Legal Reasoning", "LEGAL"),
            (83, 108, "Logical Reasoning", "LOGICAL"),
            (109, 120, "Quantitative Techniques", "QUANT"),
        ],
    },
    {
        "mockId": "cl-prime-2027-11",
        "title": "Career Launcher Prime Mock CLAT 11 (2027)",
        "questionSourceId": "SRC-0099",
        "answerSourceId": "SRC-0098",
        "path": "CLAT Mock Papers/CL • Prime MOCK 11 @CLAT_OWNER.pdf",
        "sectionRanges": [
            (1, 24, "English Language", "ENGLISH"),
            (25, 52, "Current Affairs including General Knowledge", "CA"),
            (53, 82, "Legal Reasoning", "LEGAL"),
            (83, 108, "Logical Reasoning", "LOGICAL"),
            (109, 120, "Quantitative Techniques", "QUANT"),
        ],
    },
    {
        "mockId": "cl-prime-2027-13",
        "title": "Career Launcher Prime Mock CLAT 13 (2027)",
        "questionSourceId": "SRC-0101",
        "answerSourceId": "SRC-0100",
        "path": "CLAT Mock Papers/CL • Prime MOCK 13 @CLAT_OWNER.pdf",
        "sectionRanges": [
            (1, 12, "Quantitative Techniques", "QUANT"),
            (13, 42, "Legal Reasoning", "LEGAL"),
            (43, 68, "Logical Reasoning", "LOGICAL"),
            (69, 92, "English Language", "ENGLISH"),
            (93, 120, "Current Affairs including General Knowledge", "CA"),
        ],
    },
    {
        "mockId": "cl-prime-2027-14",
        "title": "Career Launcher Prime Mock CLAT 14 (2027)",
        "questionSourceId": "SRC-0103",
        "answerSourceId": "SRC-0102",
        "path": "CLAT Mock Papers/CL • Prime MOCK 14 @CLAT_OWNER.pdf",
        "passageReplacements": {
            "Similarly there was a total reduction of in the diesel consumption": (
                "Similarly there was a total reduction of 16⅔% in the diesel consumption"
            ),
        },
        "sectionRanges": [
            (1, 24, "English Language", "ENGLISH"),
            (25, 52, "Current Affairs including General Knowledge", "CA"),
            (53, 82, "Legal Reasoning", "LEGAL"),
            (83, 108, "Logical Reasoning", "LOGICAL"),
            (109, 120, "Quantitative Techniques", "QUANT"),
        ],
    },
]

QUESTION_MARKER = re.compile(r"(?m)^(?:\f)?[ \t]*Q[ \t]*(\d{1,3})\.[ \t]*")
OPTION_MARKER = re.compile(r"(?m)^(?:\f)?[ \t]*\(?([a-dA-D])\)[ \t]*")
PREFACE_MARKER = re.compile(
    r"(?m)^(?:\f)?[ \t]*(?=(?:Directions?|For questions|Passage[ \t]*[–—-]?[ \t]*\d+)\b)"
)


def extract_pdf_text(path: Path) -> str:
    completed = subprocess.run(
        ["pdftotext", "-layout", str(path), "-"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        errors="replace",
    )
    return completed.stdout


def clean_lines(value: str) -> str:
    noise = re.compile(
        r"^(?:Prime Mock CLAT|Career Launcher|Page[ \t]+\d+|©[ \t]*LST|Scanned with|MCT-[0-9/]+)",
        re.IGNORECASE,
    )
    kept = []
    for line in value.replace("\f", "\n").splitlines():
        stripped = line.strip()
        if noise.match(stripped):
            continue
        kept.append(stripped)
    value = "\n".join(kept)
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def prose(value: str) -> str:
    return re.sub(r"\s+", " ", clean_lines(value)).strip()


def parse_preface(value: str) -> tuple[str, str]:
    value = clean_lines(value)
    marker_matches = list(
        re.finditer(r"(?m)^(?:Directions?|For questions)\b.*$", value, re.IGNORECASE)
    )
    if marker_matches:
        marker = marker_matches[-1]
        after = value[marker.start():]
        parts = re.split(r"\n\s*\n", after, maxsplit=1)
        directions = prose(parts[0])
        passage = parts[1] if len(parts) > 1 else ""
    else:
        directions = "Read the shared source material and answer the questions that follow."
        passage = value
    passage = re.sub(
        r"(?im)^Passage[ \t]*[–—-]?[ \t]*\d+[ \t]*$", "", passage
    )
    return directions, prose(passage)


def section_for(number: int, ranges: list[tuple[int, int, str, str]]) -> tuple[str, str]:
    for start, end, section, module in ranges:
        if start <= number <= end:
            return section, module
    raise ValueError(f"No section configured for question {number}")


def topic_for(section: str) -> str:
    return {
        "English Language": "Passage-based English",
        "Current Affairs including General Knowledge": "Current Affairs and General Knowledge",
        "Legal Reasoning": "Passage-based Legal Reasoning",
        "Logical Reasoning": "Passage-based Logical Reasoning",
        "Quantitative Techniques": "Data Interpretation and Quantitative Techniques",
    }[section]


def apply_passage_replacements(value: str, config: dict) -> str:
    for original, replacement in config.get("passageReplacements", {}).items():
        value = value.replace(original, replacement)
    return value


def load_answers(path: Path) -> dict[str, dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    result = {}
    for entry in data["answerKeys"]:
        answers = {}
        for group in entry["answersByRange"]:
            expected = group["end"] - group["start"] + 1
            if len(group["answers"]) != expected:
                raise ValueError(
                    f"{entry['mockId']} range {group['start']}-{group['end']} has "
                    f"{len(group['answers'])} answers; expected {expected}"
                )
            for offset, answer in enumerate(group["answers"]):
                if answer not in "ABCD":
                    raise ValueError(f"Invalid answer {answer} in {entry['mockId']}")
                answers[group["start"] + offset] = answer
        if sorted(answers) != list(range(1, 121)):
            raise ValueError(f"{entry['mockId']} does not contain answers 1-120")
        result[entry["mockId"]] = {**entry, "answers": answers}
    return result


def page_starts(text: str) -> list[int]:
    starts = [0]
    starts.extend(match.end() for match in re.finditer("\f", text))
    return starts


def answer_source_page(mock_id: str, number: int) -> int:
    if mock_id != "cl-prime-2027-10":
        return 1
    ranges = ((1, 11, 1), (12, 18, 2), (19, 34, 3), (35, 58, 4),
              (59, 78, 5), (79, 95, 6), (96, 111, 7), (112, 120, 8))
    return next(page for start, end, page in ranges if start <= number <= end)


def parse_mock(
    repo_root: Path,
    config: dict,
    answer_entry: dict,
    source_records: dict[str, dict],
) -> dict:
    source_path = repo_root / config["path"]
    text = extract_pdf_text(source_path)
    markers = list(QUESTION_MARKER.finditer(text))
    numbers = [int(marker.group(1)) for marker in markers]
    if numbers != list(range(1, 121)):
        raise ValueError(f"{config['mockId']} question markers are incomplete: {numbers}")

    starts = page_starts(text)
    current_preface = text[:markers[0].start()]
    current_passage_id = None
    current_passage_text = ""
    current_directions = ""
    passages = []
    questions = []

    for index, marker in enumerate(markers):
        number = int(marker.group(1))
        end = markers[index + 1].start() if index + 1 < len(markers) else len(text)
        segment = text[marker.end():end]
        option_markers = list(OPTION_MARKER.finditer(segment))
        if len(option_markers) < 4:
            raise ValueError(
                f"{config['mockId']} Q{number} has {len(option_markers)} option markers"
            )
        option_markers = option_markers[:4]
        if [item.group(1).lower() for item in option_markers] != list("abcd"):
            raise ValueError(f"{config['mockId']} Q{number} option order is invalid")

        trailing_start = option_markers[3].end()
        trailing_match = PREFACE_MARKER.search(segment, trailing_start)
        question_segment_end = trailing_match.start() if trailing_match else len(segment)
        next_preface = segment[trailing_match.start():] if trailing_match else ""

        if prose(current_preface):
            new_directions, new_passage_text = parse_preface(current_preface)
            new_passage_text = apply_passage_replacements(new_passage_text, config)
            if not (
                passages
                and new_directions == current_directions
                and new_passage_text == current_passage_text
            ):
                current_directions = new_directions
                current_passage_text = new_passage_text
                current_passage_id = f"{config['mockId']}-p{len(passages) + 1:02d}"
                passages.append({
                    "id": current_passage_id,
                    "stimulusType": "passage" if current_passage_text else "directions",
                    "directionsText": current_directions,
                    "text": current_passage_text,
                    "questionNumbers": [],
                })
        if current_passage_id is None:
            raise ValueError(f"{config['mockId']} Q{number} has no passage or directions")

        question_text = prose(segment[:option_markers[0].start()])
        options = []
        for option_index, option_marker in enumerate(option_markers):
            option_end = (
                option_markers[option_index + 1].start()
                if option_index < 3
                else question_segment_end
            )
            options.append(prose(segment[option_marker.end():option_end]))
        if not question_text or any(not option for option in options):
            raise ValueError(f"{config['mockId']} Q{number} has empty text or option")

        section, module = section_for(number, config["sectionRanges"])
        source_page = bisect.bisect_right(starts, marker.start())
        answer = answer_entry["answers"][number]
        passages[-1]["questionNumbers"].append(number)
        questions.append({
            "id": f"{config['mockId']}-q{number:03d}",
            "mockId": config["mockId"],
            "number": number,
            "section": section,
            "module": module,
            "category": section,
            "topic": topic_for(section),
            "difficultyLevel": None,
            "difficultyLabel": "Unrated",
            "questionType": "MCQ",
            "questionText": question_text,
            "directionsText": current_directions,
            "passageId": current_passage_id,
            "passageText": current_passage_text,
            "stimulusType": "passage" if current_passage_text else "directions",
            "contextRequired": bool(current_passage_text),
            "sourceCatalogueId": config["questionSourceId"],
            "sourcePage": source_page,
            "sourceQuestionNo": number,
            "options": options,
            "correctOption": answer,
            "answerKeyRaw": answer,
            "answerSourceCatalogueId": config["answerSourceId"],
            "answerSourcePage": answer_source_page(config["mockId"], number),
            "answerVerificationMethod": answer_entry["verificationMethod"],
            "solution": f"Official source answer key: Choice {answer}.",
        })
        current_preface = next_preface

    section_counts = {}
    for replacement in config.get("passageReplacements", {}).values():
        if not any(replacement in passage["text"] for passage in passages):
            raise ValueError(
                f"{config['mockId']} verified visual correction was not applied: {replacement}"
            )
    for question in questions:
        section_counts[question["section"]] = section_counts.get(question["section"], 0) + 1

    question_source = source_records[config["questionSourceId"]]
    answer_source = source_records[config["answerSourceId"]]
    return {
        "schemaVersion": 1,
        "status": "verified_staging",
        "mock": {
            "id": config["mockId"],
            "title": config["title"],
            "exam": "CLAT",
            "year": 2027,
            "provider": "Career Launcher",
            "questionCount": 120,
            "durationMinutes": 120,
            "sectionCounts": section_counts,
            "scoring": {"correct": 1, "incorrect": -0.25, "unattempted": 0},
        },
        "source": {
            "questionCatalogueId": config["questionSourceId"],
            "answerCatalogueId": config["answerSourceId"],
            "path": config["path"],
            "questionSha256": question_source["sha256"],
            "answerPath": answer_source["path"],
            "answerSha256": answer_source["sha256"],
        },
        "answerKey": {
            "sourceFormat": answer_entry["sourceFormat"],
            "verificationMethod": answer_entry["verificationMethod"],
        },
        "passages": passages,
        "questions": questions,
    }


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    answer_path = repo_root / "src/data/staging/career_launcher_prime_answer_keys.json"
    answers = load_answers(answer_path)
    catalogue = json.loads((repo_root / "src/data/source_catalogue.json").read_text(encoding="utf-8"))
    source_records = {record["id"]: record for record in catalogue["sources"]}
    output_root = repo_root / "src/data/staging/career_launcher_prime"
    output_root.mkdir(parents=True, exist_ok=True)
    for config in MOCKS:
        data = parse_mock(repo_root, config, answers[config["mockId"]], source_records)
        output_path = output_root / f"{config['mockId']}.json"
        output_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(
            f"WROTE {output_path.relative_to(repo_root)}: "
            f"{len(data['questions'])} questions, {len(data['passages'])} passage groups"
        )


if __name__ == "__main__":
    main()
