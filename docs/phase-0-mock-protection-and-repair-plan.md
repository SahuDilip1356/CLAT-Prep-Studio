# Phase 0: Fresh Mock Protection and Repair Plan Design

## Purpose
This document defines the first additive implementation phase for the CLAT Prep Studio product:
- Fresh mock protection
- Strict vs Practice mock modes
- Deeper post-mock analysis and repair planning
- Module taxonomy alignment
- Academic metadata and publishing workflow

This phase is intentionally additive and non-breaking. Existing functionality remains operational while new metadata, APIs, and UI flows are introduced behind safe flags.

## Current status
- Representative Python test suite `npm run test:mock-pipeline` passes.
- Frontend build artifacts exist in `dist/` from a successful Vite production build.
- The current app already contains:
  - mock selection screen in `src/components/MockPaperDashboard.jsx`
  - test engine in `src/components/MockTestEngine.jsx`
  - result report in `src/components/TestResults.jsx`
  - module dashboards and session flow in `src/components/CLATSectionDashboard.jsx`
  - Firebase persistence in `src/firebase.js`
  - backend support via `server/privacy-service.js` and API functions in `api/`

## Goals for Phase 0
1. Add mock and question metadata for strict/unseen protection.
2. Introduce API contracts for protected mock selection and exposure recording.
3. Add initial UI hooks for strict/practice mode selection without changing existing behavior.
4. Define a repair-plan output structure and wire it into the result flow.
5. Keep all changes additive and gated by feature flags.

## Data model additions
Use optional metadata fields on existing mock and question payloads.

### Paper-level metadata
Add to each mock paper object:
- `pool: 'strict' | 'practice' | 'verification' | 'unpublished'`
- `provenance?: { source: string; sourceUrl?: string; provider?: string; publishedAt?: string; reviewer?: string; approvedAt?: string }`
- `verifiedAnswerKey?: boolean`
- `explanationStatus?: 'none' | 'partial' | 'complete'`
- `freshMockEligible?: boolean`
- `strictCandidate?: boolean`
- `publishState?: 'draft' | 'review' | 'published'`

### Question-level metadata
Extend every question object with:
- `seenBy?: string[]` or `seenBy?: Record<string, string>`
- `skillTags?: string[]`
- `difficultyIndex?: number`
- `difficultyLabel?: string`
- `sourceQuestionNumber?: string`
- `questionProvenance?: { source: string; sourceUrl?: string }`
- `verifiedAnswerKey?: boolean`
- `explanationQuality?: 'none' | 'answer-key' | 'reasoned' | 'reviewed'`
- `distractorAnalysis?: { [option: string]: string }`
- `publishedPool?: 'strict' | 'practice' | 'verification'`
- `mockPool?: 'strict' | 'practice' | 'verification'`
- `passageSeenBy?: Record<string, string>`

### User attempt metadata
Add the following to user progress and attempt history in `src/App.jsx`:
- `attemptHistory` items: `paperId`, `mode`, `pool`, `strictFlag`, `timestamp`, `score`, `sectionSummary`, `weakTopics`, `repairPlanId?`
- `questionAttempts` items: `questionId`, `module`, `skillId`, `timeSpentSeconds`, `isCorrect`, `isUnattempted`, `mode`, `attemptedAt`, `sourcePool`
- `errorNotebook` items should include `skillId`, `lastAttemptAt`, `revisionDueAt`, `repeatCount`, `sourceMode`

## API contract
New endpoints should be additive. Existing APIs remain unchanged.

### Mock selection and reservation
- `POST /api/mocks/available` — returns papers eligible for the requested mode.
  - Request: `{ mode: 'strict' | 'practice', userId: string }`
  - Response: `{ mocks: MockMetadata[] }`
- `POST /api/mocks/reserve` — reserve a strict mock for a user.
  - Request: `{ paperId: string, userId: string, mode: 'strict' }`
  - Response: `{ reservationId: string, expiresAt: string }`

