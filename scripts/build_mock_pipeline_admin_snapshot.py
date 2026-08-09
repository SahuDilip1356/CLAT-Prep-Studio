#!/usr/bin/env python3
"""Build the non-sensitive Admin dashboard snapshot for mock ingestion runs."""

from __future__ import annotations

import argparse
import json
import os
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from mock_pipeline_orchestrator import RunStore


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATABASE = REPO_ROOT / "data/mock_ingestion/orchestrator/orchestrator.sqlite3"
DEFAULT_OUTPUT = REPO_ROOT / "public/data/mock_pipeline_admin.json"
MODULES = ("ENGLISH", "GK", "LEGAL", "LOGICAL", "QUANT")


def read_json(path: Path, fallback=None):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {} if fallback is None else fallback


def numeric_delta(after, before):
    if isinstance(after, dict):
        before = before if isinstance(before, dict) else {}
        return {key: numeric_delta(value, before.get(key)) for key, value in after.items()}
    if isinstance(after, (int, float)) and not isinstance(after, bool):
        return after - (before if isinstance(before, (int, float)) else 0)
    return None


def question_layer_metrics(repo_root: Path) -> dict:
    ingestion = read_json(repo_root / "data/mock_ingestion/validation_report.json")
    adaptive = read_json(repo_root / "data/mock_ingestion/adaptive_validation_report.json")
    enrichment = read_json(repo_root / "data/mock_ingestion/adaptive_item_report.json")
    ingestion_summary = ingestion.get("summary", {})
    adaptive_summary = adaptive.get("summary", {})
    return {
        "indexedDocuments": ingestion_summary.get("indexedDocuments", 0),
        "extractedPages": ingestion_summary.get("extractedPages", 0),
        "questionCandidates": ingestion_summary.get("questionCandidates", 0),
        "answerCandidates": ingestion_summary.get("answerCandidates", 0),
        "verifiedAdaptiveItems": adaptive_summary.get("verifiedAdaptiveItems", 0),
        "calibratedItems": adaptive_summary.get("calibratedItems", 0),
        "reviewIssues": ingestion_summary.get("reviewIssues", 0),
        "integrityErrors": ingestion_summary.get("integrityErrors", 0),
        "candidateEligibilityErrors": adaptive_summary.get("candidateEligibilityErrors", 0),
        "candidateByModule": {
            module: ingestion_summary.get("byModule", {}).get(module, 0) for module in MODULES
        },
        "verifiedByModule": {
            module: adaptive_summary.get("byModule", {}).get(module, 0) for module in MODULES
        },
        "verifiedDifficultyByModule": enrichment.get("verifiedDifficultyByModule", {}),
        "candidateDifficultyByModule": enrichment.get("candidateDifficultyByModule", {}),
        "candidateSourceStatus": enrichment.get("candidateSourceStatus", {}),
        "pageMethods": ingestion_summary.get("pageMethods", {}),
        "verifiedSkillCount": len(enrichment.get("verifiedSkillCoverage", {})),
        "candidateSkillCount": len(enrichment.get("candidateSkillCoverage", {})),
    }


def validate_metrics(metrics: dict) -> list[str]:
    errors = []
    candidate_total = sum(metrics.get("candidateByModule", {}).values())
    if candidate_total != metrics.get("questionCandidates", 0):
        errors.append(
            f"Candidate module total {candidate_total} does not equal question total {metrics.get('questionCandidates', 0)}."
        )
    verified_total = sum(metrics.get("verifiedByModule", {}).values())
    if verified_total != metrics.get("verifiedAdaptiveItems", 0):
        errors.append(
            f"Verified module total {verified_total} does not equal adaptive total {metrics.get('verifiedAdaptiveItems', 0)}."
        )
    for module, total in metrics.get("verifiedByModule", {}).items():
        difficulty_total = sum(metrics.get("verifiedDifficultyByModule", {}).get(module, {}).values())
        if difficulty_total != total:
            errors.append(f"{module} difficulty total {difficulty_total} does not equal verified total {total}.")
    page_total = sum(metrics.get("pageMethods", {}).values())
    if page_total != metrics.get("extractedPages", 0):
        errors.append(
            f"Extraction-method total {page_total} does not equal extracted pages {metrics.get('extractedPages', 0)}."
        )
    return errors


def duration_seconds(started_at, ended_at):
    if not started_at or not ended_at:
        return None
    try:
        started = datetime.fromisoformat(started_at)
        ended = datetime.fromisoformat(ended_at)
    except ValueError:
        return None
    return round((ended - started).total_seconds(), 2)


def sanitized_run(detail: dict | None) -> dict:
    if not detail:
        return {}
    return {
        "id": detail.get("id"),
        "trigger": detail.get("trigger"),
        "state": detail.get("state"),
        "success": detail.get("success", False),
        "fileCount": detail.get("file_count", 0),
        "startedAt": detail.get("started_at"),
        "endedAt": detail.get("ended_at"),
        "durationSeconds": duration_seconds(detail.get("started_at"), detail.get("ended_at")),
        "error": detail.get("error"),
        "summary": detail.get("summary", {}),
        "stages": [
            {
                "id": stage.get("stage_id"),
                "worker": stage.get("worker"),
                "state": stage.get("state"),
                "attempts": stage.get("attempts", 0),
                "startedAt": stage.get("started_at"),
                "endedAt": stage.get("ended_at"),
                "durationSeconds": duration_seconds(stage.get("started_at"), stage.get("ended_at")),
                "exitCode": stage.get("exit_code"),
                "error": stage.get("error"),
            }
            for stage in detail.get("stages", [])
        ],
    }


