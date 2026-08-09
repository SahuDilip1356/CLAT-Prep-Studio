#!/usr/bin/env python3
"""Add CLAT skill tags and normed adaptive priors to digitized questions.

OCR candidates receive non-publishable priors for review and future calibration.
Only exact questions from verified staging artifacts enter the learner-facing
adaptive bank.
"""

from __future__ import annotations

import argparse
import bisect
import hashlib
import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = REPO_ROOT / "src/data/mock_ingestion_manifest.json"
CANDIDATE_ROOT = REPO_ROOT / "data/mock_ingestion/candidates"
CLAT_BANK_PATH = REPO_ROOT / "src/data/clat_mock_bank.json"
OUTPUT_PATH = REPO_ROOT / "src/data/adaptive_verified_mock_bank.json"
CANDIDATE_OUTPUT_PATH = REPO_ROOT / "data/mock_ingestion/adaptive_candidate_priors.jsonl"
REPORT_PATH = REPO_ROOT / "data/mock_ingestion/adaptive_item_report.json"
SCHEMA_VERSION = 1
RUBRIC_VERSION = "clat-content-prior-v1"

TARGET_SECONDS = {
    "ENGLISH": {1: 50, 2: 65, 3: 80},
    "GK": {1: 25, 2: 35, 3: 45},
    "LEGAL": {1: 65, 2: 80, 3: 95},
    "LOGICAL": {1: 60, 2: 75, 3: 90},
    "QUANT": {1: 55, 2: 70, 3: 85},
}

SKILLS = {
    "ENGLISH": [
        ("ENG.INFERENCE", "Inference and implication", r"infer|imply|suggest|most likely|can be concluded"),
        ("ENG.TONE_PURPOSE", "Author tone and purpose", r"tone|attitude|purpose|author.{0,20}(?:view|believe|argue)"),
        ("ENG.MAIN_IDEA", "Main idea and structure", r"main idea|central idea|primary purpose|best title|structure"),
        ("ENG.VOCAB_CONTEXT", "Vocabulary in context", r"meaning|synonym|antonym|word|phrase|closest in meaning"),
        ("ENG.GRAMMAR", "Grammar and usage", r"grammar|usage|incorrect|error|sentence|punctuat|replacement"),
        ("ENG.DETAIL", "Passage detail retrieval", r"according to|states? that|which of the following.*passage"),
        ("ENG.PARAGRAPH", "Paragraph organisation", r"sequence|rearrange|paragraph|opening sentence|concluding sentence"),
    ],
    "GK": [
        ("GK.POLITY_LAW", "Polity, governance and law", r"constitution|article\s+\d+|parliament|supreme court|act\b|bill\b|ministry"),
        ("GK.INTERNATIONAL", "International affairs", r"united nations|\bun\b|treaty|summit|international|country|bilateral|g20|brics"),
        ("GK.ECONOMY", "Economy and public policy", r"econom|gdp|inflation|budget|bank|finance|tax|monetary|fiscal"),
        ("GK.SCI_TECH", "Science and technology", r"science|technology|space|isro|satellite|artificial intelligence|quantum"),
        ("GK.ENVIRONMENT", "Environment and geography", r"climate|environment|river|forest|geograph|wildlife|cop\d+"),
        ("GK.HISTORY_CULTURE", "History and culture", r"history|ancient|medieval|dynasty|culture|heritage|unesco|movement"),
        ("GK.SPORTS_AWARDS", "Sports, awards and appointments", r"sport|award|prize|appointed|championship|olympic|medal"),
    ],
    "LEGAL": [
        ("LEGAL.CONSTITUTION", "Constitutional law", r"constitution|fundamental right|article\s+\d+|writ|judicial review"),
        ("LEGAL.CRIMINAL", "Criminal law", r"crime|criminal|murder|theft|accused|intention|mens rea|bns|ipc"),
        ("LEGAL.CONTRACT", "Contract law", r"contract|offer|acceptance|consideration|breach|agreement|promise"),
        ("LEGAL.TORT", "Law of torts", r"tort|negligen|nuisance|defamation|strict liability|vicarious"),
        ("LEGAL.FAMILY_PROPERTY", "Family and property law", r"marriage|divorce|succession|inherit|property|guardian"),
        ("LEGAL.PRINCIPLE", "Principle-fact application", r"principle|facts?|apply|liable|liability|legal position"),
        ("LEGAL.JURISPRUDENCE", "Legal concepts and jurisprudence", r"jurisprudence|legal maxim|rights?|duties|justice|precedent"),
    ],
    "LOGICAL": [
        ("LOGIC.STRENGTHEN_WEAKEN", "Strengthen and weaken", r"strengthen|weaken"),
        ("LOGIC.ASSUMPTION", "Assumptions", r"assumption|presuppos"),
        ("LOGIC.INFERENCE", "Inference and conclusion", r"infer|conclusion|follows|must be true"),
        ("LOGIC.FLAW", "Argument flaw and evaluation", r"flaw|criticism|evaluate|reasoning|argument"),
        ("LOGIC.CAUSE", "Cause, effect and paradox", r"cause|effect|explain|paradox|discrepancy"),
        ("LOGIC.ARRANGEMENT", "Arrangements and ordering", r"arrangement|seating|order|rank|schedule|floor"),
        ("LOGIC.SYLLOGISM", "Syllogisms and deductions", r"syllogism|deduction|statements?.*conclusions?|some .* are|all .* are"),
        ("LOGIC.ANALYTICAL", "Analytical reasoning", r"coding|blood relation|direction|series|puzzle|analytical"),
    ],
    "QUANT": [
        ("QUANT.DATA", "Data interpretation", r"table|chart|graph|data|students|survey"),
        ("QUANT.PERCENT", "Percentages", r"percent|percentage|%"),
        ("QUANT.RATIO", "Ratio and proportion", r"ratio|proportion"),
        ("QUANT.AVERAGE", "Averages and mixtures", r"average|mean|mixture|alligation"),
        ("QUANT.PROFIT", "Profit, loss and discount", r"profit|loss|discount|selling price|cost price"),
        ("QUANT.INTEREST", "Simple and compound interest", r"simple interest|compound interest|interest rate"),
        ("QUANT.TIME_WORK", "Time and work", r"time and work|work together|pipes?|cistern"),
        ("QUANT.SPEED", "Speed, time and distance", r"speed|distance|train|boat|stream"),
        ("QUANT.MENSURATION", "Mensuration and geometry", r"area|volume|perimeter|circle|triangle|rectangle|geometry"),
        ("QUANT.ALGEBRA", "Algebra", r"equation|algebra|polynomial|variable"),
        ("QUANT.NUMBER", "Number system", r"divisible|remainder|integer|prime|lcm|hcf|number"),
    ],
}

