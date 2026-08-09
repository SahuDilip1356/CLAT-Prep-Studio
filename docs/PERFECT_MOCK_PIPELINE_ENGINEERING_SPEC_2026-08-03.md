# CLAT Prep Studio

## Perfect Mock-Paper Digitisation and Question-Layer Engineering Specification

**Version:** 1.0  
**Status:** Baseline design authority  
**Date:** 3 August 2026  
**Primary objective:** Convert entitled CLAT mock-paper PDFs into a provenance-complete, academically verified, adaptive-ready question layer  
**Product boundary:** This specification ends at the canonical publishable question contract; stitching that contract into learner journeys in CLAT Prep Studio is a separate product phase  
**Audience:** Founders, academics, content operations, product, engineering, learning science, privacy, security and quality assurance

---

## 1. Executive decision

CLAT Prep Studio will operate a **deterministic, provenance-first content factory**. Specialist OCR and semantic workers may propose text, structure, classification and difficulty, but no OCR engine or generative model may independently publish a scored question. Publication remains a code-owned, policy-owned and human-accountable decision.

The pipeline is successful only when it preserves the source, captures the complete learning object, proves the official answer, records every transformation, passes automated gates and—where confidence is insufficient—routes the smallest possible unit to a reviewer.

> “Perfect” does not mean that one OCR engine reads every page without error. It means that no silent loss, guessed answer or untraceable transformation can cross into the learner library.

The target flow is:

```text
Stable PDF arrival
-> immutable source registration
-> page-level extraction routing
-> structure and answer linking
-> five-module and skill classification
-> content-based difficulty prior
-> automated reconciliation and human review
-> atomic publication to a versioned canonical question layer
-> later telemetry-based recalibration
```

### 1.1 Non-negotiable decisions

- Native text extraction is preferred when usable, but it is never assumed complete merely because text exists.
- OCR is page-routed, not blindly document-routed. Native text, Tesseract, Chandra and DeepSeek-style second opinion are tools in an evidence cascade.
- The orchestrator is deterministic. Model workers cannot declare the overall run successful.
- Every scored item must have official-answer evidence. An OCR-derived answer remains a candidate until reconciled or reviewed.
- Candidate extraction and learner publication are distinct stores and states.
- Difficulty begins as an explicit content prior and becomes empirical only after enough learner telemetry.
- Every published item remains traceable to source ID, PDF hash, page, region and transformation versions.
- Missing, replaced or modified files fail closed; published history is never silently rewritten.
- The canonical question layer is product-neutral. CLAT Prep Studio consumes it later through a versioned interface.

## 2. Why this pipeline exists

Mock PDFs are designed for reading and printing, not reliable machine ingestion. They combine selectable text, scans, handwritten keys, multi-column layouts, charts, tables, watermarks, running headers, continuation pages and inconsistent numbering. A single extraction technique cannot reliably preserve all of these.

The business risk is not merely poor OCR. It is **false completeness**: a stem appears readable while a fraction, negation, option label, diagram, answer key or passage boundary is missing. Such defects can teach the wrong rule, score a learner incorrectly and corrupt adaptive sequencing.

The pipeline must therefore optimise for five outcomes:

1. **Completeness:** all relevant pages, questions, passages, options, visuals and answer evidence are accounted for.
2. **Correctness:** the learner object matches the rendered source and official key.
3. **Provenance:** every field can be traced and reproduced.
4. **Operability:** new or changed files are detected, processed, monitored and recoverable.
5. **Adaptive readiness:** verified content carries a stable taxonomy and honest difficulty prior without pretending that a cold-start estimate is empirical.

## 3. Current repository baseline

This section records what is actually present as of 3 August 2026. It is not a claim that all sources are learner-ready.

| Measure | Current evidence |
| --- | ---: |
| Indexed PDFs | 202 |
| Indexed bytes | 3,368,513,367 |
| Indexed pages | 8,925 |
| Native-text pages | 5,357 |
| Tesseract OCR pages | 3,346 |
| Sparse native pages | 222 |
| Pages flagged for visual review | 4,259 |
| Question-bearing sources | 97 |
| Parsed question candidates | 11,138 |
| Candidates with an attached answer candidate | 3,783 |
| Verified learner-ready items | 492 |
| Recorded review issues | 5,703 |
| Empirically calibrated items | 0 |

### 3.1 Candidate distribution

| Five-module block | Parsed candidates | Verified items |
| --- | ---: | ---: |
| English | 2,369 | 96 |
| GK: Static + Current Affairs | 2,286 | 112 |
| Legal Reasoning | 2,287 | 120 |
| Logical Reasoning: Analytical + Critical | 2,942 | 104 |
| QP / Quantitative Techniques | 1,254 | 60 |
| **Total** | **11,138** | **492** |

### 3.2 Source workflow inventory

| Workflow state | Sources | Interpretation |
| --- | ---: | --- |
| `DIGITIZED_STAGING` | 5 | Verified staging assets exist; promotion remains a controlled action |
| `ANSWER_KEY_OCR_PENDING` | 32 | Question text is usable, but key evidence needs OCR/review |
| `FULL_OCR_PENDING` | 4 | Primary paper needs full extraction escalation |
| `TEXT_BLOCKED_MISSING_KEY` | 55 | Question text may be parsed, but no official key permits scored publication |
| `OCR_BLOCKED_MISSING_KEY` | 1 | Both extraction and key availability block publication |

### 3.3 What is implemented now

- SHA-256 source catalogue with page counts, inferred provider/exam/asset type, relationships and readiness.
- Page extraction cache using native PDF text and Tesseract OCR.
- Rule-based question candidate parsing, answer-candidate attachment, five-module classification and content-prior difficulty.
- A deterministic local orchestrator with source stability checks, PDF signature checks, source removal protection, locks, SQLite run registry, retries, interruption recovery, validators and atomic bank-last publication.
- A generated admin snapshot and admin component showing run and content-layer change information.
- A verified seed of 480 Career Launcher full-mock questions plus 12 Quant questions.

### 3.4 What is not implemented now

