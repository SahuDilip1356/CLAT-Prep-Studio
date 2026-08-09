#!/usr/bin/env python3
"""Watch, orchestrate, monitor, and atomically publish the mock-paper pipeline.

The controller is intentionally deterministic. Specialist workers may use OCR or
semantic models internally, but only code-owned state transitions and validators
can mark a run successful or publish learner-facing artifacts.
"""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG_PATH = REPO_ROOT / "config/mock_pipeline_orchestrator.json"
DEFAULT_STATE_ROOT = REPO_ROOT / "data/mock_ingestion/orchestrator"
TERMINAL_STATES = {
    "SUCCESS",
    "SUCCESS_WITH_REVIEW",
    "REVIEW_REQUIRED",
    "INPUT_REJECTED",
    "FAILED_RETRYABLE",
    "FAILED_PERMANENT",
}
SUCCESS_STATES = {"SUCCESS", "SUCCESS_WITH_REVIEW"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def relative_or_absolute(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return str(path)


def merge_dict(base: dict, override: dict) -> dict:
    result = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = merge_dict(result[key], value)
        else:
            result[key] = value
    return result


def load_config(path: Path, repo_root: Path) -> dict:
    defaults = {
        "schemaVersion": 1,
        "sourceDirectories": ["CLAT Mock Papers", "CA Download"],
        "stateDirectory": "data/mock_ingestion/orchestrator",
        "pollSeconds": 10,
        "stableSeconds": 20,
        "stageTimeoutSeconds": 7200,
        "retries": {
            "intake_index": 1,
            "extraction_ocr": 2,
            "structure_answer_linking": 1,
            "classification_difficulty": 1,
            "adaptive_calibration": 1,
            "quality_gate": 0,
        },
    }
    if path.is_file():
        defaults = merge_dict(defaults, json.loads(path.read_text(encoding="utf-8")))
    state_directory = Path(defaults["stateDirectory"])
    if not state_directory.is_absolute():
        state_directory = repo_root / state_directory
    defaults["stateDirectory"] = state_directory
    defaults["sourceDirectories"] = [
        directory if Path(directory).is_absolute() else str(repo_root / directory)
        for directory in defaults["sourceDirectories"]
    ]
    return defaults


@dataclass(frozen=True)
class SourceSnapshot:
    fingerprint: str
    files: tuple[dict, ...]

    @property
    def file_count(self) -> int:
        return len(self.files)


def scan_sources(repo_root: Path, source_directories: Iterable[str]) -> SourceSnapshot:
    records = []
    for raw_directory in source_directories:
        directory = Path(raw_directory)
        if not directory.is_dir():
            raise FileNotFoundError(f"Configured mock source directory does not exist: {directory}")
        paths = (
            path for path in directory.rglob("*")
            if path.is_file() and path.name.lower().endswith(".pdf")
        )
        for path in sorted(paths, key=lambda item: item.as_posix().lower()):
            if path.is_symlink():
                continue
            stat = path.stat()
            records.append({
                "path": relative_or_absolute(path, repo_root),
                "bytes": stat.st_size,
                "mtimeNs": stat.st_mtime_ns,
            })
    encoded = json.dumps(records, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return SourceSnapshot(hashlib.sha256(encoded).hexdigest(), tuple(records))


def invalid_pdf_inputs(repo_root: Path, snapshot: SourceSnapshot) -> list[dict]:
    errors = []
    for record in snapshot.files:
        path = Path(record["path"])
        if not path.is_absolute():
            path = repo_root / path
        if record["bytes"] == 0:
            errors.append({"path": record["path"], "issue": "empty_file"})
            continue
        try:
            with path.open("rb") as handle:
                header = handle.read(5)
        except OSError as error:
            errors.append({"path": record["path"], "issue": f"unreadable: {error}"})
            continue
        if header != b"%PDF-":
            errors.append({"path": record["path"], "issue": "invalid_pdf_signature"})
    return errors


def detected_source_removals(repo_root: Path, snapshot: SourceSnapshot) -> list[str]:
    catalogue_path = repo_root / "src/data/source_catalogue.json"
    if not catalogue_path.is_file():
        return []
    try:
        catalogue = json.loads(catalogue_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    current_paths = {record["path"] for record in snapshot.files}
    known_paths = {source.get("path") for source in catalogue.get("sources", []) if source.get("path")}
    return sorted(known_paths - current_paths)


class RunStore:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        self.connection = sqlite3.connect(path)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA journal_mode=WAL")
        self.connection.execute("PRAGMA foreign_keys=ON")
        self._create_schema()

    def close(self):
        self.connection.close()

    def _create_schema(self):
        self.connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS runs (
                id TEXT PRIMARY KEY,
                trigger TEXT NOT NULL,
                state TEXT NOT NULL,
                success INTEGER NOT NULL DEFAULT 0,
                source_fingerprint TEXT NOT NULL,
                file_count INTEGER NOT NULL,
                started_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                ended_at TEXT,
                error TEXT,
                summary_json TEXT NOT NULL DEFAULT '{}'
            );
            CREATE TABLE IF NOT EXISTS stages (
                run_id TEXT NOT NULL,
                stage_id TEXT NOT NULL,
                worker TEXT NOT NULL,
                state TEXT NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0,
                started_at TEXT,
                ended_at TEXT,
                exit_code INTEGER,
                command_json TEXT NOT NULL DEFAULT '[]',
                log_path TEXT,
                error TEXT,
                PRIMARY KEY (run_id, stage_id),
                FOREIGN KEY (run_id) REFERENCES runs(id)
            );
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                level TEXT NOT NULL,
                event TEXT NOT NULL,
                payload_json TEXT NOT NULL DEFAULT '{}',
                FOREIGN KEY (run_id) REFERENCES runs(id)
            );
            CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at DESC);
            CREATE INDEX IF NOT EXISTS idx_events_run_id ON events(run_id, id);
            """
        )
        self.connection.commit()

    def recover_interrupted(self):
        now = utc_now()
        self.connection.execute(
            "UPDATE stages SET state='INTERRUPTED', ended_at=?, error='Orchestrator process stopped' "
            "WHERE state='RUNNING'",
            (now,),
        )
        self.connection.execute(
            "UPDATE runs SET state='FAILED_RETRYABLE', success=0, ended_at=?, updated_at=?, "
            "error='Orchestrator process stopped before completion' WHERE state='RUNNING'",
            (now, now),
        )
        self.connection.commit()

    def create_run(self, trigger: str, snapshot: SourceSnapshot) -> str:
        run_id = f"run_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}_{uuid.uuid4().hex[:8]}"
        now = utc_now()
        self.connection.execute(
            "INSERT INTO runs(id, trigger, state, source_fingerprint, file_count, started_at, updated_at) "
            "VALUES (?, ?, 'RUNNING', ?, ?, ?, ?)",
            (run_id, trigger, snapshot.fingerprint, snapshot.file_count, now, now),
        )
        self.connection.commit()
        return run_id

    def start_stage(self, run_id: str, stage_id: str, worker: str, attempt: int, commands: list[list[str]], log_path: Path):
        now = utc_now()
        self.connection.execute(
            """
            INSERT INTO stages(run_id, stage_id, worker, state, attempts, started_at, command_json, log_path)
            VALUES (?, ?, ?, 'RUNNING', ?, ?, ?, ?)
            ON CONFLICT(run_id, stage_id) DO UPDATE SET
                state='RUNNING', attempts=excluded.attempts, started_at=excluded.started_at,
                ended_at=NULL, exit_code=NULL, command_json=excluded.command_json,
                log_path=excluded.log_path, error=NULL
            """,
            (run_id, stage_id, worker, attempt, now, json.dumps(commands), str(log_path)),
        )
        self.connection.execute("UPDATE runs SET updated_at=? WHERE id=?", (now, run_id))
        self.connection.commit()

    def finish_stage(self, run_id: str, stage_id: str, state: str, exit_code: int, error: str | None = None):
        now = utc_now()
        self.connection.execute(
            "UPDATE stages SET state=?, ended_at=?, exit_code=?, error=? WHERE run_id=? AND stage_id=?",
            (state, now, exit_code, error, run_id, stage_id),
        )
        self.connection.execute("UPDATE runs SET updated_at=? WHERE id=?", (now, run_id))
        self.connection.commit()

    def finish_run(self, run_id: str, state: str, summary: dict, error: str | None = None):
        now = utc_now()
        self.connection.execute(
            "UPDATE runs SET state=?, success=?, summary_json=?, error=?, ended_at=?, updated_at=? WHERE id=?",
            (state, int(state in SUCCESS_STATES), json.dumps(summary), error, now, now, run_id),
        )
        self.connection.commit()

    def event(self, run_id: str, event: str, payload: dict | None = None, level: str = "INFO"):
        self.connection.execute(
            "INSERT INTO events(run_id, created_at, level, event, payload_json) VALUES (?, ?, ?, ?, ?)",
            (run_id, utc_now(), level, event, json.dumps(payload or {})),
        )
        self.connection.commit()

    def latest_terminal_fingerprint(self) -> str | None:
        row = self.connection.execute(
            "SELECT source_fingerprint FROM runs WHERE state IN ({}) ORDER BY started_at DESC LIMIT 1".format(
                ",".join("?" for _ in TERMINAL_STATES)
            ),
            tuple(sorted(TERMINAL_STATES)),
        ).fetchone()
        return row["source_fingerprint"] if row else None

    def run_detail(self, run_id: str | None = None) -> dict | None:
        if run_id:
            row = self.connection.execute("SELECT * FROM runs WHERE id=?", (run_id,)).fetchone()
        else:
            row = self.connection.execute("SELECT * FROM runs ORDER BY started_at DESC LIMIT 1").fetchone()
        if not row:
            return None
        result = dict(row)
        result["success"] = bool(result["success"])
        result["summary"] = json.loads(result.pop("summary_json"))
        stages = self.connection.execute(
            "SELECT * FROM stages WHERE run_id=? ORDER BY started_at, stage_id", (result["id"],)
        ).fetchall()
        result["stages"] = []
        for stage in stages:
            item = dict(stage)
            item["commands"] = json.loads(item.pop("command_json"))
            result["stages"].append(item)
        return result

    def history(self, limit: int = 10) -> list[dict]:
        rows = self.connection.execute(
            "SELECT * FROM runs ORDER BY started_at DESC LIMIT ?", (max(1, limit),)
        ).fetchall()
        output = []
        for row in rows:
            item = dict(row)
            item["success"] = bool(item["success"])
            item["summary"] = json.loads(item.pop("summary_json"))
            output.append(item)
        return output


@dataclass(frozen=True)
class Stage:
    stage_id: str
    worker: str
    commands: tuple[tuple[str, ...], ...]


class StageFailure(RuntimeError):
    def __init__(self, stage: Stage, exit_code: int, message: str):
        super().__init__(message)
        self.stage = stage
        self.exit_code = exit_code


class MockPipelineOrchestrator:
    def __init__(self, repo_root: Path, config: dict, store: RunStore):
        self.repo_root = repo_root
        self.config = config
        self.store = store
        self.state_root = Path(config["stateDirectory"])
        self.run_root = self.state_root / "runs"
        self.run_root.mkdir(parents=True, exist_ok=True)
        self.latest_status_path = self.state_root / "latest_run.json"

    def _python(self, script: str, *arguments: str) -> tuple[str, ...]:
        return (sys.executable, str(self.repo_root / "scripts" / script), *arguments)

    def stages(self, run_directory: Path) -> list[Stage]:
        publication = run_directory / "publication"
        bank = publication / "adaptive_verified_mock_bank.json"
        candidates = publication / "adaptive_candidate_priors.jsonl"
        item_report = publication / "adaptive_item_report.json"
        calibration = publication / "adaptive_item_calibration.json"
        calibration_report = publication / "adaptive_calibration_report.json"
        validation_report = publication / "adaptive_validation_report.json"
        catalogue_arguments = []
        for directory in self.config["sourceDirectories"]:
            catalogue_arguments.extend(("--source-directory", relative_or_absolute(Path(directory), self.repo_root)))
        return [
            Stage(
                "intake_index",
                "Intake and Index Worker",
                (
                    self._python("catalog_clat_sources.py", *catalogue_arguments),
                    self._python("build_mock_ingestion_manifest.py"),
                ),
            ),
            Stage(
                "extraction_ocr",
                "Extraction and OCR Worker",
                (self._python("extract_pdf_library_pages.py"),),
            ),
            Stage(
                "structure_answer_linking",
                "Structure and Answer-Linking Worker",
                (self._python("parse_mock_question_candidates.py"),),
            ),
            Stage(
                "classification_difficulty",
                "Classification and Difficulty Worker",
                (
                    self._python(
                        "enrich_adaptive_item_bank.py",
                        "--bank-output", str(bank),
                        "--candidate-output", str(candidates),
                        "--report-output", str(item_report),
                    ),
                ),
            ),
            Stage(
                "adaptive_calibration",
                "Adaptive Calibration Service",
                (
                    self._python(
                        "recalibrate_adaptive_items.py",
                        "--bank", str(bank),
                        "--output", str(calibration),
                        "--report-output", str(calibration_report),
                    ),
                ),
            ),
            Stage(
                "quality_gate",
                "Quality and Publication Worker",
                (
                    self._python("validate_mock_ingestion.py"),
                    self._python(
                        "validate_adaptive_item_bank.py",
                        "--bank", str(bank),
                        "--calibration", str(calibration),
                        "--candidate-priors", str(candidates),
                        "--report-output", str(validation_report),
                    ),
                ),
            ),
        ]

    def _snapshot_status(self, run_id: str):
        detail = self.store.run_detail(run_id)
        if detail:
            temporary = self.latest_status_path.with_suffix(".json.tmp")
            temporary.write_text(json.dumps(detail, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            os.replace(temporary, self.latest_status_path)

    def _refresh_admin_snapshot(self, run_id: str):
        command = [sys.executable, str(self.repo_root / "scripts/build_mock_pipeline_admin_snapshot.py")]
        completed = subprocess.run(
            command,
            cwd=self.repo_root,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            check=False,
        )
        if completed.returncode:
            self.store.event(
                run_id,
                "admin_snapshot_failed",
                {"exitCode": completed.returncode, "output": completed.stdout[-2000:]},
                level="WARNING",
            )
        else:
            self.store.event(run_id, "admin_snapshot_refreshed")

    def _run_stage(self, run_id: str, run_directory: Path, stage: Stage):
        retries = max(0, int(self.config.get("retries", {}).get(stage.stage_id, 0)))
        timeout = max(1, int(self.config.get("stageTimeoutSeconds", 7200)))
        commands = [list(command) for command in stage.commands]
        last_error = None
        for attempt in range(1, retries + 2):
            log_path = run_directory / "logs" / f"{stage.stage_id}.attempt-{attempt}.log"
            log_path.parent.mkdir(parents=True, exist_ok=True)
            self.store.start_stage(run_id, stage.stage_id, stage.worker, attempt, commands, log_path)
            self.store.event(run_id, "stage_started", {"stage": stage.stage_id, "worker": stage.worker, "attempt": attempt})
            self._snapshot_status(run_id)
            print(f"[{run_id}] {stage.stage_id} attempt {attempt} started", flush=True)
            exit_code = 0
            try:
                with log_path.open("a", encoding="utf-8") as log:
                    log.write(f"[{utc_now()}] {stage.worker}\n")
                    for command in commands:
                        log.write(f"$ {json.dumps(command)}\n")
                        log.flush()
                        completed = subprocess.run(
                            command,
                            cwd=self.repo_root,
                            stdout=log,
                            stderr=subprocess.STDOUT,
                            text=True,
                            timeout=timeout,
                            check=False,
                        )
                        exit_code = completed.returncode
                        if exit_code:
                            raise StageFailure(stage, exit_code, f"Command exited with {exit_code}")
                self.store.finish_stage(run_id, stage.stage_id, "SUCCESS", 0)
                self.store.event(run_id, "stage_succeeded", {"stage": stage.stage_id, "attempt": attempt})
                self._snapshot_status(run_id)
                print(f"[{run_id}] {stage.stage_id} succeeded", flush=True)
                return
            except subprocess.TimeoutExpired:
                exit_code = 124
                last_error = f"Stage exceeded {timeout} seconds"
            except StageFailure as error:
                exit_code = error.exit_code
                last_error = str(error)
            except Exception as error:  # Persist unexpected worker failures before retrying.
                exit_code = 1
                last_error = f"{type(error).__name__}: {error}"
            state = "RETRYING" if attempt <= retries else "FAILED"
            self.store.finish_stage(run_id, stage.stage_id, state, exit_code, last_error)
            self.store.event(
                run_id,
                "stage_failed",
                {"stage": stage.stage_id, "attempt": attempt, "error": last_error, "willRetry": attempt <= retries},
                level="ERROR",
            )
            self._snapshot_status(run_id)
            if attempt <= retries:
                time.sleep(min(2 ** (attempt - 1), 10))
        raise StageFailure(stage, exit_code, last_error or "Stage failed")

    def _prepare_calibration(self, run_directory: Path):
        live = self.repo_root / "src/data/adaptive_item_calibration.json"
        target = run_directory / "publication/adaptive_item_calibration.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        if live.is_file() and not target.exists():
            shutil.copy2(live, target)

    def _publication_map(self, run_directory: Path) -> list[tuple[Path, Path]]:
        publication = run_directory / "publication"
        return [
            (publication / "adaptive_candidate_priors.jsonl", self.repo_root / "data/mock_ingestion/adaptive_candidate_priors.jsonl"),
            (publication / "adaptive_item_report.json", self.repo_root / "data/mock_ingestion/adaptive_item_report.json"),
            (publication / "adaptive_calibration_report.json", self.repo_root / "data/mock_ingestion/adaptive_calibration_report.json"),
            (publication / "adaptive_validation_report.json", self.repo_root / "data/mock_ingestion/adaptive_validation_report.json"),
            (publication / "adaptive_item_calibration.json", self.repo_root / "src/data/adaptive_item_calibration.json"),
            # Publish the bank last; it is the learner-facing activation boundary.
            (publication / "adaptive_verified_mock_bank.json", self.repo_root / "src/data/adaptive_verified_mock_bank.json"),
        ]

    def _publish(self, run_id: str, run_directory: Path) -> dict:
        manifest = {"schemaVersion": 1, "runId": run_id, "publishedAt": utc_now(), "artifacts": []}
        for source, target in self._publication_map(run_directory):
            if not source.is_file():
                raise RuntimeError(f"Validated publication artifact is missing: {source}")
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_name(f".{target.name}.{run_id}.tmp")
            shutil.copy2(source, temporary)
            os.replace(temporary, target)
            manifest["artifacts"].append({
                "path": relative_or_absolute(target, self.repo_root),
                "sha256": sha256_file(target),
                "bytes": target.stat().st_size,
            })
        manifest_path = run_directory / "publication_manifest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        return manifest

    def _run_summary(self, run_id: str, run_directory: Path, publication_manifest: dict) -> dict:
        validation_path = self.repo_root / "data/mock_ingestion/validation_report.json"
        adaptive_path = run_directory / "publication/adaptive_validation_report.json"
        catalogue_path = self.repo_root / "src/data/source_catalogue.json"
        validation = json.loads(validation_path.read_text(encoding="utf-8"))
        adaptive = json.loads(adaptive_path.read_text(encoding="utf-8"))
        catalogue = json.loads(catalogue_path.read_text(encoding="utf-8"))
        review_count = int(validation.get("summary", {}).get("reviewIssues", 0))
        changes = catalogue.get("changes", {})
        return {
            "runId": run_id,
            "operationalSuccess": True,
            "indexedDocuments": validation.get("summary", {}).get("indexedDocuments", 0),
            "extractedPages": validation.get("summary", {}).get("extractedPages", 0),
            "questionCandidates": validation.get("summary", {}).get("questionCandidates", 0),
            "verifiedAdaptiveItems": adaptive.get("summary", {}).get("verifiedAdaptiveItems", 0),
            "reviewRequiredCount": review_count,
            "changes": {key: len(value) for key, value in changes.items() if isinstance(value, list)},
            "publishedArtifacts": len(publication_manifest["artifacts"]),
            "publicationManifest": relative_or_absolute(run_directory / "publication_manifest.json", self.repo_root),
        }

    def execute(
        self,
        snapshot: SourceSnapshot,
        trigger: str,
        force: bool = False,
        allow_removals: bool = False,
    ) -> dict:
        latest_fingerprint = self.store.latest_terminal_fingerprint()
        if not force and latest_fingerprint == snapshot.fingerprint:
            return {
                "state": "NO_CHANGES",
                "success": True,
                "sourceFingerprint": snapshot.fingerprint,
                "fileCount": snapshot.file_count,
            }

        run_id = self.store.create_run(trigger, snapshot)
        run_directory = self.run_root / run_id
        run_directory.mkdir(parents=True, exist_ok=True)
        (run_directory / "source_snapshot.json").write_text(
            json.dumps({"fingerprint": snapshot.fingerprint, "files": snapshot.files}, indent=2) + "\n",
            encoding="utf-8",
        )
        self.store.event(run_id, "run_started", {"trigger": trigger, "fileCount": snapshot.file_count})
        self._snapshot_status(run_id)

        removals = detected_source_removals(self.repo_root, snapshot)
        if removals and not allow_removals:
            summary = {
                "operationalSuccess": False,
                "removedSources": removals,
                "approvalRequired": "Restore the files or rerun manually with --allow-removals.",
            }
            self.store.finish_run(run_id, "REVIEW_REQUIRED", summary, "Previously indexed PDFs are missing")
            self.store.event(run_id, "source_removal_blocked", summary, level="ERROR")
            self._snapshot_status(run_id)
            self._refresh_admin_snapshot(run_id)
            return self.store.run_detail(run_id)

        invalid_inputs = invalid_pdf_inputs(self.repo_root, snapshot)
        if invalid_inputs:
            summary = {"operationalSuccess": False, "invalidInputs": invalid_inputs}
            self.store.finish_run(run_id, "INPUT_REJECTED", summary, "One or more .pdf files are invalid")
            self.store.event(run_id, "input_rejected", summary, level="ERROR")
            self._snapshot_status(run_id)
            self._refresh_admin_snapshot(run_id)
            return self.store.run_detail(run_id)

        try:
            stages = self.stages(run_directory)
            for stage in stages:
                if stage.stage_id == "adaptive_calibration":
                    self._prepare_calibration(run_directory)
                self._run_stage(run_id, run_directory, stage)
            publication_stage = Stage("atomic_publication", "Orchestrator Publication Commit", ())
            publication_log = run_directory / "logs/atomic_publication.attempt-1.log"
            self.store.start_stage(run_id, publication_stage.stage_id, publication_stage.worker, 1, [], publication_log)
            self.store.event(run_id, "stage_started", {"stage": publication_stage.stage_id, "worker": publication_stage.worker, "attempt": 1})
            self._snapshot_status(run_id)
            try:
                publication_manifest = self._publish(run_id, run_directory)
            except Exception as error:
                self.store.finish_stage(
                    run_id,
                    publication_stage.stage_id,
                    "FAILED",
                    1,
                    f"{type(error).__name__}: {error}",
                )
                self.store.event(
                    run_id,
                    "stage_failed",
                    {"stage": publication_stage.stage_id, "attempt": 1, "error": str(error), "willRetry": False},
                    level="ERROR",
                )
                raise
            self.store.finish_stage(run_id, publication_stage.stage_id, "SUCCESS", 0)
            self.store.event(run_id, "stage_succeeded", {"stage": publication_stage.stage_id, "attempt": 1})
            summary = self._run_summary(run_id, run_directory, publication_manifest)
            final_state = "SUCCESS_WITH_REVIEW" if summary["reviewRequiredCount"] else "SUCCESS"
            self.store.finish_run(run_id, final_state, summary)
            self.store.event(run_id, "run_succeeded", {"state": final_state, **summary})
        except StageFailure as error:
            final_state = "REVIEW_REQUIRED" if error.stage.stage_id == "quality_gate" else "FAILED_RETRYABLE"
            summary = {
                "operationalSuccess": False,
                "failedStage": error.stage.stage_id,
                "failedWorker": error.stage.worker,
                "exitCode": error.exit_code,
            }
            self.store.finish_run(run_id, final_state, summary, str(error))
            self.store.event(run_id, "run_failed", {"state": final_state, **summary, "error": str(error)}, level="ERROR")
        except Exception as error:
            summary = {"operationalSuccess": False, "failedStage": "atomic_publication"}
            self.store.finish_run(run_id, "FAILED_RETRYABLE", summary, f"{type(error).__name__}: {error}")
            self.store.event(run_id, "run_failed", {**summary, "error": str(error)}, level="ERROR")
        self._snapshot_status(run_id)
        self._refresh_admin_snapshot(run_id)
        return self.store.run_detail(run_id)


@contextmanager
def orchestrator_lock(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = path.open("a+")
    try:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        handle.close()
        raise RuntimeError("Another mock-pipeline orchestrator is already running")
    try:
        yield
    finally:
        fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        handle.close()


def stable_snapshot(repo_root: Path, config: dict, stable_seconds: float) -> SourceSnapshot:
    first = scan_sources(repo_root, config["sourceDirectories"])
    if stable_seconds > 0:
        time.sleep(stable_seconds)
    second = scan_sources(repo_root, config["sourceDirectories"])
    if first.fingerprint != second.fingerprint:
        raise RuntimeError("PDF source directories are still changing; retry after file copying finishes")
    return second


def print_json(value):
    print(json.dumps(value, indent=2, ensure_ascii=False, default=str))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG_PATH)
    subparsers = parser.add_subparsers(dest="command", required=True)

    once = subparsers.add_parser("run-once", help="Run when inputs changed, or force a complete cached sync")
    once.add_argument("--force", action="store_true")
    once.add_argument("--skip-stability-wait", action="store_true")
    once.add_argument("--allow-removals", action="store_true")

    watch = subparsers.add_parser("watch", help="Continuously watch the source directories")
    watch.add_argument("--poll-seconds", type=float)
    watch.add_argument("--stable-seconds", type=float)

    status = subparsers.add_parser("status", help="Print the latest run with worker status")
    status.add_argument("--run-id")

    history = subparsers.add_parser("history", help="Print recent orchestration runs")
    history.add_argument("--limit", type=int, default=10)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    config = load_config(args.config, REPO_ROOT)
    state_root = Path(config["stateDirectory"])
    store = RunStore(state_root / "orchestrator.sqlite3")
    orchestrator = MockPipelineOrchestrator(REPO_ROOT, config, store)
    try:
        if args.command == "status":
            print_json(store.run_detail(args.run_id) or {"state": "NEVER_RUN"})
            return
        if args.command == "history":
            print_json({"runs": store.history(args.limit)})
            return

        with orchestrator_lock(state_root / "orchestrator.lock"):
            store.recover_interrupted()
            if args.command == "run-once":
                wait_seconds = 0 if args.skip_stability_wait else float(config["stableSeconds"])
                snapshot = stable_snapshot(REPO_ROOT, config, wait_seconds)
                result = orchestrator.execute(
                    snapshot,
                    trigger="MANUAL",
                    force=args.force,
                    allow_removals=args.allow_removals,
                )
                print_json(result)
                if result.get("state") not in SUCCESS_STATES | {"NO_CHANGES"}:
                    raise SystemExit(1)
                return

            poll_seconds = max(1.0, args.poll_seconds or float(config["pollSeconds"]))
            stable_seconds = max(0.0, args.stable_seconds if args.stable_seconds is not None else float(config["stableSeconds"]))
            observed = None
            stable_since = time.monotonic()
            print_json({
                "state": "WATCHING",
                "directories": config["sourceDirectories"],
                "pollSeconds": poll_seconds,
                "stableSeconds": stable_seconds,
            })
            while True:
                snapshot = scan_sources(REPO_ROOT, config["sourceDirectories"])
                if observed != snapshot.fingerprint:
                    observed = snapshot.fingerprint
                    stable_since = time.monotonic()
                elif time.monotonic() - stable_since >= stable_seconds:
                    result = orchestrator.execute(snapshot, trigger="DIRECTORY_WATCH", force=False)
                    if result.get("state") != "NO_CHANGES":
                        print_json({"runId": result.get("id"), "state": result.get("state"), "success": result.get("success")})
                    stable_since = time.monotonic()
                time.sleep(poll_seconds)
    except KeyboardInterrupt:
        print_json({"state": "STOPPED", "reason": "keyboard_interrupt"})
    finally:
        store.close()


if __name__ == "__main__":
    main()
