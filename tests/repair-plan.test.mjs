import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyResponse, expectedCorrectRate, aggregateBySkill, rankSkills,
  pacingItemsFrom, withSectionPosition, buildRepairPlan,
  MAX_PLAN_ITEMS, MIN_ATTEMPTS_FOR_SIGNAL,
} from '../src/repairPlan.js';

// Boundaries are where a classifier breaks, so every mode is tested at the edge
// of its band rather than comfortably inside it.

const question = (overrides = {}) => ({
  id: 'q1',
  module: 'LEGAL',
  skillId: 'LEGAL.PRINCIPLE_APPLICATION',
  difficultyLevel: 2,
  difficultyIndex: 50,
  targetSeconds: 100,
  ...overrides,
});

const response = (overrides = {}) => ({
  isCorrect: false,
  isUnattempted: false,
  timeSpentSeconds: 100,
  ...overrides,
  // After the spread: a partial question override must merge into the default,
  // not replace it and strip skillId and targetSeconds with it.
  question: question(overrides.question),
});

test('a correct answer inside its time budget is clean', () => {
  assert.equal(classifyResponse(response({ isCorrect: true, timeSpentSeconds: 100 })), 'CLEAN');
});

test('correct but slow is fragile fluency, not success', () => {
  // The mode this was built for: invisible in a score, and the marks are lost
  // on the next question rather than this one.
  assert.equal(classifyResponse(response({ isCorrect: true, timeSpentSeconds: 149 })), 'CLEAN');
  assert.equal(classifyResponse(response({ isCorrect: true, timeSpentSeconds: 151 })), 'LABOURED_RIGHT');
});

test('wrong and fast is carelessness; wrong and slow is a gap', () => {
  assert.equal(classifyResponse(response({ timeSpentSeconds: 49 })), 'RUSHED');
  assert.equal(classifyResponse(response({ timeSpentSeconds: 151 })), 'LABOURED_WRONG');
  // In-band and wrong is only a misconception when the item was easy enough to
  // expect right. On a mid-difficulty item it is an ordinary gap.
  assert.equal(classifyResponse(response({ timeSpentSeconds: 51 })), 'LABOURED_WRONG');
});

test('a wrong answer at pace on an easy item is a misconception', () => {
  const easy = response({ question: { difficultyIndex: 5 }, timeSpentSeconds: 100 });
  assert.ok(expectedCorrectRate(easy.question) >= 0.7);
  assert.equal(classifyResponse(easy), 'CONFIDENT_WRONG');
});

test('the same wrong answer on a hard item is a gap, not a misconception', () => {
  const hard = response({ question: { difficultyIndex: 95 }, timeSpentSeconds: 100 });
  assert.ok(expectedCorrectRate(hard.question) < 0.7);
  assert.equal(classifyResponse(hard), 'LABOURED_WRONG');
});

test('a fast miss on the hardest tier is triage, and outranks the rushed rule', () => {
  const triage = response({ question: { difficultyLevel: 3 }, timeSpentSeconds: 39 });
  assert.equal(classifyResponse(triage), 'GUESS');
  // Same speed, ordinary difficulty, is carelessness rather than triage.
  assert.equal(classifyResponse(response({ timeSpentSeconds: 39 })), 'RUSHED');
});

test('unattempted late in a section is pacing; unattempted early is avoidance', () => {
  assert.equal(classifyResponse(response({ isUnattempted: true }), { inTail: true }), 'NOT_REACHED');
  assert.equal(classifyResponse(response({ isUnattempted: true }), { inTail: false }), 'SKIPPED');
});

test('missing timing is not reported as a defect', () => {
  assert.equal(classifyResponse(response({ isCorrect: true, timeSpentSeconds: 0 })), 'CLEAN');
  assert.equal(classifyResponse(response({ timeSpentSeconds: undefined })), 'LABOURED_WRONG');
});

test('a mock item uses its real prior over the difficulty approximation', () => {
  const calibrated = question({
    difficultyIndex: 95,
    adaptiveCalibration: { priorCorrectProbabilityAtTheta0: 0.81 },
  });
  assert.equal(expectedCorrectRate(calibrated), 0.81);
});