FALLBACK_SKILLS = {
    "ENGLISH": ("ENG.COMPREHENSION", "Reading comprehension"),
    "GK": ("GK.GENERAL", "General knowledge and current affairs"),
    "LEGAL": ("LEGAL.APPLICATION", "Legal reasoning and application"),
    "LOGICAL": ("LOGIC.CRITICAL", "Critical reasoning"),
    "QUANT": ("QUANT.ARITHMETIC", "Arithmetic reasoning"),
}


def words(text):
    return re.findall(r"[a-z0-9]+", (text or "").lower())


def question_parts(question):
    stem = question.get("stem") or question.get("questionText") or ""
    stimulus = question.get("stimulus") or question.get("passageText") or question.get("directionsText") or ""
    raw_options = question.get("options") or []
    options = [item.get("text", "") if isinstance(item, dict) else str(item) for item in raw_options]
    return stem, stimulus, options


def infer_module(question):
    module = question.get("module") or question.get("tutorModule")
    if module in TARGET_SECONDS:
        return module
    section = f"{question.get('section', '')} {question.get('category', '')}".lower()
    if "quant" in section:
        return "QUANT"
    if "legal" in section:
        return "LEGAL"
    if "logical" in section or "critical" in section or "analytical" in section:
        return "LOGICAL"
    if "english" in section:
        return "ENGLISH"
    if "current" in section or "general knowledge" in section or "gk" in section:
        return "GK"
    return None