- Chandra or DeepSeek OCR integration and a measured engine-routing benchmark.
- A production-grade protected pipeline API or continuously running watcher service.
- A complete reviewer workbench with page crops, key reconciliation and approval workflows.
- Model-assisted granular skill classification with formal evaluation.
- Comprehensive explanations and distractor rationales for all verified items.
- Learner telemetry ingestion sufficient for empirical difficulty calibration.
- Production deployment, alerting, backup/restore exercises and operational service-level reporting.
- Final stitching of the canonical mock library into CLAT Prep Studio learner journeys.

## 4. Scope and boundaries

### 4.1 In scope

- Discovery of new, changed, moved, duplicated and missing PDFs in configured source directories.
- Immutable indexing, source relationships and rights/status metadata.
- Page rendering, native extraction, OCR routing and visual asset capture.
- Passage, question, option, answer and explanation structure recovery.
- Classification into the five requested modules and granular skills.
- Content-based difficulty prior, target-time prior and confidence.
- Exact and semantic deduplication.
- Automated validation, human review, approval and atomic publication.
- Run orchestration, observability, audit, security, privacy and governance.
- A canonical output contract suitable for later product integration and adaptive sequencing.

### 4.2 Explicitly out of scope for this phase

- Designing the learner-facing mock, drill or tutor screens.
- Changing existing CLAT Prep Studio navigation or module journeys.
- Using unverified candidates in scored learning.
- Generating unofficial answer keys to overcome missing source keys.
- Rebuilding the broader learner adaptive engine, except for its input and telemetry contracts.
- Acquiring content rights or answer keys; the pipeline records entitlement and missing evidence but does not create it.

## 5. Design principles

| Principle | Required behaviour |
| --- | --- |
| Fail closed | Uncertainty prevents scored publication; it does not become a guessed value |
| Preserve originals | Source PDFs remain immutable and addressable by hash |
| Evidence over confidence | A model confidence score never substitutes for source evidence |
| Page-level routing | Different pages in one PDF may use different extraction engines |
| Minimal review unit | Route the affected page, region or field—not the entire library—when possible |
| Deterministic control plane | Code owns state transitions, retries, gates and publication |
| Idempotent processing | The same source version and pipeline version produce the same artifact IDs |
| Version everything | Source, extraction, parser, taxonomy, rubric, review and publication versions are retained |
| Separate staging from serving | Candidate data can be imperfect; learner-serving data cannot |
| Reproducible decisions | Every published field records how and why it was accepted |
| Privacy minimisation | Content processing contains no learner identifiers; telemetry is aggregated separately |
| Human accountability | A named role owns exceptions, answer disputes and final academic approval |

## 6. Vocabulary and truth states

| Term | Definition |
| --- | --- |
| Source document | One immutable PDF version identified by content hash |
| Source family | Related paper, answer key, explanation and revision assets |
| Page artifact | Rendered image, native text, OCR output and page-quality metadata for one page |
| Candidate | Machine-extracted object that has not passed publication gates |
| Learning object | Passage, question, option, answer, explanation or required visual with stable identity |
| Verified item | Question whose required fields and official answer evidence have passed gates |
| Published item | Verified item included in an immutable canonical library release |
| Difficulty prior | Content-based cold-start estimate with explicit uncertainty |
| Empirical difficulty | Telemetry-blended estimate after minimum evidence thresholds |
| Run | One orchestrated evaluation of a stable source snapshot |
| Review issue | A typed, actionable exception with owner, severity and resolution state |
| Success with review | Processing completed and safe artifacts were published, while unresolved candidates remained quarantined |

`EXTRACTED`, `PARSED`, `CLASSIFIED` and `ANSWER_CANDIDATE_ATTACHED` are never synonyms for `VERIFIED` or `PUBLISHED`.

## 7. Target architecture

The architecture has a deterministic control plane, an evidence-producing data plane and a separately governed adaptive layer.

```text
SOURCE ZONE
  configured folders -> file detector -> immutable source registry

CONTROL PLANE
  orchestrator -> state registry -> retries/locks -> quality policy -> atomic publisher

DATA PLANE
  page profiler -> extraction router -> layout/structure parser -> answer linker
  -> classifier -> difficulty prior -> validation/reconciliation -> human review

CANONICAL CONTENT PLANE
  versioned sources + passages + questions + options + answers + visuals + provenance

DOWNSTREAM BOUNDARY
  CLAT Prep Studio import/API -> mock library, drills, analytics and adaptive selector

CALIBRATION LOOP
  privacy-safe attempt aggregates -> item calibration -> new difficulty release
```

### 7.1 Recommended worker set

The best operating model is **one orchestrator plus five specialist workers and one human review role**. More autonomous agents would add hand-off ambiguity; fewer would combine incompatible failure domains.

| Component | Primary responsibility | May propose | May publish |
| --- | --- | --- | --- |
| Orchestrator | Detect, sequence, monitor, retry, gate and commit | Run outcome | Only after validators pass |
| Intake and Index Worker | Register immutable sources and relationships | Metadata and pairing | No |
| Extraction and OCR Worker | Produce page evidence and visual assets | Text/layout candidates | No |
| Structure and Answer-Linking Worker | Build passages, questions, options and key links | Structured candidates | No |
| Classification and Difficulty Worker | Assign module, skill and cold-start priors | Labels and priors | No |
| Quality and Publication Worker | Reconcile evidence and enforce schemas/policies | Gate result | Through orchestrator commit |
| Academic Reviewer | Resolve ambiguous content and approve exceptions | Corrected/approved fields | Approval enables publication |

Adaptive calibration is a downstream service, not an ingestion agent. It must not complicate source digitisation and must never rescue an unverified content item.

## 8. Orchestrator specification

### 8.1 Responsibilities

- Observe configured directories or receive a storage event.
- Wait for file stability before hashing.
- Reject empty files, invalid PDF signatures, encrypted/unreadable documents without an approved path, and unsafe path traversal.
- Compare the stable snapshot with the registry to identify new, modified, moved, duplicate and missing sources.
- Create a unique run and immutable input manifest.
- Execute only the stages required by the change set.
- Enforce concurrency limits and a single publication lock.
- Retry retryable failures with bounded exponential backoff and jitter.
- Resume interrupted runs from the last valid checkpoint.
- Record stage inputs, outputs, versions, duration, warnings and errors.
- Run independent validators before publication.
- Commit learner-ready artifacts atomically and last.
- Produce a final outcome: `SUCCESS`, `SUCCESS_WITH_REVIEW`, `REVIEW_REQUIRED`, `INPUT_REJECTED`, `FAILED_RETRYABLE` or `FAILED_PERMANENT`.

