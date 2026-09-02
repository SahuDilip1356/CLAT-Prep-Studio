# Repair Plans — Engineering Spec

_2026-08-29 · revised 2026-08-30 (§8.1 solution-quality reevaluation) · supersedes the
repair-plan half of `phase-0-mock-protection-and-repair-plan.md`_

## 1. Status correction

The Phase 0 doc and the 2026-08-20 session both record a blocker: *"mocks have no
diagnostic granularity."* **That is no longer true, and the spec below assumes it is not.**

Measured on 2026-08-29:

| Source | Items | `skillId` | `topic` | `difficultyLevel` |
|---|---:|---:|---:|---:|
| English bank | 1,195 | 1,195 | 1,195 | 1,195 |
| Legal bank | 1,549 | 1,549 | 1,549 | 1,549 |
| Logical bank | 1,694 | 1,694 | 1,694 | 1,694 |
| Static GK bank | 3,073 | 3,073 | 3,073 | 3,073 |
| Quant bank | 1,294 | 1,294 | 1,294 | 1,294 |
| Mock items (4 papers) | 480 | 480 | 480 | 480 |
| **Total** | **9,285** | **9,285** | **9,285** | **9,285** |

100% coverage, across **42 distinct skills** (4–9 per module). Mock questions get theirs
from `adaptive_verified_mock_bank.json`, merged at load in `src/data/clatMockBank.js:9`
— 480 of 480 overlays match, zero orphans.

Three more things already exist that the Phase 0 doc treats as future work:

- **Per-question timing** is captured and accumulates across revisits
  (`MockTestEngine.jsx:92-94`, emitted at `:166`).
- **IRT calibration** per item — `discriminationA`, `difficultyB`, `guessingC`,
  `priorCorrectProbabilityAtTheta0` — with an empirical-blend threshold at 30 attempts.
- **Attempt persistence** — `questionAttempts` already carries `skillId`,
  `difficultyLevel`, `timeSpentSeconds`, `calibrationStatus` (`App.jsx:680-697`);
  `errorNotebook` already keys by `module:questionId` with `wrongCount` and
  `revisionDueAt` (`App.jsx:698-727`).

**The data foundation is done.** What is missing is the analysis layer, the plan itself,
and the UI. That is the whole of this spec.

## 2. What a repair plan is

After a mock or a section session, a student sees a score. A score is not actionable.
A repair plan answers one question:

> **Given this attempt, what are the three-to-five things to fix, in what order, and
> what exactly do I do about each?**

Design constraints:

- **Bounded.** Maximum 5 items. A list of 14 weaknesses is a wall, not a plan.
- **Ranked by recoverable marks**, not by raw weakness. The worst skill is not always
  the one worth fixing first.
- **Prescriptive.** Every item names specific questions to review and a specific
  practice set to attempt, drawn from the existing banks.
- **Deterministic.** Same attempt in, same plan out. No model call.

## 3. Diagnosis — error modes

Raw accuracy conflates causes that need opposite remedies. A student who is wrong
because they rushed needs a pacing fix; one who is wrong after 140 seconds needs
the concept. The plan therefore classifies **every response** into an error mode
first, using signals that already exist.

Let `target = taxonomy.targetSeconds[module][difficultyLevel]` (e.g. LEGAL/2 = 80s)
and `r = timeSpentSeconds / target`.

| Mode | Condition | Reading |
|---|---|---|
| `CLEAN` | correct, `0.5 ≤ r ≤ 1.5` | Working as intended |
| `LABOURED_RIGHT` | correct, `r > 1.5` | Fragile fluency — got it, but the time cost that item bought was paid by another |
| `RUSHED` | wrong, `r < 0.5` | Carelessness, not ignorance |
| `LABOURED_WRONG` | wrong, `r > 1.5` | Genuine skill gap — engaged and still failed |
| `CONFIDENT_WRONG` | wrong, `0.5 ≤ r ≤ 1.5`, `priorCorrectProbabilityAtTheta0 ≥ 0.7` | Misconception — the item was easy and it read as answerable |
| `GUESS` | wrong, `r < 0.4`, `difficultyLevel = 3` | Rational triage, usually not a defect |
| `NOT_REACHED` | unattempted, in the final 20% of the section by question number | Pacing failure, not a knowledge failure |
| `SKIPPED` | unattempted, anywhere else | Deliberate avoidance — treat as weak signal for the skill |

`LABOURED_RIGHT` is the mode worth having built this for. It is invisible in a score
report and it is where a 95 becomes a 110 — the marks are lost on the *next* question,
not this one.