def skill_tags(module, stem, stimulus, options):
    searchable = " ".join((stem, " ".join(options), stimulus[:3000])).lower()
    matches = []
    for skill_id, label, pattern in SKILLS[module]:
        if re.search(pattern, searchable, re.I | re.S):
            matches.append((skill_id, label))
    if not matches:
        matches = [FALLBACK_SKILLS[module]]
    primary = matches[0]
    return {
        "primarySkillId": primary[0],
        "primarySkill": primary[1],
        "secondarySkillIds": [item[0] for item in matches[1:3]],
        "skillPath": [module, primary[0]],
        "confidence": "MEDIUM" if primary != FALLBACK_SKILLS[module] else "LOW",
    }


def average_distractor_overlap(options):
    sets = [set(words(option)) for option in options if option]
    scores = []
    for index, left in enumerate(sets):
        for right in sets[index + 1:]:
            union = left | right
            if union:
                scores.append(len(left & right) / len(union))
    return sum(scores) / len(scores) if scores else 0


def content_score(module, stem, stimulus, options):
    stem_words = len(words(stem))
    stimulus_words = len(words(stimulus))
    option_words = sum(len(words(option)) for option in options) / max(len(options), 1)
    overlap = average_distractor_overlap(options)
    searchable = f"{stem} {' '.join(options)}".lower()
    score = 0.7
    signals = []

    score += min(stem_words / 70, 1.2)
    score += min(stimulus_words / 700, 1.1)
    score += min(option_words / 22, 0.9)
    score += min(overlap * 1.8, 0.8)
    if re.search(r"\b(?:except|not correct|least likely|cannot be inferred)\b", searchable):
        score += 0.65
        signals.append("exception_or_negative_logic")
    if re.search(r"\b(?:infer|imply|assumption|strengthen|weaken|most likely|principle)\b", searchable):
        score += 0.6
        signals.append("inference_or_application")
    if re.search(r"\b(?:according to|who|when|where|how many)\b", searchable):
        score -= 0.2
        signals.append("direct_retrieval_signal")

    if module == "QUANT":
        operations = len(re.findall(r"[%+×÷=]|\b(?:ratio|average|profit|loss|interest|difference)\b", searchable))
        score += min(operations * 0.18, 1.2)
        if stimulus_words > 120:
            score += 0.35
            signals.append("data_set_interpretation")
    elif module == "LEGAL":
        rules = len(re.findall(r"\b(?:provided that|unless|exception|liable|article\s+\d+|section\s+\d+)\b", searchable))
        score += min(rules * 0.2, 0.9)
    elif module == "LOGICAL":
        constraints = len(re.findall(r"\b(?:only if|unless|either|neither|must|cannot|all|some)\b", searchable))
        score += min(constraints * 0.12, 0.9)
    elif module == "ENGLISH" and re.search(r"tone|purpose|infer|imply|structure", searchable):
        score += 0.35
    elif module == "GK" and stimulus_words < 80:
        score -= 0.25

    # Continuous tie-breakers come from real content lengths, never provider or mock number.
    score += ((stem_words % 11) * 0.007) + ((option_words % 7) * 0.006)
    return round(max(score, 0), 4), signals, {
        "stemWords": stem_words,
        "stimulusWords": stimulus_words,
        "averageOptionWords": round(option_words, 2),
        "distractorOverlap": round(overlap, 3),
    }


def percentile(sorted_scores, value):
    if not sorted_scores:
        return 0.5
    left = bisect.bisect_left(sorted_scores, value)
    right = bisect.bisect_right(sorted_scores, value)
    return ((left + right) / 2) / len(sorted_scores)


