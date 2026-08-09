# Mock Library ingestion standard

Date: 2 August 2026

## Five-module taxonomy

Every extracted question must be assigned to exactly one primary module:

1. `QUANT` - QP / Quantitative Techniques.
2. `GK` - Static General Knowledge plus Current Affairs.
3. `LEGAL` - Legal Reasoning.
4. `LOGICAL` - Analytical and Critical Reasoning.
5. `ENGLISH` - English Language.

Full mock papers target all five modules. Sectional books target only the modules evidenced by their source title and content. A question is not assigned from option wording alone; section headers, question ranges and rendered pages are controlling evidence.

## Incremental indexing

Run `npm run sync:mock-library` after PDFs are added, replaced or renamed.

For automatic detection and auditable worker monitoring, keep `npm run watch:mock-library` running. It uses the durable orchestrator described in `docs/MOCK_PIPELINE_ORCHESTRATOR.md`; a run publishes learner-facing artifacts only after the ingestion and adaptive validators pass.

The sync process:

1. Scans `CLAT Mock Papers` and `CA Download` recursively.
2. Preserves existing `SRC-####` identifiers by path, or by hash when a file is renamed.
3. Detects new, modified, moved and missing sources.
4. Reuses prior PDF metadata for unchanged files, making later scans incremental.
5. Rebuilds paper/key relationships, duplicate groups and the prioritized ingestion manifest.
6. Extracts every page through the native-text/Tesseract router, reusing hash-matched caches.
7. Parses question candidates, answer-key candidates, five-module labels and provisional difficulty.
8. Writes a coverage report while keeping unverified OCR outside the learner-facing bank.

Replacing a PDF at the same path increments `sourceRevision`. A staged question remains tied to its recorded SHA-256 hash, so validation fails until the changed source is reviewed and re-digitized.

## OCR and verification

The local baseline uses `pdftotext -layout` when a page has usable embedded text. Sparse or image-only pages are rendered at 200 DPI and sent to Tesseract. Question papers use Tesseract page segmentation mode 4 to retain narrow question-number columns; other documents use automatic layout mode 3. The cache is versioned so a pipeline upgrade reprocesses old output.

OCR text is never treated as self-verifying. The extraction pipeline retains the source PDF, source page, original question number, source revision, source hash, extraction method, OCR confidence and visual-review signals.

Generated artifacts:

- `src/data/source_catalogue.json` - stable document index and change log.
- `src/data/mock_ingestion_manifest.json` - the 5-module work queue and paper/key relationships.
- `data/mock_ingestion/pages/SRC-####.json` - page-level native/OCR text and provenance.
- `data/mock_ingestion/candidates/SRC-####.json` - structurally parsed question candidates.
- `data/mock_ingestion/extraction_summary.json` - document/page extraction coverage.
- `data/mock_ingestion/digitization_report.json` - question, answer, module and review coverage.
- `data/mock_ingestion/adaptive_candidate_priors.jsonl` - non-publishable skill and difficulty priors for every parsed candidate.
- `src/data/adaptive_verified_mock_bank.json` - the only verified mock items selectable by the adaptive tutor.
- `src/data/adaptive_item_calibration.json` - aggregate telemetry overrides, separate from immutable source content.

`npm run extract:pdf-library` and `npm run parse:mock-library` run the stages separately. `npm run sync:mock-library` is the normal end-to-end command after adding files.

Rendered-page review is mandatory for:

- handwritten or grid-form answer keys;
- tables, charts, maps and diagrams;
- fractions, superscripts, mathematical signs and currency values;
- section transitions and passage boundaries;
- pages where OCR confidence or option detection is weak.

If an official answer key is absent, questions may be extracted into unscored staging but cannot enter a scored Mock Drill.

## Difficulty policy

Difficulty is not inferred from the coaching provider or mock number. The parser records a low-confidence `ESTIMATED` content rating for sequencing candidates; it does not become the final learner-facing rating until reviewed. Questions that have not reached structural parsing remain `UNRATED`.

Initial difficulty uses a recorded content rubric:

- number of reasoning or calculation steps;
- passage length and information density;
- number and similarity of plausible distractors;
- reliance on inference versus direct retrieval;
- data/table complexity and time pressure;
- specialist vocabulary or multi-rule legal application.

The initial scale is Foundation (1), Exam Standard (2), and Advanced (3). Once enough attempts exist, observed accuracy, median time, omission rate and distractor distribution calibrate the rating. Content review remains the fallback when telemetry is sparse.

## Publication gates

A scored question is publishable only when:

1. Source identity and hash match the catalogue.
2. Question numbering and section membership are complete.
3. Passage/directions mapping is reviewed.
4. Every MCQ has four ordered options.
5. The official answer is matched to its source key.
6. Visual dependencies are represented in text or a verified image asset.
7. Difficulty evidence is recorded.
8. Structural and provenance validators pass.