## 4. Skill aggregation and ranking

Group responses by `skillId` (primary only; `secondarySkillIds` are used for practice
retrieval, not for blame). For each skill compute:

```
attempted, correct, accuracy
expected      = mean(priorCorrectProbabilityAtTheta0)   // difficulty-adjusted baseline
delta         = accuracy - expected                     // the real signal
marksLost     = wrongCount * 1.25                       // +1 correct, -0.25 wrong
timeRatio     = mean(r)
dominantMode  = modal error mode among non-CLEAN responses
```

`delta` matters more than `accuracy`. Being 60% correct on Advanced Legal Reasoning
where the expected rate is 55% is a strength; 70% on Foundation GK where expected is 88%
is the leak.

**Ranking.** Order by `recoverableMarks = marksLost × recoverability[dominantMode]`:

| Mode | Weight | Why |
|---|---:|---|
| `CONFIDENT_WRONG` | 1.0 | One correction flips every future instance |
| `RUSHED` | 0.9 | Behavioural, fixes fast |
| `NOT_REACHED` | 0.8 | Pacing drill, high yield |
| `LABOURED_WRONG` | 0.6 | Real study, slower payoff |
| `LABOURED_RIGHT` | 0.5 | Fluency work, compounding but gradual |
| `SKIPPED` | 0.4 | Weak signal |
| `GUESS` | 0.1 | Often correct behaviour, near-zero priority |

Suppress any skill with `attempted < 4` — below that the sample is noise. Take the
top 5 survivors.

**Pacing is a plan item, not a skill.** If `NOT_REACHED ≥ 5` in any one section, emit a
section-level pacing item and let it occupy one of the five slots. It outranks
everything except a `CONFIDENT_WRONG` skill.

## 5. Data model

```jsonc
{
  "repairPlanId": "rp_<resultId>",
  "userId": "…",
  "resultId": "…",
  "paperId": "cl-prime-2027-10",       // null for section sessions
  "generatedAt": "2026-08-29T…",
  "source": { "mode": "strict", "pool": "strict", "module": null },
  "headline": { "score": 78.5, "marksLost": 41.5, "recoverableMarks": 22.0 },
  "items": [
    {
      "itemId": "rp_…_1",
      "kind": "SKILL",                  // SKILL | PACING
      "skillId": "LEGAL.PRINCIPLE_APPLICATION",
      "module": "LEGAL",
      "rank": 1,
      "diagnosis": {
        "mode": "CONFIDENT_WRONG",
        "attempted": 12, "correct": 5,
        "accuracy": 0.42, "expected": 0.71, "delta": -0.29,
        "timeRatio": 1.1,
        "marksLost": 8.75, "recoverableMarks": 8.75
      },
      "statement": "You are applying the stated principle to the wrong party. …",
      "review": ["cl-prime-2027-10-q044", "…"],   // ≤3, reasoned solution required;
                                                  // empty for mock items today — see §8.1
      "practice": {
        "skillId": "LEGAL.PRINCIPLE_APPLICATION",
        "difficultyLevel": 1,
        "questionIds": ["…"],           // 10, unseen, solution required
        "target": { "correct": 7, "of": 10 }
      },
      "status": "open",                 // open | in_progress | met | missed
      "attemptedAt": null, "result": null
    }
  ],
  "status": "open",                     // open | in_progress | complete
  "completedAt": null
}
```

Stored on user progress as `repairPlans: RepairPlan[]`, newest first, capped at 20.
Only the most recent open plan surfaces in the UI.

## 6. Practice set selection

Add `skillPracticeFrom(bank, skillId, level, limit, exclude)` to
`src/data/sectionBanks.js`, alongside the existing `topicPracticeFrom` /
`levelPracticeFrom` / `revisionSetFrom`. Selection rules, in order:

1. **Same `skillId`**, primary or in `secondarySkillIds`.
2. **`explanationQuality = 'reasoned'`.** Non-negotiable — a practice item with no
   explanation cannot remediate anything, and an answer-key placeholder
   (`"Official source answer key: Choice B."`) is not an explanation. Field presence is
   the wrong test; classify. This removes 3,492 of 9,285 items — see §8.1.
3. **Unseen.** Exclude anything in `questionAttempts`, and exclude every
   `pool: 'strict'` item outright. Repair practice must never burn a fresh mock.