def adaptive_prior(question, score_distributions):
    module = infer_module(question)
    if module not in TARGET_SECONDS:
        raise ValueError(f"Cannot infer CLAT module for {question.get('id')}")
    stem, stimulus, options = question_parts(question)
    score, signals, features = content_score(module, stem, stimulus, options)
    rank = percentile(score_distributions[module], score)
    level = 1 if rank < 0.30 else 2 if rank < 0.80 else 3
    label = {1: "Foundation", 2: "Exam Standard", 3: "Advanced"}[level]
    skill = skill_tags(module, stem, stimulus, options)
    discrimination = min(1.4, 0.82 + (features["distractorOverlap"] * 0.7) + (0.12 if "inference_or_application" in signals else 0))
    difficulty_b = -1.5 + (3.0 * rank)
    guessing_c = 1 / max(len(options), 4)
    prior_correct = guessing_c + ((1 - guessing_c) / (1 + math.exp(discrimination * difficulty_b)))
    return {
        "module": module,
        "skill": skill,
        "difficulty": {
            "status": "CONTENT_PRIOR",
            "level": level,
            "label": label,
            "index": round(rank * 100, 1),
            "confidence": "MEDIUM",
            "rubricVersion": RUBRIC_VERSION,
            "signals": signals,
            "features": features,
        },
        "itemParameters": {
            "model": "3PL_PRIOR",
            "discriminationA": round(discrimination, 3),
            "difficultyB": round(difficulty_b, 3),
            "guessingC": round(guessing_c, 3),
            "priorCorrectProbabilityAtTheta0": round(prior_correct, 3),
            "calibrationStatus": "EXPERT_CONTENT_PRIOR",
            "attempts": 0,
            "minimumAttemptsForEmpiricalBlend": 30,
            "minimumAttemptsForStableCalibration": 250,
        },
        "targetSeconds": TARGET_SECONDS[module][level],
    }


def candidate_questions():
    records = []
    for path in sorted(CANDIDATE_ROOT.glob("SRC-*.json")):
        artifact = json.loads(path.read_text(encoding="utf-8"))
        for question in artifact.get("questions", []):
            records.append((artifact, question))
    return records


def score_distributions(candidate_records):
    distributions = defaultdict(list)
    for _, question in candidate_records:
        module = infer_module(question)
        if module not in TARGET_SECONDS:
            continue
        stem, stimulus, options = question_parts(question)
        score, _, _ = content_score(module, stem, stimulus, options)
        distributions[module].append(score)
    return {module: sorted(values) for module, values in distributions.items()}


def question_score_distributions(questions):
    return score_distributions([(None, question) for question in questions])


def verified_staging_questions(manifest):
    seen_paths = set()
    output = []
    for item in manifest["items"]:
        for artifact in item.get("stagingArtifacts", []):
            if artifact.get("status") != "verified_staging" or artifact["path"] in seen_paths:
                continue
            seen_paths.add(artifact["path"])
            path = REPO_ROOT / artifact["path"]
            data = json.loads(path.read_text(encoding="utf-8"))
            passage_by_id = {passage["id"]: passage for passage in data.get("passages", [])}
            for question in data.get("questions", []):
                exact = dict(question)
                passage = passage_by_id.get(question.get("passageId"), {})
                exact.setdefault("passageText", passage.get("text", ""))
                exact.setdefault("directionsText", passage.get("directionsText", ""))
                exact["module"] = infer_module(exact)
                exact["sourceArtifact"] = artifact["path"]
                output.append(exact)
    return output