### 8.2 Trigger modes

| Trigger | Use | Requirement |
| --- | --- | --- |
| Filesystem watcher | Local/operator environment | Debounce and stable-size/mtime window |
| Object-storage event | Production upload zone | Event ID dedupe and object version validation |
| Scheduled reconciliation | Catch missed events | Full snapshot comparison without forced reprocessing |
| Manual run | Operations and recovery | Actor, reason and target scope recorded |
| Pipeline-version replay | Controlled migration | New release created; history preserved |

### 8.3 Success semantics

`SUCCESS` means every in-scope item met the run's intended gate. `SUCCESS_WITH_REVIEW` means the run safely published eligible items and created review issues for the rest. A green run never means “all extracted candidates are correct.” Admin reporting must show both run health and content readiness.

## 9. Intake, indexing and source registry

### 9.1 File acceptance

A file becomes eligible only after:

1. Its byte size and modification timestamp remain unchanged for the configured stability window.
2. The header matches a PDF signature and the file can be opened.
3. A complete SHA-256 hash is calculated.
4. Malware/security scanning passes in production.
5. The source directory and entitlement policy allow ingestion.

### 9.2 Source identity and change handling

- `source_document_id` identifies the conceptual source record.
- `source_version_id` identifies one immutable hash.
- Identical hashes are exact duplicates and reuse page artifacts.
- Same path with a new hash creates a new version; it never overwrites the previous version.
- Same hash at a new path is a move/alias, not a new content object.
- Missing files create a removal event. Existing canonical releases remain reproducible until an authorised retirement action occurs.

### 9.3 Required source metadata

Stable ID, source version, original filename/path, hash, byte count, page count, MIME/signature, encryption status, provider, exam, year, mock/section identifier, asset kind, language, question/key/explanation relationships, rights state, ingestion readiness, first seen, last seen and source-retirement state.

### 9.4 Source-family linking

Paper-to-key pairing uses an evidence hierarchy:

1. Explicit operator link or embedded source identifier.
2. Exact provider, exam, year and mock number match.
3. Validated filename-normalisation match.
4. Content similarity plus reviewer confirmation.

Fuzzy pairing alone cannot establish official-answer provenance.

## 10. Page profiling and native-text usability

Native extraction can fetch text, but it cannot guarantee the complete page. A usability gate must examine both text quality and page structure.

### 10.1 Page profile

For every page, record:

- rendered image dimensions and checksum;
- native character count, word count and text-block geometry;
- image coverage ratio and number of embedded images;
- rotation, skew, contrast and blur indicators;
- detected columns, tables, charts, handwriting and formula-like regions;
- likely page class: cover, instruction, question, passage, key, explanation, rough-work, advertisement or reference;
- extraction confidence and review reasons.

### 10.2 Native-text acceptance conditions

Native text is accepted as the primary candidate only when:

- expected character density is present;
- glyph corruption, replacement characters and nonsensical token rate are below thresholds;
- reading order agrees with layout geometry;
- option labels and question numbering are plausibly continuous;
- visible text regions have corresponding extracted tokens;
- table, fraction, superscript, symbol and diagram regions are either captured or explicitly represented as visual dependencies.

A page may be `NATIVE_PRIMARY` and still require a rendered-page comparison.

## 11. OCR routing and engine strategy

### 11.1 Routing cascade

| Route | Trigger | Output status |
| --- | --- | --- |
| Native parser | Usable text layer and simple layout | Primary candidate plus render reconciliation |
| Tesseract baseline | Scanned/simple printed page or unusable native layer | OCR candidate with confidence boxes |
| Chandra escalation | Complex layout, table, formula, mixed image/text or low baseline score | Layout-aware candidate |
| DeepSeek second opinion | Chandra/baseline disagreement, handwriting-like key or critical field uncertainty | Independent candidate; never automatic truth |
| Human transcription | Persistent disagreement or critical evidence failure | Reviewer-certified field/page |

The named model engines are target adapters, not current implementation claims. They may be replaced if a benchmark demonstrates better quality, licensing, latency or cost.

### 11.2 Critical-field policy

Negation words, numeric values, mathematical symbols, option labels, answer keys, passage citations and table cells receive stricter thresholds than ordinary prose. A high average page score cannot hide a low-confidence official answer.

### 11.3 OCR consensus

Each engine output is normalised without discarding raw text. Agreement is calculated at region, line and critical-token level. The system may auto-accept only when:

- two independent methods agree on the critical field;
- structural constraints also pass; and
- no conflicting higher-authority evidence exists.

Disagreement creates a typed issue such as `NUMERIC_TOKEN_CONFLICT`, `OPTION_LABEL_CONFLICT`, `KEY_CONFLICT`, `READING_ORDER_CONFLICT` or `VISUAL_DEPENDENCY_MISSING`.

### 11.4 OCR benchmark before production adoption

Create a reviewer-certified gold set of 300–500 representative pages covering native text, clean scan, low-resolution scan, tables, graphs, formulas/fractions, handwriting, multi-column passages, keys and explanations. Measure:

- character and word error rate for prose;
- exact critical-token accuracy;
- question/option boundary accuracy;
- table cell fidelity;
- reading-order accuracy;
- answer-key cell accuracy;
- page latency, GPU/CPU memory and cost;
- percentage of pages requiring human review after routing.

Select engines by **published-item defect reduction per unit cost**, not by generic OCR benchmark reputation.

## 12. Structural parsing specification

### 12.1 Required objects

The parser produces source sections, passages/directions, questions, options, answer candidates, explanations and visual dependencies. It must preserve continuation across pages and avoid attaching running headers or advertisements to content.

### 12.2 Boundary evidence

Question boundaries may use numbering, option patterns, typography, geometry, section headings, page order and expected exam ranges. When these disagree, the object is quarantined for review. Provider-specific parsing profiles are allowed, but the canonical schema remains provider-neutral.

### 12.3 Passage mapping

Every passage-based question references one stable `passage_id`. The passage records its full source region set, not only copied text. Questions may share directions or visuals without duplicating them.