test('the section tail is per module, since sections interleave in a mock', () => {
  const responses = [
    ...Array.from({ length: 10 }, (_, i) => response({
      question: { module: 'LEGAL', number: i + 1 }, isUnattempted: i >= 9,
    })),
    ...Array.from({ length: 10 }, (_, i) => response({
      question: { module: 'ENGLISH', number: i + 1 }, isUnattempted: i >= 9,
    })),
  ];
  const classified = withSectionPosition(responses);
  const notReached = classified.filter((entry) => entry.mode === 'NOT_REACHED');
  assert.equal(notReached.length, 2, 'each section has its own tail');
});

test('delta is measured against what the item mix should have yielded', () => {
  const easyMisses = Array.from({ length: 5 }, (_, i) => response({
    question: { id: `e${i}`, difficultyIndex: 0 }, timeSpentSeconds: 100,
  }));
  const [skill] = aggregateBySkill(withSectionPosition(easyMisses));
  assert.equal(skill.accuracy, 0);
  assert.ok(skill.expected >= 0.85, 'these items were expected to be got right');
  assert.ok(skill.delta < -0.85, 'so the shortfall is large');
});

test('a thin sample is suppressed rather than ranked', () => {
  const few = Array.from({ length: MIN_ATTEMPTS_FOR_SIGNAL - 1 }, (_, i) => response({
    question: { id: `q${i}` }, timeSpentSeconds: 100,
  }));
  assert.deepEqual(rankSkills(aggregateBySkill(withSectionPosition(few))), []);
});

test('a misconception outranks a bigger hole made of guesses', () => {
  const guesses = Array.from({ length: 10 }, (_, i) => response({
    question: { id: `g${i}`, skillId: 'GK.STATIC', difficultyLevel: 3 },
    timeSpentSeconds: 20,
  }));
  const misconceptions = Array.from({ length: 4 }, (_, i) => response({
    question: { id: `m${i}`, skillId: 'LEGAL.PRINCIPLE_APPLICATION', difficultyIndex: 0 },
    timeSpentSeconds: 100,
  }));
  const ranked = rankSkills(aggregateBySkill(withSectionPosition([...guesses, ...misconceptions])));
  assert.equal(ranked[0].skillId, 'LEGAL.PRINCIPLE_APPLICATION');
  assert.ok(
    ranked[0].marksLost < ranked[1].marksLost,
    'it wins despite losing fewer marks, because it is the one worth fixing',
  );
});

test('pacing fires at the threshold, not below it', () => {
  const notReached = (count) => withSectionPosition(
    Array.from({ length: 25 }, (_, i) => response({
      question: { module: 'ENGLISH', number: i + 1 },
      isUnattempted: i >= 25 - count,
    })),
  );
  assert.equal(pacingItemsFrom(notReached(4)).length, 0);
  assert.equal(pacingItemsFrom(notReached(5)).length, 1);
});

test('a plan is capped so it stays a plan', () => {
  const responses = Array.from({ length: 80 }, (_, i) => response({
    question: { id: `q${i}`, skillId: `SKILL.${i % 10}`, difficultyIndex: 0 },
    timeSpentSeconds: 100,
  }));
  const plan = buildRepairPlan({ responses, resultId: 'r1' });
  assert.equal(plan.items.length, MAX_PLAN_ITEMS);
  assert.deepEqual(plan.items.map((item) => item.rank), [1, 2, 3, 4, 5]);
});

test('the same attempt always yields the same plan', () => {
  const responses = Array.from({ length: 20 }, (_, i) => response({
    question: { id: `q${i}`, skillId: `SKILL.${i % 3}`, difficultyIndex: i * 5 },
    timeSpentSeconds: 40 + i * 10,
  }));
  const a = buildRepairPlan({ responses, resultId: 'r1', generatedAt: 'fixed' });
  const b = buildRepairPlan({ responses, resultId: 'r1', generatedAt: 'fixed' });
  assert.deepEqual(a, b);
});

test('a clean attempt produces no work rather than invented work', () => {
  const responses = Array.from({ length: 20 }, (_, i) => response({
    question: { id: `q${i}` }, isCorrect: true, timeSpentSeconds: 100,
  }));
  const plan = buildRepairPlan({ responses, resultId: 'r1' });
  assert.deepEqual(plan.items, []);
  assert.equal(plan.status, 'complete');
  assert.equal(plan.headline.marksLost, 0);
});

test('an empty attempt does not throw', () => {
  const plan = buildRepairPlan({ responses: [], resultId: null });
  assert.deepEqual(plan.items, []);
  assert.equal(plan.repairPlanId, null);
});
