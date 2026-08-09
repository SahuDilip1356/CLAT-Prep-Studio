#!/usr/bin/env python3
"""Stack every keyed CLAT question into adaptive, session-sized module banks.

Answer sources, in precedence order:

1. Batches 1-7 review queues - reconciled official answers plus explanations.
2. Origin Batch 16 answer-key PDFs - answers plus full official explanations.
3. Law Prep unpaired answer keys - answers plus official explanations.
4. 12MTC transcribed answer keys - answers only, owner-accepted.

Sessions hold about 35 questions - one study day's worth in every module - and
are ordered easy to hard using the same percentile rubric the adaptive bank
uses, so a learner walks Foundation -> Exam Standard -> Advanced inside each
module.
"""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import enrich_adaptive_item_bank as E  # noqa: E402

CANDIDATE_DIR = REPO_ROOT / "data/mock_ingestion/candidates"
QUEUE_DIR = REPO_ROOT / "public/data"
REVIEW_DIR = REPO_ROOT / "data/mock_review"
DATA_DIR = REPO_ROOT / "src/data"
AUG26 = REPO_ROOT / "CLAT Mock Papers/CLAT AUG26"

MODULES = ("ENGLISH", "GK", "LEGAL", "LOGICAL", "QUANT")

# A study day is ~35 questions in every module, so the daily load stays
# predictable. Sessions are balanced rather than chunked, which keeps every
# session within a question or two of the target instead of leaving a short
# remainder session at the hardest end of the ladder.
DAILY_TARGET = 35


def session_sizes(total: int, target: int = DAILY_TARGET) -> list[int]:
    """Split `total` questions into near-equal sessions of about `target`."""
    if total <= 0:
        return []
    sessions = max(1, round(total / target))
    base, remainder = divmod(total, sessions)
    return [base + 1] * remainder + [base] * (sessions - remainder)

# GK and Quant already shipped a hand-curated bank. Those questions join the
# same pool as the mock library rather than sitting in a separate track, so a
# module is one continuous ladder. The pristine curated banks live under
# legacy/ and are read-only inputs; the merged result is written to the
# learner-facing filename.
LEGACY_SOURCES = {"GK": "gk_question_bank.json", "QUANT": "question_bank.json"}
TARGETS = {
    "ENGLISH": "english_question_bank.json",
    "GK": "gk_question_bank.json",
    "LEGAL": "legal_question_bank.json",
    "LOGICAL": "logical_question_bank.json",
    "QUANT": "question_bank.json",
}

ORIGIN_PAIRS = {
    "SRC-0193": "Origin • CLAT 2027 MOCK 29 (AK)",
    "SRC-0194": "Origin • CLAT 2027 MOCK 30 (AK)",
    "SRC-0195": "Origin • CLAT 2027 MOCK 31 (AK)",
    "SRC-0196": "Origin • CLAT 2027 MOCK 27 (AK)",
    "SRC-0197": "Origin • CLAT 2027 MOCK 28 (AK)",
}
LPT_PAIRS = {"SRC-0190": "SRC-0189", "SRC-0158": "SRC-0147"}


def load_candidate(source_id: str) -> dict[int, dict]:
    path = CANDIDATE_DIR / f"{source_id}.json"
    if not path.is_file():
        return {}
    artifact = json.loads(path.read_text(encoding="utf-8"))
    return {q["sourceQuestionNumber"]: q for q in artifact.get("questions", [])}


def origin_key(label: str) -> dict[int, dict]:
    """Origin keys mix two layouts: 'Answer N: X.' and a GK grid 'N. X. text'."""
    import fitz

    matches = [p for p in (AUG26 / "Origin AK").glob("*.pdf") if label in p.name]
    if not matches:
        return {}
    doc = fitz.open(matches[0])
    text = "".join(page.get_text() for page in doc)
    doc.close()
    out: dict[int, dict] = {}
    prose = re.compile(
        r"Answer\s*[-–]?\s*(\d{1,3})\s*[:.)]\s*\(?([A-Da-d])\)?\.?\s*([^\n]*)"
        r"(?:\n+Explanation\s*[:.]?\s*((?:[^\n]+\n?){0,8}))?",
    )
    for match in prose.finditer(text):
        number = int(match.group(1))
        if 1 <= number <= 120:
            out[number] = {
                "answer": match.group(2).upper(),
                "explanation": re.sub(r"\s+", " ", (match.group(4) or "")).strip(),
            }
    grid = re.compile(r"(?m)^\s*(\d{1,3})\s*[.)]\s*\(?([A-Da-d])\)?\s*[.)]?\s+(\S[^\n]*)")
    for match in grid.finditer(text):
        number = int(match.group(1))
        if 1 <= number <= 120 and number not in out:
            out[number] = {"answer": match.group(2).upper(), "explanation": ""}
    return out