### 12.4 Option requirements

- Original order and original label are retained.
- Normalised labels are `A`, `B`, `C`, `D` for four-option CLAT MCQs.
- Missing, duplicate or merged options block publication.
- An option containing a chart, formula or image retains a visual asset reference and accessible transcription.

### 12.5 Expected-count reconciliation

The parser compares observed numbering with source-declared totals and CLAT section patterns, but never invents missing questions. Gaps, duplicates, resets and over-counts become explicit issues with page evidence.

## 13. Answer and explanation linking

### 13.1 Evidence hierarchy

| Rank | Evidence | Publication use |
| --- | --- | --- |
| 1 | Reviewer-verified official explanation/key region | Authoritative |
| 2 | Two agreeing extractions of the official key with complete mapping | Eligible after structural gates |
| 3 | One OCR extraction of an official key | Candidate; review required for scored publication |
| 4 | Provider portal/manual entry with recorded authority | Eligible after independent verification policy |
| 5 | Solver/model inference | Diagnostic only; never official |

### 13.2 Mapping requirements

An answer is linked by source family, source question number, section context and option domain. Positional matching alone is not sufficient where numbers are missing or repeated. Conflicts never use majority vote across low-authority sources.

### 13.3 Missing keys

Questions without an official key may remain searchable in unscored staging for operations, but they cannot enter learner scored modules, calibration or adaptive selection. Their state remains `ANSWER_BLOCKED` with the missing evidence reason.

### 13.4 Explanations

Source explanations are separately extracted and linked. A generated explanation may be drafted only from a verified item and must be labelled by origin, validated against the official answer and approved before learner publication. Explanation absence can be permitted for a mock-only release if product policy allows; answer evidence cannot.

## 14. Five-module taxonomy

Every verified question has exactly one primary module and may have secondary skills. Classification must not rely only on question number because providers and exam variants differ.

| Module | Required subtype examples |
| --- | --- |
| QP / Quantitative Techniques | Percentages, ratios, averages, profit/loss, SI/CI, time-work, time-distance, DI table/chart, algebraic reasoning, approximation |
| GK: Static + Current Affairs | `GK_STATIC` or `GK_CURRENT_AFFAIRS`; polity, history, geography, economics, science, arts, awards, international affairs, legal/current events |
| Legal Reasoning | Principle-fact application, constitutional, criminal, contract, tort, family, property, jurisprudence, public law, contemporary legal issue |
| Logical Reasoning | `ANALYTICAL` or `CRITICAL`; arrangement, distribution, sequence, conditions, inference, assumption, strengthen/weaken, flaw, principle, paradox |
| English | Main idea, inference, tone, vocabulary-in-context, grammar, structure, summary, argument and literary comprehension |

### 14.1 Classification evidence

Store the proposed label, method, model/rule version, confidence, supporting signals and alternatives. Section heading and source position are useful evidence, not unquestionable truth. Low-confidence or cross-module conflicts go to an academic reviewer.

### 14.2 Taxonomy governance

The taxonomy has semantic versions and stable IDs. Renaming a display label does not change historical IDs. Splitting or merging a skill creates an explicit migration map and a new classification release.

## 15. Difficulty and adaptive-readiness specification

Difficulty is not a permanent property inferred from a provider name or mock number. It is a relationship between content demands and a learner population.

### 15.1 Cold-start content prior

Each item receives a difficulty level, numeric prior, target-time range, confidence and evidence signals. The rubric considers:

- passage length, density and vocabulary;
- number of reasoning steps and dependencies;
- abstraction and novelty of the required inference;
- distractor similarity and plausibility;
- quantitative setup depth, calculation burden and visual decoding;
- legal principle complexity and fact interaction;
- whether information must be integrated across sentences, tables or conditions;
- observed extraction uncertainty, which affects publishability but must not artificially make an item “hard.”

| Level | Label | Intended interpretation |
| --- | --- | --- |
| 1 | Foundation | Direct retrieval or single-step application with clear distractor separation |
| 2 | Developing | Limited synthesis or two-step application; moderate distractor plausibility |
| 3 | Exam Standard | Representative CLAT reasoning, pacing and ambiguity |
| 4 | Advanced | Multi-step integration, close options or heavier processing demand |
| 5 | Stretch | High transfer demand or unusually complex but still syllabus-relevant reasoning |

### 15.2 Initial psychometric fields

The canonical item may store conservative initial values for difficulty location, discrimination and guessing floor, but these are explicitly marked `CONTENT_PRIOR`. Provider prestige, answer position and mock sequence cannot set difficulty.

### 15.3 Telemetry calibration thresholds

| Valid attempts per item | Calibration status | Behaviour |
| --- | --- | --- |
| 0–29 | Expert content prior | Use the rubric with wide uncertainty |
| 30–99 | Telemetry calibrating | Strong shrinkage toward content prior |
| 100–249 | Empirical provisional | Increase empirical weight; retain uncertainty |
| 250+ | Empirical stable | Use the blended estimate for sequencing, subject to bias checks |

Valid attempts exclude previews, interrupted sessions, known content defects, duplicate immediate retries and suspicious automation. Calibration uses ability-conditioned correctness when sample size permits, plus active response time and distractor choice. A new calibration produces a versioned release; it never rewrites history.

### 15.4 Adaptive eligibility

An item is adaptive-ready only when it is published, has stable taxonomy IDs, an approved difficulty prior and target time, and no open blocking defect. Empirical stability is not required for cold start, but its absence must be visible.

## 16. Canonical data model

The canonical layer should use a relational registry plus object storage for source/render artifacts. JSON releases may be generated for application consumption, but JSON files are not the system of record in production.

### 16.1 Core entities

| Entity | Key fields |
| --- | --- |
| `source_document` | source ID, version ID, hash, metadata, rights state, lifecycle |
| `source_relationship` | paper/key/explanation links, evidence and reviewer |
| `page_artifact` | page number, render hash, text candidates, layout profile, engine versions |
| `visual_asset` | region coordinates, crop hash, type, transcription, alt text |
| `passage` | passage ID/version, text, region set, citations, shared directions |
| `question_candidate` | parser output, source number, proposed links and issues |
| `question_item` | canonical ID/version, stem, module/skill, status and provenance |
| `option` | stable option ID, original/normalised label, text and visual reference |
| `answer_evidence` | answer, authority, source region, method, confidence and conflicts |
| `explanation` | text/steps, origin, validation and approval state |
| `difficulty_profile` | rubric/model version, level, prior, time, signals and calibration status |
| `review_issue` | type, severity, target field/region, owner, decision and audit timestamps |
| `publication_release` | immutable release ID, manifest hash, included item versions and rollback pointer |

