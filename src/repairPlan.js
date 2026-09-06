/**
 * Turns a finished attempt into a short, ranked list of things to fix.
 *
 * A score is not actionable. This answers the question a score leaves open:
 * given this attempt, what are the three-to-five things to fix, in what order,
 * and what exactly do I do about each.
 *
 * Pure and deterministic — no React, no I/O, no model call. The same attempt
 * always yields the same plan, which is what makes it testable.
 *
 * See docs/REPAIR_PLAN_ENGINEERING_SPEC_2026-08-29.md.
 */

/** CLAT marking: +1 for a correct answer, -0.25 for a wrong one. */
export const MARKS_PER_WRONG = 1.25;

/** Below this many attempts a skill's accuracy is noise, not a signal. */
export const MIN_ATTEMPTS_FOR_SIGNAL = 4;

export const MAX_PLAN_ITEMS = 5;

/** A section that leaves this many questions unreached has a pacing problem. */
export const PACING_THRESHOLD = 5;

/** Fraction of a section counted as its tail, where unattempted means "ran out of time". */
const SECTION_TAIL = 0.2;

const FAST = 0.5;
const SLOW = 1.5;
const GUESS_FAST = 0.4;
/** An item is "easy" when a median student would be expected to get it right. */
const EASY_PRIOR = 0.7;

/** Fallback target when a question carries none, mid-range across the modules. */
const DEFAULT_TARGET_SECONDS = 70;

/**
 * How fixable each mode is per mark lost. Ranking by marks alone would put the
 * biggest hole first, which is not the same as the best use of the next hour.
 */
export const RECOVERABILITY = {
  CONFIDENT_WRONG: 1.0,
  RUSHED: 0.9,
  NOT_REACHED: 0.8,
  LABOURED_WRONG: 0.6,
  LABOURED_RIGHT: 0.5,
  SKIPPED: 0.4,
  GUESS: 0.1,
  CLEAN: 0,
};

/**
 * The chance a median student gets this item right.
 *
 * Mock items carry a real IRT prior. Section-bank items do not — they carry
 * only difficultyIndex, a 0-100 percentile rank within their module — so this
 * maps that percentile onto a plausible band. That is an approximation, not a
 * calibration, and it is why the plan never shows `delta` as a precise figure.
 */
export const expectedCorrectRate = (question) => {
  const prior = question?.adaptiveCalibration?.priorCorrectProbabilityAtTheta0;
  if (typeof prior === 'number' && prior > 0 && prior <= 1) return prior;
  const index = question?.difficultyIndex;
  if (typeof index !== 'number') return 0.6;
  const percentile = Math.min(100, Math.max(0, index)) / 100;
  return 0.9 - 0.55 * percentile;
};

const targetSecondsFor = (question) => {
  const target = Number(question?.targetSeconds);
  return Number.isFinite(target) && target > 0 ? target : DEFAULT_TARGET_SECONDS;
};

/** Time taken as a multiple of the time this question was budgeted. */
export const paceRatio = (response) => {
  const spent = Number(response?.timeSpentSeconds);
  if (!Number.isFinite(spent) || spent <= 0) return null;
  return spent / targetSecondsFor(response.question);
};

/**
 * Why this response went the way it did.
 *
 * Accuracy alone conflates causes that need opposite remedies: a wrong answer
 * in nine seconds is carelessness, the same wrong answer in one hundred and
 * forty is a missing concept. Only the second one is worth studying for.
 *
 * @param inTail Whether the question sits in the closing stretch of its
 *   section, which is what separates running out of time from choosing to skip.
 */
export const classifyResponse = (response, { inTail = false } = {}) => {
  if (response?.isUnattempted) return inTail ? 'NOT_REACHED' : 'SKIPPED';

  const ratio = paceRatio(response);
  // No usable timing is not a defect to report; treat it as ordinary.
  if (ratio === null) return response?.isCorrect ? 'CLEAN' : 'LABOURED_WRONG';

  if (response.isCorrect) return ratio > SLOW ? 'LABOURED_RIGHT' : 'CLEAN';

  // Most specific first: a fast miss on the hardest tier is triage, not a gap.
  if (ratio < GUESS_FAST && response.question?.difficultyLevel === 3) return 'GUESS';
  if (ratio < FAST) return 'RUSHED';
  if (ratio > SLOW) return 'LABOURED_WRONG';
  return expectedCorrectRate(response.question) >= EASY_PRIOR ? 'CONFIDENT_WRONG' : 'LABOURED_WRONG';
};

