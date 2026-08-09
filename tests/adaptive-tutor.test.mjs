import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdaptivePlan,
  buildStudentModel,
  getTargetSeconds,
  getTutorReply,
} from '../src/utils/adaptiveTutor.js';

const questions = Array.from({ length: 36 }, (_, index) => ({
  id: index + 1,
  topic: index < 18 ? 'Ratio' : 'Averages',
  tutorModule: 'QUANT',
  difficultyLevel: (index % 3) + 1,
}));

test('speed targets rise with difficulty', () => {
  assert.equal(getTargetSeconds('QUANT', 1), 55);
  assert.equal(getTargetSeconds('QUANT', 3), 85);
  assert.equal(getTargetSeconds('GK', 1), 25);
  assert.equal(getTargetSeconds('ENGLISH', 2), 65);
  assert.equal(getTargetSeconds('LEGAL', 3), 95);
  assert.equal(getTargetSeconds('LOGICAL', 1), 60);
});

test('adaptive plan excludes explicitly gated OCR candidates', () => {
  const gated = {
    id: 'ocr-only', topic: 'Inference', tutorModule: 'ENGLISH', difficultyLevel: 2,
    adaptiveEligibility: { eligible: false },
  };
  const eligible = Array.from({ length: 12 }, (_, index) => ({
    id: `verified-${index}`,
    topic: 'Inference',
    tutorModule: 'ENGLISH',
    difficultyLevel: 1,
    adaptiveEligibility: { eligible: true },
  }));
  const plan = buildAdaptivePlan({ userProgress: {}, questions: [gated, ...eligible] });
  assert.equal(plan.questions.length, 12);
  assert.ok(plan.questions.every((question) => question.id !== 'ocr-only'));
  assert.equal(plan.module, 'ENGLISH');
});

test('student model combines accuracy, speed and evidence', () => {
  const userProgress = {
    questionAttempts: Array.from({ length: 24 }, (_, index) => ({
      questionId: (index % 18) + 1,
      topic: 'Ratio',
      module: 'QUANT',
      difficultyLevel: 2,
      isCorrect: index < 18,
      timeSpentSeconds: 84,
    })),
    attemptHistory: [],
  };
  const model = buildStudentModel({ userProgress, questions });
  assert.equal(model.accuracy, 75);
  assert.equal(model.timedAttemptCount, 24);
  assert.ok(model.topicModels[0].speedRatio > 1);
  assert.ok(model.readiness > 0 && model.readiness < 100);
  assert.equal(model.probabilityAboveTarget, null);
});

test('adaptive plan repairs low accuracy before raising difficulty', () => {
  const userProgress = {
    questionAttempts: Array.from({ length: 24 }, (_, index) => ({
      questionId: (index % 18) + 1,
      topic: 'Ratio',
      module: 'QUANT',
      difficultyLevel: 2,
      isCorrect: index < 10,
      timeSpentSeconds: 70,
    })),
    attemptHistory: [],
  };
  const plan = buildAdaptivePlan({ userProgress, questions, blockSize: 12 });
  assert.equal(plan.mode, 'accuracy-repair');
  assert.equal(plan.preferredDifficulty, 1);
  assert.equal(plan.questions.length, 12);
  assert.equal(new Set(plan.questions.map((question) => question.id)).size, 12);
});

test('score probability remains locked until three full mocks', () => {
  const userProgress = {
    questionAttempts: [],
    attemptHistory: [
      { score: 112, maxScore: 120 },
      { score: 114, maxScore: 120 },
    ],
  };
  const model = buildStudentModel({ userProgress, questions });
  assert.equal(model.projectedScore, 112.7);
  assert.equal(model.probabilityAboveTarget, null);
  assert.match(model.projectionMessage, /1 more full mock/);
});

test('tutor explains why it will not invent a score forecast', () => {
  const plan = buildAdaptivePlan({ userProgress: {}, questions });
  assert.match(getTutorReply('Can I score 110?', plan), /will not invent a probability/);
});