def lpt_key(key_source_id: str) -> dict[int, dict]:
    path = REPO_ROOT / f"data/mock_ingestion/pages/{key_source_id}.json"
    if not path.is_file():
        return {}
    cache = json.loads(path.read_text(encoding="utf-8"))
    text = "\n".join((page.get("text") or "") for page in cache.get("pages", []))
    out: dict[int, dict] = {}
    pattern = re.compile(
        r"(?m)^\s*(\d{1,3})\s*[.)]?\s*Answer\s*[:.]?\s*\(?([A-Da-d])\)?"
        r"(?:\s*\n?\s*Explanation\s*[:.]?\s*((?:[^\n]+\n?){0,6}))?",
    )
    for match in pattern.finditer(text):
        number = int(match.group(1))
        if 1 <= number <= 120:
            out[number] = {
                "answer": match.group(2).upper(),
                "explanation": re.sub(r"\s+", " ", (match.group(3) or "")).strip(),
            }
    return out


def option_texts(question: dict) -> list[str]:
    return [
        option["text"] if isinstance(option, dict) else str(option)
        for option in (question.get("options") or [])
    ]


def collect_legacy() -> list[dict]:
    """Curated GK and Quant questions, carried in whole so their extra fields
    (numericAnswer, subQuestions, directionsText, source provenance) survive."""
    records: list[dict] = []
    for module, filename in LEGACY_SOURCES.items():
        path = DATA_DIR / "legacy" / filename
        if not path.is_file():
            continue
        for question in json.loads(path.read_text(encoding="utf-8")):
            records.append({
                "key": f"legacy-{module}-{question['id']}",
                "module": module,
                "sourceId": "CURATED",
                "number": question["id"],
                "questionText": question.get("questionText") or "",
                "passageText": question.get("passageText") or "",
                "options": question.get("options") or [],
                "correctOption": (question.get("correctOption") or "").strip().upper(),
                "solution": question.get("solution") or "",
                "provenance": "CURATED_BANK",
                "answerSource": "Curated study bank",
                "legacy": question,
            })
    return records


def collect_current_affairs() -> list[dict]:
    """Questions the daily CA orchestrator has appended to a live module bank.

    build_ca_knowledge_graph.py adds verified dossier questions every morning.
    They exist only in the learner-facing bank, so a rebuild that read just the
    legacy snapshot and the mock library would silently delete a day's work.
    """
    records: list[dict] = []
    for module, filename in TARGETS.items():
        path = DATA_DIR / filename
        if not path.is_file():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            continue
        passages = payload.get("passages", {})
        for question in payload.get("questions", []):
            if question.get("explanationProvenance") != "VERIFIED_CA_DOSSIER":
                continue
            passage_id = question.get("passageId")
            question = {**question, "passageText": passages.get(passage_id, "") if passage_id else ""}
            records.append({
                "key": f"ca-{module}-{question['id']}",
                "module": module,
                "sourceId": question.get("sourceId") or "CA_DOSSIER",
                "number": question["id"],
                "questionText": question.get("questionText") or "",
                "passageText": question.get("passageText") or "",
                "options": question.get("options") or [],
                "correctOption": (question.get("correctOption") or "").strip().upper(),
                "solution": question.get("solution") or "",
                "provenance": "VERIFIED_CA_DOSSIER",
                "answerSource": "Verified Current Affairs dossier",
                "legacy": question,
            })
    return records


