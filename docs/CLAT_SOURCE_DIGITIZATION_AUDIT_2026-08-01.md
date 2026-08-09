# CLAT source digitization audit

Date: 1 August 2026

## Outcome

The two new source directories are now catalogued without modifying their PDFs. The catalogue is provenance-first: every file has a stable source ID, original path, SHA-256 hash, page count, provider/exam inference, asset role, text-extraction status, likely answer-key relationship, duplicate information, and ingestion readiness.

The first production batch is complete. Four Career Launcher Prime CLAT 2027 papers (Mocks 10, 11, 13, and 14) have been converted into 480 provenance-backed questions with official answer keys. English Language, Legal Reasoning, and CLAT Mock Papers are now learner-facing modules; the original PDFs remain untouched.

## Source inventory

| Measure | Result |
|---|---:|
| PDFs | 202 |
| Total pages | 8,925 |
| Total size | 3,368,513,367 bytes |
| Files in `CLAT Mock Papers` | 147 |
| Files in `CA Download` | 55 |
| CLAT-labelled files | 146 |
| AILET-labelled files | 19 |
| Reference/unspecified files | 37 |
| CLAT mock papers | 78 |
| AILET mock papers | 11 |
| Answer-key/explanation files | 45 |
| Current-affairs sources | 41 |
| Sectional sources | 8 |
| Filename-matched paper/key pairs | 39 |

Readiness after sampling the opening and closing pages:

| Readiness | Files | Meaning |
|---|---:|---|
| Ready for structured extraction | 44 | Text is extractable and no missing OCR dependency was detected. |
| Text ready, answer key missing | 49 | Questions can be parsed, but scoring must remain disabled until an official key is supplied or verified. |
| Paper text ready, key needs OCR | 35 | The paper is extractable; the matching answer/explanation PDF is scanned. |
| Needs OCR | 56 | The primary asset is image-only or too sparse for reliable parsing. |
| Reference only | 18 | Schedules, score reports, indexes, and non-question references. |

One exact duplicate group was found: `Current Affairs - April - II.pdf` and `Current Affairs - April - II (2).pdf`. Neither source file was deleted.

## Current product coverage and gaps

The app now has six learner-facing study tracks:

- Quant and Logical Reasoning together, backed by 1,230 questions.
- Static GK, backed by 1,585 questions.
- Current Affairs, backed by the knowledge graph, dossiers, Q-cards, and the GK question bank.
- English Language, backed by 96 passage-based questions across four source mocks.
- Legal Reasoning, backed by 120 passage-based questions across four source mocks.
- CLAT Mock Papers, with four complete 120-question papers and section-level launch controls.

The next core CLAT improvements are:

1. Add per-section analytics to full-mock result reports.
2. Add independent Logical Reasoning and Quant sectional views for mock-derived questions.
3. Expand the verified mock library with text-readable Law Prep pairs.
4. Add detailed worked explanations where sources provide only an answer key.

The current `MockTestEngine` renders the complete 120-question sequence with a 120-minute timer and +1/-0.25 scoring. Questions retain section metadata, but the result report still needs section-level timing and analytics.

## Career Launcher Prime production batch

| Paper | Questions | Passage/direction groups | Answer source |
|---|---:|---:|---|
| Prime Mock 10 | 120 | 20 | Eight-page typed answer key, OCR plus rendered-page review |
| Prime Mock 11 | 120 | 20 | Handwritten grid, rendered-page transcription |
| Prime Mock 13 | 120 | 22 | Handwritten grid, rendered-page transcription |
| Prime Mock 14 | 120 | 21 | Handwritten grid, rendered-page transcription |

All 480 questions have four ordered options and an official answer. A separate rendered-page audit covered every Quant passage. It restored the Prime 10 mango-grade table as structured text and the Prime 14 `16⅔%` diesel-reduction value that raw PDF extraction had omitted.

## Digitization contract

Every promoted question should retain:

- Stable question ID and mock ID.
- Exam, provider, year, section, topic, and difficulty.
- Original source catalogue ID, PDF path/hash, source page, and original question number.
- Shared passage/directions ID plus passage text.
- Question text, four ordered options, official correct option, and explanation.
- Visual dependency marker and image crop when a table, chart, or diagram is required.
- Verification state: extracted, OCR-reviewed, answer-key-matched, visually verified, and production-approved.

No question should enter a scored module with a guessed answer. Missing keys should remain explicit and unscored in staging.

## Pilot digitization

The first Quant mock from `QT Compilation CLAT 2025.pdf` was chosen because the questions and official explanations are contained in the same text-readable source.

- 12 of 12 questions digitized.
- Two shared data passages retained.
- Four options and official keys verified for every question.
- Question pages 1-3 and answer pages 150-152 rendered and visually reviewed.
- Fractional answer choices lost by raw PDF extraction were restored from the rendered page.
- The batch remains in staging and is not yet mixed into `question_bank.json`.

## Recommended build order

1. Add section-level full-mock analytics and review filters.
2. Digitize the next text-readable Law Prep pairs.
3. Process the 30 text-readable 12MTC mocks only when their official answer keys are available; until then they can be parsed into unscored staging.
4. OCR the 56 image-heavy sources last, prioritizing unique papers over duplicates and score reports.
5. De-duplicate and map the 41 CA sources into the Current Affairs knowledge graph by month/topic before generating or importing questions.

## Quality gates for every batch

1. Source hash still matches the catalogue.
2. Expected question count and numbering are complete.
3. Passage-to-question grouping matches the rendered PDF.
4. Exactly four ordered options exist for every MCQ.
5. Official keys match the answer source; no inferred key is presented as official.
6. Charts, tables, maps, and diagrams are captured and linked.
7. A rendered-page spot check covers the first, middle, last, and every visually dependent question.
8. The batch validator passes before production promotion.

## Working files

- `src/data/source_catalogue.json`: complete machine-readable catalogue.
- `scripts/catalog_clat_sources.py`: reproducible catalogue generator.
- `src/data/staging/qt_compilation_mock_01.json`: verified pilot batch.
- `src/data/staging/career_launcher_prime/`: four provenance-rich 120-question mock datasets.
- `src/data/staging/career_launcher_prime_answer_keys.json`: reviewed answer-key transcription record.
- `src/data/clat_mock_bank.json`: compact 480-question browser payload.
- `scripts/digitize_cl_prime_mocks.py`: reproducible Career Launcher parser.
- `scripts/build_clat_mock_bank.py`: compact production-payload builder.
- `scripts/validate_digitized_mocks.py`: staging integrity and provenance validator.