### 16.2 Identity rules

- Source IDs remain stable across path moves; source-version IDs change with bytes.
- Passage and question IDs are stable after first canonical approval.
- Material changes create a new item version under the same canonical ID.
- A source-local candidate ID may change with parser version and never becomes the learner identity.
- Exact duplicate items point to one canonical item through source aliases.

### 16.3 Provenance invariant

Every learner-visible stem, option, correct answer, passage, explanation and visual can be traced to:

```text
publication release
-> canonical item version
-> accepted field evidence
-> source version + page + bounding region
-> extraction/review decision
-> immutable source hash
```

### 16.4 Example canonical item

```json
{
  "itemId": "CLAT-Q-00001234",
  "version": 3,
  "status": "PUBLISHED",
  "module": "LOGICAL",
  "subtype": "CRITICAL",
  "skills": ["INFERENCE", "EVIDENCE_EVALUATION"],
  "passageId": "CLAT-P-00000456",
  "stem": "Which option is most strongly supported by the passage?",
  "options": [
    {"id": "A", "text": "..."},
    {"id": "B", "text": "..."},
    {"id": "C", "text": "..."},
    {"id": "D", "text": "..."}
  ],
  "correctOption": "C",
  "answerEvidenceId": "AE-009871",
  "difficulty": {
    "level": 3,
    "status": "CONTENT_PRIOR",
    "confidence": "MEDIUM",
    "rubricVersion": "2.0"
  },
  "provenance": {
    "sourceVersionId": "SV-...",
    "page": 18,
    "region": [72, 118, 1110, 1460]
  }
}
```

## 17. State machines

### 17.1 Source/run states

```text
DETECTED -> STABILISING -> ACCEPTED -> INDEXED -> PROCESSING
PROCESSING -> SUCCESS | SUCCESS_WITH_REVIEW | REVIEW_REQUIRED
PROCESSING -> FAILED_RETRYABLE -> PROCESSING
PROCESSING -> FAILED_PERMANENT
DETECTED/STABILISING -> INPUT_REJECTED
```

### 17.2 Item states

```text
RAW_CANDIDATE
-> EXTRACTED
-> STRUCTURED
-> CLASSIFIED
-> VALIDATION_PENDING
-> REVIEW_REQUIRED or ANSWER_BLOCKED or VERIFIED
-> PUBLISHED
-> SUPERSEDED or RETIRED
```

Only `VERIFIED` can transition to `PUBLISHED`. `REVIEW_REQUIRED` returns to the precise prior validation stage after resolution. `RETIRED` removes future serving eligibility without deleting audit history.

### 17.3 Issue severity

| Severity | Meaning | Publication impact |
| --- | --- | --- |
| Blocker | Wrong/missing stem, option, answer, passage or required visual | Item cannot publish |
| Major | Classification, difficulty or explanation defect that changes learning use | Affected capability cannot publish |
| Minor | Typography/metadata issue without semantic impact | May publish under policy with tracked remediation |
| Informational | Non-actionable observation | No impact |

## 18. Publication gates

Every item must pass all applicable gates in the same release candidate.

### 18.1 Mandatory content gates

1. Source version exists, is entitled and its hash matches.
2. Source question number and page/region provenance are present.
3. Passage/directions mapping is complete where required.
4. Stem is non-empty and reconciled against the rendered source.
5. Exactly four ordered options exist for a standard CLAT MCQ.
6. Required table, chart, map, formula or diagram is linked and legible.
7. Correct option has accepted official-answer evidence.
8. Answer option exists and is semantically unchanged from the source.
9. Primary module and required subtype are approved.
10. Difficulty prior, target time and confidence are present.
11. Exact/semantic duplicate disposition is recorded.
12. No blocker or major issue remains open for the intended capability.
13. Schema, referential-integrity and release-manifest validators pass.

### 18.2 Mock-level gates

- Expected paper question count is reconciled.
- Section totals and ordering are reconciled or explicitly approved as provider-specific.
- Question numbers are complete and unique within their scope.
- Shared passages and visuals render correctly in sequence.
- Official key coverage is complete for scored questions.
- Scoring rule and exam variant are explicit.

### 18.3 Atomic publication

Build a release in isolation, validate its manifest and checksums, then update a single serving pointer. If any step fails, the prior release remains active. Rollback changes only the pointer and creates an audit event.

## 19. Human review workbench

The reviewer workbench is the highest-priority missing operational component because it converts already-extracted candidates into trustworthy inventory.

### 19.1 Required layout

- Left: rendered source page with zoom, rotation and highlighted regions.
- Centre: passage, stem, options, answer and explanation as structured editable fields.
- Right: independent extraction candidates, official-key page, conflicts, validation results and provenance.
- Bottom: previous/next issue, decision, comment, confidence and keyboard-first batch actions.

### 19.2 Review queues

Queues must be filterable by provider, paper, module, issue type, severity, page class, engine disagreement, answer status, visual dependency and expected effort. Prioritisation should favour highest learner-ready yield per reviewer hour, while ensuring every module receives coverage.

### 19.3 Review actions

`ACCEPT`, `EDIT_AND_ACCEPT`, `REJECT_CANDIDATE`, `DEFER_MISSING_EVIDENCE`, `LINK_SOURCE`, `MARK_DUPLICATE`, `ESCALATE_ACADEMIC`, `RETIRE_SOURCE` and `REOPEN`.

Every edit records old/new value, source region, reviewer, timestamp, reason and review-policy version. Bulk approval is allowed only for homogeneous low-risk issues with displayed samples and reversible audit.

### 19.4 Separation of duties

Critical answer-key transcription should use either two-person verification or one reviewer plus independent extraction agreement. A reviewer cannot silently approve their own generated explanation where academic policy requires a second approver.