def collect() -> list[dict]:
    """Gather every question that has an official or owner-accepted answer."""
    records: list[dict] = []
    seen: set[str] = set()

    # 1. Batches 1-7: reconciled answers and drafted explanations.
    for batch in range(1, 8):
        path = QUEUE_DIR / f"mock_batch_{batch}_review_queue.json"
        if not path.is_file():
            continue
        for item in json.loads(path.read_text(encoding="utf-8")).get("items", []):
            content = item.get("content") or {}
            answer = (content.get("correctOption") or "").strip().upper()
            if not answer:
                continue
            key = f"{item['mockId']}-{item['number']:03d}"
            if key in seen:
                continue
            seen.add(key)
            records.append({
                "key": key,
                "module": item.get("module"),
                "sourceId": item["mockId"],
                "number": item["number"],
                "questionText": content.get("questionText") or "",
                "passageText": content.get("passageText") or "",
                "options": content.get("options") or [],
                "correctOption": answer,
                "solution": content.get("explanation") or "",
                "provenance": (item.get("explanationProvenance") or {}).get("kind") or "OFFICIAL",
                "answerSource": f"Batch {batch} reconciliation",
            })

    # 2 and 3. Origin and Law Prep keys carry official explanations.
    external: dict[str, dict[int, dict]] = {}
    for source_id, label in ORIGIN_PAIRS.items():
        external[source_id] = origin_key(label)
    for paper_id, key_id in LPT_PAIRS.items():
        external[paper_id] = lpt_key(key_id)

    # 4. 12MTC transcriptions accepted by the project owner.
    accepted_path = REVIEW_DIR / "12mtc_accepted_answer_keys.json"
    if accepted_path.is_file():
        accepted = json.loads(accepted_path.read_text(encoding="utf-8"))
        for source_id, mock in accepted.get("mocks", {}).items():
            external.setdefault(source_id, {})
            for number, answer in mock["answers"].items():
                external[source_id][int(number)] = {"answer": answer, "explanation": ""}

    for source_id, answers in external.items():
        questions = load_candidate(source_id)
        for number, entry in sorted(answers.items()):
            question = questions.get(number)
            if not question or not question.get("module"):
                continue
            key = f"{source_id}-{number:03d}"
            if key in seen:
                continue
            seen.add(key)
            explanation = entry.get("explanation") or ""
            records.append({
                "key": key,
                "module": question["module"],
                "sourceId": source_id,
                "number": number,
                "questionText": question.get("stem") or "",
                "passageText": question.get("stimulus") or "",
                "options": option_texts(question),
                "correctOption": entry["answer"],
                "solution": explanation,
                "provenance": "OFFICIAL_KEY_EXPLANATION" if explanation else "ANSWER_ONLY_NO_EXPLANATION",
                "answerSource": "Origin/LPT official key" if explanation else "Owner-accepted transcription",
            })
    return records