def overlay_for(question, prior):
    return {
        "id": question["id"],
        "tutorModule": prior["module"],
        "sourceTopic": question.get("topic"),
        "topic": prior["skill"]["primarySkill"],
        "skillId": prior["skill"]["primarySkillId"],
        "secondarySkillIds": prior["skill"]["secondarySkillIds"],
        "skillPath": prior["skill"]["skillPath"],
        "skillTagConfidence": prior["skill"]["confidence"],
        "difficultyLevel": prior["difficulty"]["level"],
        "difficultyLabel": prior["difficulty"]["label"],
        "difficultyIndex": prior["difficulty"]["index"],
        "targetSeconds": prior["targetSeconds"],
        "adaptiveCalibration": prior["itemParameters"],
        "adaptiveEligibility": {
            "eligible": True,
            "contentStatus": "VERIFIED_STAGING",
            "answerStatus": "OFFICIAL_KEY_VERIFIED",
            "difficultyStatus": "CONTENT_PRIOR",
            "requiresTelemetryCalibration": True,
        },
        "difficultyEvidence": prior["difficulty"],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bank-output", type=Path, default=OUTPUT_PATH)
    parser.add_argument("--candidate-output", type=Path, default=CANDIDATE_OUTPUT_PATH)
    parser.add_argument("--report-output", type=Path, default=REPORT_PATH)
    args = parser.parse_args()

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    candidate_records = candidate_questions()
    distributions = score_distributions(candidate_records)
    if set(distributions) != set(TARGET_SECONDS):
        raise SystemExit(f"Missing module distributions: {set(TARGET_SECONDS) - set(distributions)}")

    candidate_statuses = Counter()
    candidate_difficulty = Counter()
    candidate_skills = Counter()
    args.candidate_output.parent.mkdir(parents=True, exist_ok=True)
    with args.candidate_output.open("w", encoding="utf-8") as handle:
        for artifact, question in candidate_records:
            prior = adaptive_prior(question, distributions)
            candidate_statuses[artifact["status"]] += 1
            candidate_difficulty[(prior["module"], prior["difficulty"]["label"])] += 1
            candidate_skills[prior["skill"]["primarySkillId"]] += 1
            record = {
                "id": question["id"],
                "sourceId": artifact["source"]["id"],
                "sourceStatus": artifact["status"],
                **prior,
                "adaptiveEligibility": {
                    "eligible": False,
                    "reason": "Candidate prior only; exact verified staging artifact required for learner use.",
                },
            }
            handle.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")

    verified = verified_staging_questions(manifest)
    verified_distributions = question_score_distributions(verified)
    clat_bank = json.loads(CLAT_BANK_PATH.read_text(encoding="utf-8"))
    clat_ids = {question["id"] for mock in clat_bank["mocks"] for question in mock["questions"]}
    overlays = []
    standalone = []
    verified_difficulty = Counter()
    verified_modules = Counter()
    verified_skills = Counter()
    for question in verified:
        # Learner-facing levels are normed within the verified selectable pool;
        # OCR-only candidates must not shift a student's difficulty ladder.
        prior = adaptive_prior(question, verified_distributions)
        overlay = overlay_for(question, prior)
        verified_difficulty[(prior["module"], prior["difficulty"]["label"])] += 1
        verified_modules[prior["module"]] += 1
        verified_skills[prior["skill"]["primarySkillId"]] += 1
        if question["id"] in clat_ids:
            overlays.append(overlay)
        else:
            exact = dict(question)
            exact.update(overlay)
            standalone.append(exact)

    if len(overlays) + len(standalone) != len(verified):
        raise SystemExit("Verified item overlay count mismatch")
    output = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "rubricVersion": RUBRIC_VERSION,
        "taxonomy": {
            "modules": list(TARGET_SECONDS),
            "targetSeconds": TARGET_SECONDS,
            "difficultyScale": {"1": "Foundation", "2": "Exam Standard", "3": "Advanced"},
        },
        "summary": {
            "verifiedItems": len(verified),
            "mockItemOverlays": len(overlays),
            "standaloneItems": len(standalone),
            "byModule": dict(sorted(verified_modules.items())),
        },
        "itemOverlays": overlays,
        "standaloneItems": standalone,
    }
    args.bank_output.parent.mkdir(parents=True, exist_ok=True)
    args.bank_output.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    report = {
        "schemaVersion": 1,
        "generatedAt": output["generatedAt"],
        "rubricVersion": RUBRIC_VERSION,
        "candidatePriors": len(candidate_records),
        "verifiedAdaptiveItems": len(verified),
        "verifiedMockOverlays": len(overlays),
        "verifiedStandaloneItems": len(standalone),
        "candidateSourceStatus": dict(sorted(candidate_statuses.items())),
        "candidateDifficultyByModule": {
            module: {label: candidate_difficulty[(module, label)] for label in ("Foundation", "Exam Standard", "Advanced")}
            for module in TARGET_SECONDS
        },
        "verifiedDifficultyByModule": {
            module: {label: verified_difficulty[(module, label)] for label in ("Foundation", "Exam Standard", "Advanced")}
            for module in TARGET_SECONDS
        },
        "verifiedByModule": dict(sorted(verified_modules.items())),
        "verifiedSkillCoverage": dict(sorted(verified_skills.items())),
        "candidateSkillCoverage": dict(sorted(candidate_skills.items())),
        "publicationRule": "Only items in adaptive_verified_mock_bank.json are selectable; JSONL candidates are priors for review only.",
    }
    args.report_output.parent.mkdir(parents=True, exist_ok=True)
    args.report_output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key not in {"candidateSkillCoverage", "verifiedSkillCoverage"}}, indent=2))


if __name__ == "__main__":
    main()