## 20. Deduplication and versioning

### 20.1 Duplicate layers

| Layer | Method | Decision |
| --- | --- | --- |
| File | SHA-256 equality | Reuse source artifact; retain path alias |
| Page | Render/text hashes | Reuse page processing when source rights permit |
| Exact question | Normalised passage/stem/options hash | One canonical item, multiple source attestations |
| Near duplicate | Embedding/MinHash plus structural similarity | Reviewer disposition |
| Conceptual variant | Same skill but material wording/data change | Separate item with similarity link |

### 20.2 Normalisation safety

Hash normalisation may standardise whitespace and Unicode forms, but cannot remove negations, units, punctuation that changes meaning, option order or numeric formatting. Raw and normalised representations are both retained.

### 20.3 Corrections

If a provider changes an official answer, create a new answer-evidence and item version. Identify affected attempts and downstream reports through release lineage. Never mutate the historical item served to a learner without a correction event.

## 21. Quality strategy and measurable targets

### 21.1 Quality dimensions

| Metric | Definition | Initial target before scale |
| --- | --- | ---: |
| Source coverage | Indexed eligible PDFs / discovered eligible PDFs | 100% |
| Page accounting | Pages with terminal extraction state / indexed pages | 100% |
| Critical-token accuracy | Exact verified critical tokens / gold critical tokens | >=99.8% |
| Question boundary F1 | Correct question spans against gold set | >=99.5% |
| Option-set exactness | Questions with exact ordered option set | >=99.8% |
| Passage-link accuracy | Correct question-to-passage links | >=99.5% |
| Official-answer accuracy | Published answers matching verified source | 100% |
| Required-visual coverage | Published visual-dependent items with valid asset | 100% |
| Provenance completeness | Published required fields with full lineage | 100% |
| Publish defect leakage | Learner-reported semantic defects / served items | <0.1%, with zero tolerance for wrong official answers |

Targets are acceptance policy, not current achieved claims. They should be revised only through documented governance, never to make a failing release appear green.

### 21.2 Review sampling

Even auto-accepted strata receive random audit samples. Sampling is risk-weighted by engine, provider, page class, critical field and recent defect rate. Any wrong-answer escape triggers immediate containment, expanded sampling and root-cause review.

### 21.3 Reconciliation reports

Each paper produces a completeness report: page accounting, expected/observed question numbers, option counts, passage groups, key coverage, visuals, duplicates, open issues and publication yield.

## 22. Evaluation and testing

### 22.1 Test pyramid

- Unit tests for file detection, hashing, normalisation, numbering, field validation and state transitions.
- Contract tests for every worker input/output schema.
- Golden-page tests for OCR/layout outputs and critical tokens.
- Golden-paper tests for end-to-end passages, questions, keys and counts.
- Property tests for idempotency, stable IDs and invalid-state rejection.
- Regression tests for every corrected production defect.
- Failure-injection tests for partial files, engine timeout, disk pressure, database lock, interrupted publication and missing source.
- Security tests for malicious PDFs, path traversal, oversized inputs and secrets in logs.
- Accessibility tests for reviewer controls and visual transcriptions.
- Load tests for the expected monthly page volume plus at least 3x burst capacity.

### 22.2 Model/engine evaluation

Any OCR or semantic model change runs against the frozen gold set. Promotion requires no regression on answer accuracy, option exactness or visual dependency detection. Improvements in average word error rate cannot compensate for a critical-field regression.

### 22.3 Reviewer calibration

Use double-coded samples and measure agreement for module, skill, difficulty and answer decisions. Disagreement updates the rubric or reviewer training before scaling.

## 23. Observability and admin journey

The admin surface must explain both **pipeline activity** and **how the question layer changed**.

### 23.1 Run view

- Trigger, actor, source snapshot and changed files.
- Stage timeline, attempts, durations, versions and terminal status.
- New, modified, duplicated, moved, missing and rejected sources.
- Artifact checksums and publication release.
- Retry, resume, quarantine and rollback actions subject to role.

### 23.2 Layer-change view

- Candidates added/updated/removed from eligibility.
- Verified and published items by module, skill, provider and difficulty.
- Answer coverage, visual dependencies and explanation coverage.
- Review backlog created/resolved, defect reasons and ageing.
- Exact/semantic duplicates consolidated.
- Prior versus new release diff with item-level drill-down.
- Difficulty changes separated into content-rubric changes and telemetry recalibration.

### 23.3 Required metrics and alerts

Alert on watcher silence, queue age, run failure, repeated engine timeout, extraction yield drop, question-count anomaly, answer-coverage drop, wrong-answer incident, publication failure, storage pressure, database backup failure and unexpected source removal.

Logs and traces use run/source/page/item IDs. Raw question text should be avoided in general logs; sensitive credentials and learner identifiers are prohibited.

## 24. Reliability and recovery

### 24.1 Reliability controls

- Durable queues or checkpointed stages in production.
- Idempotency key: source version + stage version + configuration hash.
- Bounded retries by error class; permanent schema/input defects go to quarantine.
- Heartbeats and stage timeouts.
- One publication writer with optimistic manifest verification.
- Independent serving and processing stores so a pipeline outage does not break the current learner library.
- Back-pressure when reviewer or downstream capacity is exceeded.

### 24.2 Recovery objectives

Define production objectives after infrastructure selection. Initial design targets:

- Serving library recovery point: no loss of committed release data.
- Pipeline registry recovery point: <=15 minutes.
- Serving rollback: <=15 minutes from authorised decision.
- Interrupted run recovery: automatic from last valid checkpoint.

Quarterly restore exercises must prove source registry, object artifacts, review audit and publication manifests can be recovered together.

## 25. Security, privacy, rights and governance

### 25.1 Security

- Treat PDFs as untrusted inputs; isolate parsers/OCR containers with resource limits.
- Encrypt source and canonical stores at rest and all transport in transit.
- Use role-based access for upload, review, approval, publication, retirement and rollback.
- Store secrets in a managed secret service; never in PDF metadata, source JSON, logs or admin snapshots.
- Sign or checksum release manifests and retain tamper-evident audit events.
- Maintain dependency and model provenance, vulnerability scanning and patch policy.

### 25.2 Content rights

