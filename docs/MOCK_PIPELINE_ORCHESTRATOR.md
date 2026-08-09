# Mock Pipeline Orchestrator

Date: 3 August 2026

## Purpose

The mock-pipeline orchestrator watches the configured PDF directories, creates an auditable run when their contents change, executes the specialist workers in a fixed order, retries safe worker failures and publishes learner-facing adaptive artifacts only after independent validation succeeds.

The orchestrator is deterministic code. OCR and semantic components may use models internally, but a model cannot mark a run successful or bypass the publication gate.

## Worker topology

| Order | Worker | Responsibility | Publication authority |
|---|---|---|---|
| 1 | Intake and Index Worker | Detect, hash, deduplicate, identify and manifest PDFs | No |
| 2 | Extraction and OCR Worker | Route native text and scanned pages through extraction/OCR | No |
| 3 | Structure and Answer-Linking Worker | Recover passages, questions, options and answer-key associations | No |
| 4 | Classification and Difficulty Worker | Assign module, skill, content difficulty prior and timing target | No |
| 5 | Quality and Publication Worker | Reconcile integrity and adaptive eligibility using independent validators | Approves only |
| — | Orchestrator Publication Commit | Atomically replace validated artifacts, publishing the bank last | Yes, after approval |
| — | Adaptive Calibration Service | Blend privacy-safe learner telemetry into published content priors | No direct question publication |

The active classification implementation is deterministic and rubric-based. Its boundary is compatible with a future structured-output Agents SDK specialist, but the ingestion pipeline does not require an API key or model availability to complete.

## Watched directories

The defaults are stored in `config/mock_pipeline_orchestrator.json`:

- `CLAT Mock Papers`
- `CA Download`

Only files ending in `.pdf` are watched recursively. A file must remain unchanged for the configured stability window and must begin with a valid PDF signature before workers start. Temporary downloads and partially copied PDFs therefore do not enter the pipeline.

The watcher fails closed when a previously indexed PDF disappears. It records `REVIEW_REQUIRED` and does not run or publish until the file is restored. An intentional removal must be performed manually with `python3 scripts/mock_pipeline_orchestrator.py run-once --force --allow-removals`.

## Commands

Run the pipeline only if the watched file fingerprint changed:

```bash
npm run orchestrate:mock-library
```

Force a complete cache-aware run without waiting for the file-stability interval:

```bash
npm run orchestrate:mock-library:force
```

Start the continuous watcher:

```bash
npm run watch:mock-library
```

The watcher must remain running in a terminal or be managed by an operating-system process supervisor. It polls every 10 seconds and waits until the complete PDF set has remained stable for 20 seconds before starting a run.

Inspect the current or most recent run:

```bash
npm run status:mock-library
npm run history:mock-library
```

Rebuild the sanitized Admin dashboard snapshot without rerunning PDF ingestion:

```bash
npm run snapshot:mock-library-admin
```

## Admin question-layer dashboard

Every terminal run refreshes `public/data/mock_pipeline_admin.json`. The authenticated Admin portal presents:

- the complete worker journey, stage duration, attempts and outcome;
- new, modified, moved and missing PDF counts;
- per-source page, question, answer, module and review contribution;
- before/after/delta totals for candidates and verified adaptive items;
- five-module stock and Foundation / Exam Standard / Advanced mix;
- the publication funnel and human-review backlog;
- recent orchestration history and downloadable sanitized audit JSON.

The dashboard payload contains operational aggregates and source filenames only. It excludes raw OCR text, question content, learner telemetry, worker commands and filesystem log paths. The local watcher refreshes the snapshot immediately, while a deployed static site requires a new deployment or a protected live status API to receive the refreshed file.

## Run state machine

```text
RUNNING
  -> SUCCESS
  -> SUCCESS_WITH_REVIEW
  -> REVIEW_REQUIRED
  -> INPUT_REJECTED
  -> FAILED_RETRYABLE
  -> FAILED_PERMANENT
```

- `SUCCESS`: all stages and validators passed, artifacts were published, and no question review flags remain.
- `SUCCESS_WITH_REVIEW`: operational pipeline success and safe publication completed, while unverified candidates remain in the human-review backlog.
- `REVIEW_REQUIRED`: the quality gate failed; learner-facing artifacts were not published.
- `INPUT_REJECTED`: a `.pdf` file is empty, unreadable or does not have a valid PDF signature.
- `FAILED_RETRYABLE`: a worker or publication operation failed after its configured retries.
- `FAILED_PERMANENT`: reserved for failures that an operator has classified as non-retryable.
- `NO_CHANGES`: no run was created because the watched fingerprint matches the last terminal run.

A run is successful only when every worker completed, both validators passed, all candidate publication artifacts exist and the learner bank was replaced atomically as the final publication action.

## Persistence and monitoring

Runtime state is stored locally under `data/mock_ingestion/orchestrator/`:

- `orchestrator.sqlite3`: durable run, stage and event registry.
- `latest_run.json`: current status snapshot for tools or a future admin dashboard.
- `runs/<run-id>/source_snapshot.json`: exact file-set trigger evidence.
- `runs/<run-id>/logs/`: stdout/stderr for each worker attempt.
- `runs/<run-id>/publication/`: isolated candidate artifacts.
- `runs/<run-id>/publication_manifest.json`: hashes of artifacts actually published.

SQLite write-ahead logging and a process lock prevent concurrent orchestrators. If the watcher process stops during a run, its active run and stage are marked retryable/interrupted when the next controller acquires the lock.

## Retry policy

The default retries are deliberately conservative:

- intake/index: 1 retry;
- extraction/OCR: 2 retries;
- structure/answer linking: 1 retry;
- classification: 1 retry;
- adaptive calibration: 1 retry;
- quality gate: no automatic retry.

Validation failure requires investigation rather than repeated execution. Retry counts, stage timeout, poll interval and stability interval are configurable.

## Human review boundary

OCR candidates may be indexed, parsed, classified and difficulty-rated while remaining non-publishable. Only exact verified staging questions with official answer-key evidence may enter `adaptive_verified_mock_bank.json`. The current review backlog therefore produces `SUCCESS_WITH_REVIEW`, not a false claim that every OCR candidate is learner-ready.