4. **Difficulty targeting** by dominant mode:
   - `CONFIDENT_WRONG`, `LABOURED_WRONG` → one level *below* the failure level
     (rebuild the floor)
   - `RUSHED`, `LABOURED_RIGHT` → *at* the failure level (drill speed, not concept)
   - `NOT_REACHED` → at level, but delivered as a timed set
5. **Backfill** to `limit` from adjacent difficulty if the pool is short; if fewer than
   6 items are available, mark the practice set `"insufficient": true` and render the
   item as review-only rather than shipping a thin set.

## 7. Scheduling

`errorNotebook` currently sets a flat `revisionDueAt = now + 24h`. Replace with an
interval ladder keyed on `wrongCount`, resetting on a correct answer:

| `wrongCount` | Next review |
|---:|---|
| 1 | +1 day |
| 2 | +3 days |
| 3 | +7 days |
| 4+ | +14 days |

A repair item is `met` when the student hits its target, `missed` otherwise. A missed
item re-enters the next plan at rank 1 with its `wrongCount` incremented — a skill that
survives two plans is escalated in the UI as a standing weakness.

## 8. Prerequisites — the two real gaps

Neither is skill tagging. Both are content.

**8.1 — Only 62.4% of items carry a real explanation, and the mock bank carries none.**

_Revised 2026-08-30. The earlier figure in this section counted `solution` field
presence. That was the wrong test: a field reading `"Official source answer key:
Choice B."` is an answer key, not an explanation, and 1,786 items carry exactly that._

Classified against the `explanationQuality` enum the Phase 0 doc already defines:

| Source | Items | `none` | `answer-key` | `reasoned` | Usable |
|---|---:|---:|---:|---:|---:|
| Static GK | 3,073 | 422 | 34 | 2,617 | 85.2% |
| English | 1,195 | 323 | 4 | 868 | 72.6% |
| Legal | 1,549 | 445 | 4 | 1,100 | 71.0% |
| Logical | 1,694 | 394 | 500 | 800 | 47.2% |
| Quant | 1,294 | 122 | 764 | 408 | 31.5% |
| **Mock items** | **480** | **0** | **480** | **0** | **0.0%** |
| **Total** | **9,285** | **1,706** | **1,786** | **5,793** | **62.4%** |

Two conclusions, both of which change decisions made elsewhere in this spec:

**The mock bank has zero explanatory content.** All 480 mock solutions are one of
exactly four strings, maximum length 37 characters. The overlays in
`adaptive_verified_mock_bank.json` carry no `distractorAnalysis` or explanation field
either, despite the Phase 0 doc specifying one.

This breaks the `review` half of §5. A repair plan is generated *from a mock attempt*
and points the student back at the questions they got wrong — but with the
solution-required filter applied, `review` is empty for every mock-sourced item on
every plan. The feature does **not** degrade safely here as §6 assumes; it produces a
diagnosis with nothing to read. Either mock solutions get written, or §5 `review` must
fall back to the practice set alone and say so plainly in the UI.

**Quant is the worst module, not the best.** On field presence it looked strongest
(122 missing). On explanation quality it is last at 31.5% — 764 of its 1,172 present
solutions are answer-key placeholders. Legal, which the earlier draft called
worst-covered, is mid-table. Any content sequencing built on the old table is wrong.

This is known ground. Commit `b0c10ec` (2026-08-11) found the same defect in Quant,
established that the source PDFs cannot supply the missing methods, and built the
pipeline to fix it by hand:

- `data/authored_solutions.json` — authored solutions as a generator **input**, so a
  bank rebuild preserves them
- `scripts/verify_authored_solutions.mjs` (`npm run verify:solutions`) — fails if an
  authored answer disagrees with the bank, if the text never states the answer it
  claims, or if a placeholder survives
- provenance `AUTHORED_UNREVIEWED` — correct and checkable, not faculty-reviewed

**That file still holds 15 solutions, unchanged in 19 days.** The machinery works and
is idle. The gap is 1,786 answer-key placeholders plus 1,706 absent, against a
demonstrated rate of 15 per sitting.

**Recommended order**, by marks-per-unit-effort rather than by count:

1. **480 mock solutions** — unblocks the `review` half of every repair plan. Nothing
   else in this spec is blocked by content; this is.
2. **764 Quant placeholders** — worst module, and the one where a worked method is
   worth most.
3. **500 Logical placeholders.**
4. The 1,706 absent solutions, lowest priority — the §6 filter already hides them
   cleanly, so they cost pool size, not correctness.