def changed_source_impact(repo_root: Path, current_run: dict) -> list[dict]:
    catalogue = read_json(repo_root / "src/data/source_catalogue.json")
    validation = read_json(repo_root / "data/mock_ingestion/validation_report.json")
    review_by_source = Counter(
        issue.get("sourceId") for issue in validation.get("reviewIssues", []) if issue.get("sourceId")
    )
    change_by_id = {}
    for change_type in ("new", "modified", "moved", "missing"):
        for source_id in catalogue.get("changes", {}).get(change_type, []):
            change_by_id[source_id] = change_type.upper()
    records = {record["id"]: record for record in catalogue.get("sources", [])}
    impact = []
    for source_id, change_type in sorted(change_by_id.items()):
        source = records.get(source_id, {"id": source_id})
        artifact = read_json(repo_root / f"data/mock_ingestion/candidates/{source_id}.json")
        summary = artifact.get("summary", {})
        impact.append({
            "sourceId": source_id,
            "changeType": change_type,
            "path": source.get("path") or source.get("previousPath") or "Unavailable after removal",
            "provider": source.get("provider", "Unclassified"),
            "assetKind": source.get("assetKind", "unknown"),
            "pages": source.get("pdf", {}).get("pages", 0),
            "extractionStatus": source.get("textExtraction", {}).get("status", "unknown"),
            "candidateStatus": artifact.get("status", "NOT_PARSED"),
            "questionCandidates": summary.get("parsedQuestions", 0) + summary.get("verifiedStagingQuestions", 0),
            "answerCandidates": summary.get("answerCandidatesAttached", 0),
            "reviewIssues": review_by_source[source_id],
            "byModule": summary.get("byModule", {}),
        })
    represented_paths = {item["path"] for item in impact}
    for path in current_run.get("summary", {}).get("removedSources", []):
        if path not in represented_paths:
            impact.append({
                "sourceId": "PREVIOUSLY_INDEXED",
                "changeType": "MISSING",
                "path": path,
                "provider": "Unknown until restored",
                "assetKind": "unknown",
                "pages": 0,
                "extractionStatus": "blocked_before_indexing",
                "candidateStatus": "REVIEW_REQUIRED",
                "questionCandidates": 0,
                "answerCandidates": 0,
                "reviewIssues": 1,
                "byModule": {},
            })
    return impact


def previous_question_layer(output_path: Path, current_run_id: str | None) -> dict:
    previous = read_json(output_path)
    if previous.get("currentRun", {}).get("id") == current_run_id:
        return previous.get("questionLayer", {}).get("before", {})
    return previous.get("questionLayer", {}).get("after", {})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", type=Path, default=DEFAULT_DATABASE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--history-limit", type=int, default=12)
    args = parser.parse_args()

    store = RunStore(args.database)
    try:
        detail = store.run_detail()
        history = store.history(args.history_limit)
    finally:
        store.close()
    current_run = sanitized_run(detail)
    after = question_layer_metrics(REPO_ROOT)
    metric_errors = validate_metrics(after)
    if metric_errors:
        raise SystemExit("Admin snapshot metric reconciliation failed: " + " ".join(metric_errors))
    before = previous_question_layer(args.output, current_run.get("id")) or after
    history_rows = [
        {
            "id": run.get("id"),
            "trigger": run.get("trigger"),
            "state": run.get("state"),
            "success": run.get("success"),
            "startedAt": run.get("started_at"),
            "endedAt": run.get("ended_at"),
            "fileCount": run.get("file_count", 0),
            "summary": run.get("summary", {}),
        }
        for run in history
    ]
    output = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "freshness": {
            "mode": "LOCAL_ORCHESTRATOR_SNAPSHOT",
            "note": "Refreshes after every terminal orchestration run; production requires deployment or a status API.",
        },
        "currentRun": current_run,
        "questionLayer": {
            "before": before,
            "after": after,
            "delta": numeric_delta(after, before),
        },
        "sourceImpact": changed_source_impact(REPO_ROOT, current_run),
        "history": history_rows,
        "definitions": {
            "questionCandidates": "Structurally parsed candidates; not necessarily learner-publishable.",
            "verifiedAdaptiveItems": "Questions passing provenance, answer-key and adaptive eligibility gates.",
            "reviewIssues": "Candidate-level flags requiring automated repair or human review.",
            "successWithReview": "All operational stages passed and verified items published; gated review work remains.",
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(temporary, args.output)
    print(json.dumps({
        "output": str(args.output),
        "runId": current_run.get("id"),
        "state": current_run.get("state"),
        "sourceChanges": len(output["sourceImpact"]),
    }, indent=2))


if __name__ == "__main__":
    main()