Every source and canonical item carries a rights state: `UNKNOWN`, `REVIEW_REQUIRED`, `INTERNAL_EVALUATION`, `LICENSED`, `OWNED`, `RESTRICTED` or `RETIRED`. Technical readiness cannot override rights policy. Distribution, quotation and derivative-explanation permissions are separately expressible.

### 25.3 Privacy and DPDPA boundary

The ingestion pipeline processes content, not learner profiles. Learner telemetry enters only the calibration service through pseudonymous/aggregated events. Calibration outputs retain item statistics and cohort safeguards, not raw learner identities. Small cohorts are suppressed to reduce re-identification risk.

### 25.4 Governance roles

| Role | Accountable decision |
| --- | --- |
| Content owner | Source entitlement and academic policy |
| Pipeline owner | Reliability, stage versions and run operations |
| Academic lead | Answer disputes, taxonomy and difficulty rubric |
| Reviewer | Evidence-level content approval |
| Privacy/security owner | Access, retention, telemetry and incident controls |
| Product owner | Downstream use of released capabilities |

## 26. Performance and cost controls

- Cache immutable page renders and engine outputs by source version and stage version.
- Use native extraction for acceptable pages and escalate only hard regions/pages.
- Batch pages by engine and hardware profile while retaining page-level results.
- Process new/changed source versions incrementally; do not rebuild 8,925 pages for an unrelated addition.
- Set per-run page, time and cost budgets with an authorised override.
- Record compute seconds, GPU memory, model tokens where applicable and reviewer minutes per published item.
- Optimise for cost per verified item and review minutes saved, not raw pages per minute.

## 27. Deployment topology

### 27.1 Local/reference environment

The current command-line orchestrator remains useful for reproducible development and disaster diagnosis. A persistent local watcher may use a user service only after operational approval.

### 27.2 Production target

```text
Upload/object storage
-> event bus + scheduled reconciler
-> containerised deterministic orchestrator
-> isolated OCR/semantic worker pools
-> relational metadata/review database
-> immutable object artifact store
-> protected reviewer/admin application
-> atomic canonical release store/API
```

Development, staging and production use separate storage, databases, service identities and keys. Production release requires an approved build artifact and migration plan; it cannot run from a developer working tree.

### 27.3 Configuration

Configuration includes source zones, stability window, enabled engines, routing thresholds, concurrency, retry policy, taxonomy/rubric versions, rights policy and publication destination. Every run snapshots its resolved configuration with secrets removed.

## 28. Operational playbooks

### 28.1 New valid paper and key

Detect -> stabilise -> index both -> link family -> process changed pages -> parse -> reconcile key -> classify -> validate -> review exceptions -> publish eligible release -> report layer change.

### 28.2 Paper arrives without key

Index and extract -> parse candidates -> set `ANSWER_BLOCKED` -> do not publish scored items -> surface exact missing evidence -> re-trigger linking when the key later arrives.

### 28.3 File changes in place

Create a new source version -> diff page renders/text -> reprocess affected lineage -> validate impacted items -> publish a new release only after gates. Never mutate the previous release.

### 28.4 File disappears

Fail closed and alert. Preserve historical artifacts and serving release. Require an authorised retirement decision; do not infer that deletion from a watched folder means content must vanish from history.

### 28.5 OCR engines disagree on an answer

Block the affected item -> show key-region candidates side by side -> reviewer transcribes/approves with evidence -> rerun answer and paper reconciliation -> publish only in a new release.

### 28.6 Wrong answer reported after publication

Quarantine the item from new sessions if severity is credible -> preserve attempt evidence -> investigate source and review history -> correct with new version -> identify affected learners/reports according to product policy -> document root cause and add a regression fixture.

## 29. Acceptance criteria and Definition of Done

### 29.1 Pipeline release criteria

- A new PDF can be added without manual code editing.
- Stable arrivals, modifications, duplicates, moves and removals are correctly identified.
- Every page reaches a terminal extraction state with engine/version evidence.
- Hard pages route to escalation or review under measured thresholds.
- Structures and keys are reconciled with complete provenance.
- No guessed or unverified answer can enter a scored release.
- Five-module and subtype rules are versioned and evaluated.
- Candidate, verified and published states are physically/logically separated.
- Validators and publication are atomic, idempotent and recoverable.
- Admin users can explain exactly what changed between releases.
- Security, rights and privacy controls pass review.
- Backup/restore, rollback and interruption tests pass.

### 29.2 Content-release criteria

A paper is “digitised” only when its intended questions have complete structure, official keys, required visuals, taxonomy, difficulty priors, provenance and approvals. Merely producing page text or candidate JSON is not digitisation completion.

### 29.3 Production-complete criteria

The system is not production complete until the protected review/admin services are deployed, monitoring and alerting are live, operators are trained, runbooks are exercised, and at least two successive batches meet quality targets without manual engineering intervention.

## 30. Phased delivery roadmap

The roadmap honours the first objective: build the verified CLAT Prep Layer before advanced engineering sophistication.

| Phase | Priority | Outcome | Exit evidence |
| --- | ---: | --- | --- |
| 0. Baseline freeze | Done/current | Catalogue, candidates, 492 verified seed, deterministic local run | Reproducible reports and run history |
| 1. Content verification factory | **Now** | Reviewer workbench, key OCR/reconciliation and verified-item throughput | At least 28 CLAT key-pending sources processed by yield priority; zero guessed keys |
| 2. OCR benchmark and routing | Next | Gold set, Chandra/second-opinion adapters, measured thresholds | Critical-field and review-yield targets met |
| 3. Taxonomy and explanation enrichment | Next | Granular skills, explanations and reviewer calibration | Evaluated classification and explanation coverage |
| 4. Production control plane | Later | Durable events/queues, protected admin API, alerts, backups and service deployment | Operations readiness and recovery tests pass |
| 5. Product stitching | Separate phase | Canonical releases consumed by Mock, Drill and Tutor journeys | Product acceptance plan to be written after this spec |
| 6. Empirical adaptive calibration | After telemetry | Difficulty and timing recalibrated from privacy-safe evidence | Minimum attempt thresholds and bias checks pass |

### 30.1 Immediate implementation sequence