### Exposure tracking
- `POST /api/questions/mark-seen`
  - Request: `{ questionId: string, userId: string, mode: 'practice' | 'learn' | 'review', paperId?: string }`
  - Response: `{ success: true }`

### Result submission and repair plan generation
- `POST /api/mocks/submit`
  - Request: `{ userId, paperId?, mode, responses: ResponseItem[], timings, pool? }`
  - Response: `{ resultId, repairPlanId, summary }`
- `POST /api/repair-plans/generate`
  - Request: `{ userId, resultId }`
  - Response: `{ repairPlan: RepairPlan }`

### Coach / analytics (Phase 0)
- `GET /api/coach/alerts?userId=` — returns coach intervention suggestions.

## Frontend implementation mapping
### UI entry points
- `src/components/MockPaperDashboard.jsx`
  - add a strict/practice selector
  - surface `fresh` / `seen` badges
  - pass `mode` metadata into `onStartQuestionSet`
- `src/components/MockTestEngine.jsx`
  - add `mode` prop and optionally disable pause for strict mode
  - collect `timeSpentSeconds` and `questionTimeRef` per question
- `src/components/TestResults.jsx`
  - prepare for tabbed view: Summary / Sections / Mistakes / Repair Plan
  - wire `q.solution` and `q.whereThingsWentWrong` into richer explanation UI
- `src/components/StudioShell.jsx`
  - allow primary nav items to include `Review` and `Coach`
- `src/components/CLATSectionDashboard.jsx`
  - preserve current module flow; later extend with practice-purpose buttons

### App-level wiring
- `src/App.jsx`
  - update `handleStartQuestionSet` to accept `mode` and `pool` flags
  - update `handleCompleteTest` to persist `mode` and `sourcePool` in `attemptHistory`
  - add `repairPlan` placeholders in state and user progress

## Migration strategy
1. Keep all existing mock questions and papers unchanged.
2. Create metadata defaults on load:
   - `pool = 'practice'`
   - `verifiedAnswerKey = paper.answerKey ? true : false`
   - `explanationQuality = q.solution ? 'answer-key' : 'none'`
3. Add a new migration script under `scripts/` to annotate JSON assets without rewriting existing fields.
4. Roll out strict mock UI only once a safe subset of papers is identified and tagged as `pool='strict'`.

## Safe rollout and feature gating
- Introduce a feature flag constant in `src/config.js` or at the top of `src/App.jsx`:
  - `const FEATURES = { freshMockProtection: false, repairPlan: false }`
- Only enable the new UI and APIs when the feature flag is `true`.
- Leave the current score/result flows unchanged when flags are off.

## Test plan
### Unit tests
- Mock metadata defaults and paper selection rules.
- `completionKeyFor` and `repairPlan` output shape.
- `handleCompleteTest` augmentation with mode/pool fields.

### Integration tests
- `MockPaperDashboard` strict/practice selector renders and routes correctly.
- `MockTestEngine` strict mode prevents pause/resume.
- `TestResults` can render tabbed Summary / Sections / Mistakes / Repair Plan.

### End-to-end tests
- `npm run test:mock-pipeline` already passes for data pipeline.
- Add a Node/Playwright flow for the new mock selection UI once the feature is enabled.

## Phase 0 deliverables
- `docs/phase-0-mock-protection-and-repair-plan.md`
- new metadata schema for mock/paper/question objects
- new API contract and backend integration plan
- updated frontend wiring map for strict/practice mode and repair-plan flow
- migration strategy with safe defaults
- feature gating plan
- test plan for additive rollout

## Next implementation step
Begin the first code change by:
1. introducing feature flags in `src/App.jsx` and a small config helper,
2. extending `handleStartQuestionSet` to accept `{ mode, pool }`,
3. adding `mode` to the `MockPaperDashboard` start buttons,
4. leaving current behavior unchanged with a default mode value.

This preserves current functionality while opening the door to strict mock protection and repair planning.