const moduleOf = (response) => response?.question?.tutorModule || response?.question?.module || null;

/**
 * Mark each response with whether it sits in the tail of its own section.
 *
 * Sections are interleaved in a mock, so the tail is per module rather than per
 * paper. Uses the question's own number when it has one; otherwise position in
 * the array, which is the order the student saw them.
 */
export const withSectionPosition = (responses = []) => {
  const byModule = new Map();
  responses.forEach((response, index) => {
    const key = moduleOf(response) || '__ALL__';
    if (!byModule.has(key)) byModule.set(key, []);
    byModule.get(key).push({ response, index });
  });

  const tailFlags = new Map();
  byModule.forEach((entries) => {
    const ordered = [...entries].sort((a, b) => {
      const an = Number(a.response.question?.number);
      const bn = Number(b.response.question?.number);
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
      return a.index - b.index;
    });
    const tailStart = Math.floor(ordered.length * (1 - SECTION_TAIL));
    ordered.forEach((entry, position) => tailFlags.set(entry.index, position >= tailStart));
  });

  return responses.map((response, index) => ({
    response,
    inTail: tailFlags.get(index) || false,
    mode: classifyResponse(response, { inTail: tailFlags.get(index) || false }),
  }));
};

const modalMode = (modes) => {
  const counts = new Map();
  modes.forEach((mode) => counts.set(mode, (counts.get(mode) || 0) + 1));
  // Ties break towards the more recoverable mode, so a plan prefers the item a
  // student can actually act on rather than whichever happened to be counted first.
  return [...counts.entries()].sort((a, b) => (
    b[1] - a[1] || (RECOVERABILITY[b[0]] || 0) - (RECOVERABILITY[a[0]] || 0)
  ))[0]?.[0] || null;
};

const mean = (values) => (values.length
  ? values.reduce((total, value) => total + value, 0) / values.length
  : 0);

/**
 * Per-skill totals.
 *
 * `delta` — accuracy against what this mix of items should have yielded —
 * matters more than raw accuracy. Sixty percent on Advanced Legal where the
 * expected rate is fifty-five is a strength; seventy percent on Foundation GK
 * where it is eighty-eight is the leak.
 */
export const aggregateBySkill = (classified = []) => {
  const bySkill = new Map();

  classified.forEach(({ response, mode }) => {
    const skillId = response?.question?.skillId;
    if (!skillId) return;
    if (!bySkill.has(skillId)) {
      bySkill.set(skillId, {
        skillId,
        module: moduleOf(response),
        topic: response?.question?.topic || null,
        attempted: 0,
        correct: 0,
        wrong: 0,
        unattempted: 0,
        modes: [],
        expectations: [],
        ratios: [],
        levels: [],
        wrongQuestionIds: [],
      });
    }
    const skill = bySkill.get(skillId);
    skill.expectations.push(expectedCorrectRate(response.question));
    skill.modes.push(mode);
    if (Number.isFinite(response?.question?.difficultyLevel)) {
      skill.levels.push(response.question.difficultyLevel);
    }
    const ratio = paceRatio(response);
    if (ratio !== null) skill.ratios.push(ratio);

    if (response?.isUnattempted) {
      skill.unattempted += 1;
      return;
    }
    skill.attempted += 1;
    if (response.isCorrect) {
      skill.correct += 1;
    } else {
      skill.wrong += 1;
      if (response.question?.id != null) skill.wrongQuestionIds.push(response.question.id);
    }
  });

  return [...bySkill.values()].map((skill) => {
    const accuracy = skill.attempted ? skill.correct / skill.attempted : 0;
    const expected = mean(skill.expectations);
    const nonClean = skill.modes.filter((mode) => mode !== 'CLEAN');
    const dominantMode = modalMode(nonClean);
    const marksLost = skill.wrong * MARKS_PER_WRONG;
    return {
      skillId: skill.skillId,
      module: skill.module,
      topic: skill.topic,
      attempted: skill.attempted,
      correct: skill.correct,
      wrong: skill.wrong,
      unattempted: skill.unattempted,
      accuracy,
      expected,
      delta: accuracy - expected,
      timeRatio: mean(skill.ratios),
      // The level the student was actually failing at, which is what practice
      // targets from — not the average of everything they saw.
      failureLevel: skill.levels.length
        ? Math.round(mean(skill.levels))
        : null,
      dominantMode,
      marksLost,
      recoverableMarks: marksLost * (RECOVERABILITY[dominantMode] || 0),
      wrongQuestionIds: skill.wrongQuestionIds,
    };
  });
};