**8.2 — Calibration is all prior, no empirical.** Every item currently reads
`calibrationStatus: "EXPERT_CONTENT_PRIOR"` with `attempts: 0`; the empirical blend
needs 30 attempts, stability needs 250. `expected` in §4 is therefore an authored
estimate, not observed behaviour. Acceptable for v1 — it is still far better than
comparing raw accuracy across difficulties — but the plan should not present `delta`
as precision. Revisit once real attempt volume exists.

## 9. Architecture — a deviation from the Phase 0 doc

Phase 0 specifies `POST /api/repair-plans/generate` and `POST /api/mocks/submit`.
**Recommend against both.** Build it as a pure client-side module,
`src/repairPlan.js`, with no API surface.

Reasons:

- Every input is already local. Banks are bundled at build time; attempt data is in
  App state and syncs through the existing Firebase path.
- The engine is deterministic rules over ~120 responses. There is nothing a server does
  better, and no model call to hide.
- A new authenticated endpoint costs auth surface, a DPDPA review, and cold starts, to
  compute something that takes under 10ms in the browser.
- It stays testable as a pure function — plain Node tests, no fixtures for HTTP.

Keep `/api/coach/alerts` out of scope entirely; it is a Phase 1 idea with no consumer.

If server-side generation is ever needed (a parent-facing digest, say), the same pure
module runs unchanged in a function. Nothing here forecloses that.

## 10. Frontend

- **`src/repairPlan.js`** *(new)* — `classifyResponse`, `aggregateBySkill`,
  `rankSkills`, `buildRepairPlan`. Pure, no React, no I/O.
- **`src/components/TestResults.jsx`** — currently 193 lines and a single table.
  Add tabs: **Summary · Sections · Mistakes · Repair Plan**. Existing table becomes
  the Sections tab unchanged.
- **`src/components/RepairPlanPanel.jsx`** *(new)* — renders items as cards: diagnosis
  statement, review questions with solutions inline, one **Start practice** button per
  item wiring into the existing `onStartQuestionSet({ mode: 'repair', skillId })`.
- **`src/App.jsx`** — extend `handleCompleteTest` to call `buildRepairPlan` and persist;
  add `repairPlans` to the progress shape and to the reset path.
- **`src/components/StudentDashboard.jsx`** — surface the open plan so it is reachable
  without re-opening a result.

Gate the whole surface behind `FEATURES.repairPlan`, per the existing Phase 0 flag plan
(which is still unimplemented — `FEATURES.freshMockProtection` never landed either).

## 11. Test plan

Unit — `tests/repair-plan.test.mjs`:
- each of the 8 error modes classifies from a synthetic response at its boundary
  (`r = 0.49/0.51`, `1.49/1.51`) — boundaries are where this will break
- `delta` computed against mixed-difficulty sets
- ranking puts `CONFIDENT_WRONG` above a higher-`marksLost` `GUESS` skill
- `attempted < 4` suppression
- pacing item emitted at exactly 5 `NOT_REACHED`, not at 4
- plan caps at 5 items
- **practice selection never returns a `pool: 'strict'` item** — this is the one that
  protects the fresh-mock work already shipped
- practice selection never returns an item whose solution is an answer-key placeholder
  (the `"Official source answer key:"` family), not merely one where the field is absent
- `insufficient: true` when the pool is short

Integration:
- `handleCompleteTest` persists a plan and it survives a reload
- a met target flips `status` and clears the errorNotebook entries
- flag off ⇒ `TestResults` renders exactly as today

Regression — run the existing `npm run test:mock-pipeline`, `tests/mock-exposure.test.mjs`,
`tests/result-reporting.test.mjs`, and `scripts/visual_check.mjs` before merge.

## 12. Sequence

1. `src/repairPlan.js` + unit tests — pure, no UI, fully testable alone.
2. `skillPracticeFrom` in `sectionBanks.js` + exposure/solution filters + tests.
3. Persist plans in `App.jsx` behind `FEATURES.repairPlan = false`.
4. `TestResults` tabs (Summary/Sections/Mistakes) — ships value even with the plan tab dark.
5. `RepairPlanPanel` + practice wiring.
6. Dashboard entry point.
7. Flag on, preview deploy, verify against a real sat paper.

Steps 1–2 are the substance and are independently verifiable. Steps 3–4 are
non-breaking with the flag off, so they can land early.

**Out of scope:** coach alerts, parent-facing digests, cross-attempt trend analysis,
any model-generated diagnosis text. The `statement` field in §5 is authored per skill —
42 strings, written once, not generated per plan.