1. Freeze the canonical schema, truth states and publication gates in this specification.
2. Build the reviewer workbench and review database around existing candidates.
3. Create the OCR gold set from the present 4,259 visual-review pages, sampled by page class.
4. Process CLAT sources with paper text available and answer keys pending OCR; this yields verified items faster than full-paper OCR.
5. Add one advanced OCR adapter at a time and benchmark it before routing production pages.
6. Expand verified module balance and source-backed explanations.
7. Only then build the production watcher/control plane and product stitching.

## 31. Current implementation-to-target gap matrix

| Capability | Current state | Target state | Priority |
| --- | --- | --- | ---: |
| Source indexing | Implemented locally for two directories | Durable registry, events, rights workflow | High |
| Native extraction | Implemented | Page usability/reconciliation metrics | High |
| Tesseract OCR | Implemented baseline | Region confidence and benchmark routing | High |
| Chandra/DeepSeek | Not integrated | Pluggable measured escalation/second opinion | Medium |
| Structural parser | Rule-based candidates | Provider profiles + evaluated layout parser | High |
| Answer linking | Candidate attachment exists | Evidence hierarchy + reviewer reconciliation | **Highest** |
| Five-module classification | Deterministic/range-heavy | Granular evaluated taxonomy | High |
| Difficulty | Content priors only | Reviewed priors + telemetry calibration | Medium now, high later |
| Review workbench | Not complete | Side-by-side evidence workflow | **Highest** |
| Orchestrator | Deterministic local runner | Durable production service | Medium after content factory |
| Admin layer journey | Static snapshot/component | Protected live API, release diffs and actions | Medium |
| Canonical publication | JSON artifacts and atomic local commit | Database/object release registry and API | High |
| Product integration | Partial historic seed usage | Versioned CLAT Prep Studio consumer | Separate next phase |

## 32. Risks and mitigations

| Risk | Consequence | Mitigation |
| --- | --- | --- |
| False native-text completeness | Missing symbols/options despite readable prose | Render reconciliation and critical-region detection |
| OCR answer-key error | Wrong learner scoring | Independent evidence, stricter thresholds and human approval |
| Over-autonomous multi-agent design | Unclear responsibility and silent drift | Deterministic orchestrator and bounded specialist contracts |
| Candidate count mistaken for library size | Premature product claims | Separate candidate/verified/published metrics everywhere |
| Missing official keys | Large unscored backlog | Explicit blocked state and key-acquisition queue |
| Taxonomy drift | Inconsistent adaptive sequencing | Versioned IDs, rubric and migrations |
| Difficulty overconfidence | Poor learner ordering | Uncertainty-labelled priors and telemetry thresholds |
| Duplicate leakage | Repeated practice and biased calibration | Multi-layer dedupe before publication and calibration |
| Rights ambiguity | Distribution/compliance exposure | Rights state gate independent of technical quality |
| Reviewer bottleneck | Growing backlog | Risk-based queues, keyboard workflow and measured OCR escalation |
| Model/vendor change | Regressed extraction | Adapter contracts, frozen gold set and canary release |
| Source removal or overwrite | Broken reproducibility | Immutable versions and fail-closed retirement workflow |

## 33. Decisions to confirm before implementation

1. Which source rights states permit internal practice, learner distribution and generated explanations?
2. Is one reviewer plus independent OCR agreement sufficient for typed keys, while handwritten keys require two-person verification?
3. What explanation coverage is mandatory for a full mock versus a module drill?
4. Which advanced OCR engine should be benchmarked first given available hardware and licence constraints?
5. What is the initial production storage/database platform?
6. Which operator roles may publish, retire and roll back a release?
7. What defect threshold triggers automatic item quarantine and learner correction workflow?

These are governance choices. They do not block the current schema, review workbench or gold-set preparation.

## Appendix A. Minimum issue taxonomy

`INVALID_PDF`, `ENCRYPTED_UNREADABLE`, `SOURCE_REMOVED`, `SOURCE_RELATIONSHIP_UNCERTAIN`, `NATIVE_TEXT_SPARSE`, `GLYPH_CORRUPTION`, `READING_ORDER_CONFLICT`, `PAGE_CLASS_UNCERTAIN`, `QUESTION_NUMBER_GAP`, `QUESTION_BOUNDARY_CONFLICT`, `PASSAGE_LINK_MISSING`, `OPTION_MISSING`, `OPTION_DUPLICATE`, `OPTION_ORDER_CONFLICT`, `NUMERIC_TOKEN_CONFLICT`, `NEGATION_TOKEN_CONFLICT`, `VISUAL_DEPENDENCY_MISSING`, `KEY_MISSING`, `KEY_MAPPING_CONFLICT`, `KEY_OCR_LOW_CONFIDENCE`, `ANSWER_NOT_IN_OPTION_DOMAIN`, `CLASSIFICATION_CONFLICT`, `DIFFICULTY_REVIEW_REQUIRED`, `DUPLICATE_UNRESOLVED`, `RIGHTS_BLOCKED`, `EXPLANATION_CONFLICT` and `PUBLICATION_VALIDATION_FAILED`.

## Appendix B. Required release manifest

- Release ID, created time, actor/service and approval reference.
- Parent release and rollback pointer.
- Resolved pipeline, engine, parser, taxonomy and rubric versions.
- Source snapshot hash and included source-version hashes.
- Included passage/question/answer/explanation/visual versions.
- Counts by module, skill, difficulty, provider and status.
- Validation report hashes, open non-blocking issue summary and reviewer approvals.
- Rights-policy snapshot and serving-capability flags.
- Canonical payload/database snapshot checksum.

## Appendix C. Service-level indicators

- Time from stable arrival to indexed.
- Time from indexed to extraction terminal state.
- Time from extraction to review-ready candidate.
- Review queue age by severity and module.
- Verified items per reviewer hour.
- Pages/items reprocessed per source change.
- Engine escalation and disagreement rate.
- Publication success/rollback rate.
- Defect escape rate by engine, provider, issue and reviewer cohort.
- Cost per verified item and per published question.

## Appendix D. Design authority statement

This document is the baseline specification for engineering the mock-paper digitisation pipeline. Implementation may change libraries, models, databases or hosting providers, but it may not weaken source immutability, evidence lineage, answer authority, review accountability, publication gates or state separation without an approved specification revision.