/** Skills worth acting on, best use of the next hour first. */
export const rankSkills = (skills = []) => skills
  .filter((skill) => skill.attempted >= MIN_ATTEMPTS_FOR_SIGNAL)
  .filter((skill) => skill.recoverableMarks > 0)
  .sort((a, b) => (
    b.recoverableMarks - a.recoverableMarks
    || a.delta - b.delta
    || String(a.skillId).localeCompare(String(b.skillId))
  ));

/**
 * Sections where the student ran out of time rather than out of knowledge.
 *
 * Pacing is not a skill and cannot be fixed by studying one, so it becomes its
 * own plan item and competes for a slot on equal terms.
 */
export const pacingItemsFrom = (classified = []) => {
  const byModule = new Map();
  classified.forEach(({ response, mode }) => {
    if (mode !== 'NOT_REACHED') return;
    const key = moduleOf(response);
    if (!key) return;
    byModule.set(key, (byModule.get(key) || 0) + 1);
  });

  return [...byModule.entries()]
    .filter(([, count]) => count >= PACING_THRESHOLD)
    .map(([module, notReached]) => ({
      kind: 'PACING',
      module,
      skillId: null,
      notReached,
      // Every unreached question is a mark not attempted rather than one lost
      // to a wrong answer, so it scores at one mark each.
      marksLost: notReached,
      recoverableMarks: notReached * RECOVERABILITY.NOT_REACHED,
      dominantMode: 'NOT_REACHED',
    }))
    .sort((a, b) => b.recoverableMarks - a.recoverableMarks);
};

/**
 * The ranked items for one attempt, capped so the plan stays a plan.
 *
 * A pacing item outranks every skill except a CONFIDENT_WRONG one: a
 * misconception corrected once pays out on every future paper, while pacing
 * pays out on the next.
 */
export const buildRepairPlan = ({
  responses = [],
  resultId = null,
  paperId = null,
  userId = null,
  mode = null,
  pool = null,
  module = null,
  generatedAt = new Date().toISOString(),
} = {}) => {
  const classified = withSectionPosition(responses);
  const skills = rankSkills(aggregateBySkill(classified));
  const pacing = pacingItemsFrom(classified);

  const skillItems = skills.map((skill) => ({ kind: 'SKILL', ...skill }));
  const leadMisconception = skillItems.filter((item) => item.dominantMode === 'CONFIDENT_WRONG');
  const remainingSkills = skillItems.filter((item) => item.dominantMode !== 'CONFIDENT_WRONG');

  const items = [...leadMisconception, ...pacing, ...remainingSkills]
    .slice(0, MAX_PLAN_ITEMS)
    .map((item, index) => ({
      itemId: `rp_${resultId || 'attempt'}_${index + 1}`,
      rank: index + 1,
      status: 'open',
      attemptedAt: null,
      result: null,
      ...item,
    }));

  const marksLost = classified
    .filter(({ response }) => !response?.isUnattempted && !response?.isCorrect)
    .length * MARKS_PER_WRONG;

  return {
    repairPlanId: resultId ? `rp_${resultId}` : null,
    userId,
    resultId,
    paperId,
    generatedAt,
    source: { mode, pool, module },
    headline: {
      marksLost,
      recoverableMarks: items.reduce((total, item) => total + (item.recoverableMarks || 0), 0),
      itemCount: items.length,
    },
    items,
    status: items.length ? 'open' : 'complete',
    completedAt: null,
  };
};