def build() -> dict:
    pool = collect_legacy() + collect_current_affairs() + collect()
    records = [r for r in pool if r["module"] in MODULES and r["questionText"]]

    # Difficulty is a percentile rank inside each module pool, matching the
    # adaptive bank rubric, so every module self-norms to 30/50/20.
    scores: dict[str, list[float]] = defaultdict(list)
    for record in records:
        score, signals, features = E.content_score(
            record["module"], record["questionText"], record["passageText"], record["options"],
        )
        record["_score"], record["_signals"], record["_features"] = score, signals, features
        scores[record["module"]].append(score)
    for module in scores:
        scores[module].sort()

    by_module: dict[str, list[dict]] = defaultdict(list)
    for record in records:
        rank = E.percentile(scores[record["module"]], record["_score"])
        level = 1 if rank < 0.30 else 2 if rank < 0.80 else 3
        record["difficultyIndex"] = round(rank * 100, 1)
        record["difficultyLevel"] = level
        record["difficultyLabel"] = {1: "Foundation", 2: "Exam Standard", 3: "Advanced"}[level]
        record["targetSeconds"] = E.TARGET_SECONDS[record["module"]][level]
        skill = E.skill_tags(
            record["module"], record["questionText"], record["passageText"], record["options"],
        )
        record["skillId"] = skill["primarySkillId"]
        record["topic"] = skill["primarySkill"]
        by_module[record["module"]].append(record)

    banks: dict[str, list[dict]] = {}
    summary: dict[str, dict] = {}
    for module, items in by_module.items():
        # Easy to hard, with the source paper as a stable tie-break.
        items.sort(key=lambda r: (r["difficultyIndex"], r["sourceId"], r["number"]))
        sizes = session_sizes(len(items))
        # Walk the balanced session plan alongside the sorted items.
        day, position = 1, 0
        bank = []
        for record in items:
            if position == sizes[day - 1]:
                day, position = day + 1, 0
            position += 1
            legacy = record.get("legacy") or {}
            bank.append({
                # Curated questions keep their original id so saved bookmarks,
                # error-notebook entries and progress references still resolve.
                **legacy,
                "id": legacy["id"] if legacy else
                      f"{module[:3]}-{record['sourceId']}-Q{record['number']:03d}",
                "module": module,
                "day": day,
                "dayStr": f"Session {day}",
                "dailyQNo": position,
                # Curated topic/category are hand-authored and drive the
                # topic-practice flow, so they win over the derived skill name.
                "topic": legacy.get("topic") or record["topic"],
                "category": legacy.get("category") or record["difficultyLabel"],
                "conceptTip": legacy.get("conceptTip") or "",
                "skillId": record["skillId"],
                "difficultyLevel": record["difficultyLevel"],
                "difficultyLabel": record["difficultyLabel"],
                "difficultyIndex": record["difficultyIndex"],
                "targetSeconds": record["targetSeconds"],
                "questionText": record["questionText"],
                "passageText": record["passageText"],
                "options": record["options"],
                "correctOption": record["correctOption"],
                "solution": record["solution"],
                "hasExplanation": bool(record["solution"]),
                "explanationProvenance": record["provenance"],
                "answerSource": record["answerSource"],
                "sourceId": record["sourceId"],
                "sourceQuestionNo": record["number"],
            })
        # Passages repeat for every question in their group and account for
        # ~82% of the raw payload. Store each once and reference it by id.
        passages: dict[str, str] = {}
        index_by_text: dict[str, str] = {}
        for entry in bank:
            text = entry.pop("passageText", "") or ""
            if not text:
                entry["passageId"] = None
                continue
            passage_id = index_by_text.get(text)
            if passage_id is None:
                passage_id = f"{module[:3]}-P{len(passages) + 1:04d}"
                index_by_text[text] = passage_id
                passages[passage_id] = text
            entry["passageId"] = passage_id
        banks[module] = bank
        banks[f"{module}__passages"] = passages
        summary[module] = {
            "questions": len(bank),
            "sessionTarget": DAILY_TARGET,
            "sessionSizeRange": [min(sizes), max(sizes)] if sizes else [0, 0],
            "sessions": len(sizes),
            "withExplanation": sum(1 for b in bank if b["hasExplanation"]),
            "byLevel": {
                str(level): sum(1 for b in bank if b["difficultyLevel"] == level)
                for level in (1, 2, 3)
            },
        }
    return {"banks": banks, "summary": summary}


def main() -> None:
    result = build()
    banks, summary = result["banks"], result["summary"]
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    written = {}
    for module, filename in TARGETS.items():
        payload = {
            "schemaVersion": 1,
            "module": module,
            "sessionSize": DAILY_TARGET,
            "passages": banks.get(f"{module}__passages", {}),
            "questions": banks.get(module, []),
        }
        path = DATA_DIR / filename
        path.write_text(json.dumps(payload, ensure_ascii=False) + "\n", encoding="utf-8")
        written[filename] = len(payload["questions"])

    report = {
        "schemaVersion": 1,
        "sessionPolicy": f"Each session holds about {DAILY_TARGET} questions; "
                         "sessions are balanced so none is short.",
        "difficultyPolicy": "Percentile rank within the module pool: <30 Foundation, <80 Exam Standard, else Advanced.",
        "poolPolicy": "One pool per module: curated bank plus mock library, ranked together.",
        "summary": summary,
        "filesWritten": written,
    }
    (REVIEW_DIR / "section_bank_build_report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
