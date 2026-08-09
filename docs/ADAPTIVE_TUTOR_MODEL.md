# CLAT Prep Studio — Adaptive Tutor Model v2

## Outcome contract

The platform optimises the controllable path toward **110+/120** for CLAT 2027. It does not promise a 99% result before the evidence supports that forecast.

The tutor must answer four questions after every learning block:

1. What does the student understand?
2. Where are marks being lost: accuracy, speed, difficulty, retention, or consistency?
3. What is the highest-value block the student should do next?
4. How much evidence supports the score forecast?

## Persistent response signal

Every attempted question appends this compact event to the existing cloud-synced student progress record:

```js
{
  questionId,
  module,             // ENGLISH, GK, LEGAL, LOGICAL, QUANT (CA remains supported for dossiers)
  topic,              // human-readable primary skill
  skillId,            // stable granular skill identifier
  difficultyLevel,    // 1 foundation, 2 exam standard, 3 stretch
  difficultyIndex,    // 0-100 content/empirical position within the verified pool
  calibrationStatus,
  isCorrect,
  userAnswer,
  timeSpentSeconds,   // active time; paused time is excluded
  attemptedAt
}
```

Full-mock responses are stored against the question's actual section rather than the generic `MOCKS` container. This allows a Legal answer in a full mock to update Legal mastery and a Logical answer to update Logical mastery.

## Item eligibility and cold-start priors

The OCR library and the learner-facing adaptive bank are intentionally separate:

- all extracted candidates receive skill and difficulty priors for review;
- candidates are never selectable merely because OCR found four options;
- only exact `verified_staging` questions with an official answer enter `adaptive_verified_mock_bank.json`;
- empirical calibration overrides are stored separately in `adaptive_item_calibration.json`.

Each verified item records:

```text
module and stable primary/secondary skills
Foundation / Exam Standard / Advanced level
0-100 difficulty index normed inside the verified module pool
module-specific response-time target
3PL-style content prior: discrimination A, difficulty B, guessing C
content, answer and calibration status
```

The initial levels are content priors, not claims of empirical difficulty. They use passage and stem density, distractor overlap, inference/application demand, negative logic and module-specific complexity. Provider and mock number are never difficulty signals.

This is the tutor's memory. It remembers demonstrated performance rather than relying on a chat transcript or “chapter completed” flag.

## Topic mastery

Each topic is updated from the student's response events.

```text
evidence       = min(attempts / 20, 1)
speed score    = clamp(110 - 55 × actual_time / target_time, 0, 100)
difficulty     = average difficulty / 3 × 100

topic mastery  = evidence × (
                   62% accuracy
                 + 23% speed
                 + 15% difficulty
               )
```

Target time varies by module and difficulty. For example, Quant uses 55 / 70 / 85 seconds for levels 1 / 2 / 3. A quick foundation answer and a slow advanced answer are therefore not treated as equivalent.

## Readiness score

```text
30%  accuracy
20%  speed
15%  difficulty handled
15%  concept coverage
10%  consistency across recent sessions
10%  revision health
```

The raw score is multiplied by evidence confidence. With little data, readiness remains conservative even if the first few answers are correct.

## Adaptive decision policy

The tutor chooses one mode for the next 12-question block:

| Mode | Entry rule | Tutor action |
| --- | --- | --- |
| Baseline | Fewer than 20 response signals | Sample concepts at foundation/exam level |
| Accuracy repair | Focus-topic accuracy below 72% | Reduce or hold difficulty; repair setup logic |
| Speed build | Accuracy at least 80%, time above target | Hold difficulty; compress response time |
| Difficulty stretch | Accuracy at least 82%, time on target | Raise difficulty by one level |
| Balanced build | Stable middle band | Mix accuracy, speed, and transfer |

Question selection uses the same question graph:

```text
up to 2 unresolved errors
~55% exact focus topic at selected difficulty
~25% adjacent difficulty within the focus topic
remaining questions from nearby topics for transfer
```

Recently seen questions are deprioritised, not permanently excluded. This allows deliberate retry after forgetting.

## Score and probability model

Only completed tests with at least 100 questions are considered full-mock evidence.

- One full mock unlocks a provisional 120-point projection.
- Three full mocks unlock a probability estimate for exceeding 110.
- The estimate uses a recency-weighted mean and observed volatility, with a minimum uncertainty floor.
- The interface always labels this as a forecast, never a guarantee.

A “99% probability” is displayed only if the student's recent full-mock distribution mathematically supports it. Product copy cannot override the model.

## Closed learning loop

```text
Attempt question
→ record correctness + active time + difficulty
→ update topic and readiness signals
→ update error notebook
→ select next tutor mode
→ generate next block from the question graph
→ repeat
```

## Cohort calibration

`npm run calibrate:adaptive-library` consumes privacy-safe item-attempt JSONL. It retains aggregate item statistics only; pseudonymous learner keys are counted and discarded.

Calibration stages:

| Attempts per item | Status | Behaviour |
| --- | --- | --- |
| 0-29 | Expert content prior | Keep the cold-start prior |
| 30-99 | Telemetry calibrating | Begin a strongly shrunk empirical blend |
| 100-249 | Empirical provisional | Increase empirical weight, retain uncertainty |
| 250+ | Empirical stable | Use the blended item difficulty for sequencing |

Correct response time, observed accuracy and distractor selection are recorded. Item discrimination remains conservative until a future ability-conditioned calibration has enough learner coverage.
