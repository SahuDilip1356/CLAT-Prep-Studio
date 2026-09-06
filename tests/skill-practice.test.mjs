import test from 'node:test';
import assert from 'node:assert/strict';
import { skillPracticeFrom, isReasonedExplanation } from '../src/data/sectionBanks.js';

const REASONED = 'Article 20(1) bars retrospective criminalisation, so a law passed after the '
  + 'act cannot support a conviction for it.';

const item = (overrides = {}) => ({
  id: 'q1',
  skillId: 'LEGAL.PRINCIPLE_APPLICATION',
  difficultyLevel: 2,
  solution: REASONED,
  hasExplanation: true,
  ...overrides,
});

const bankOf = (questions) => ({ questions });

test('an answer key is not an explanation, however populated the field is', () => {
  assert.equal(isReasonedExplanation(item()), true);
  // The exact string that made 745 Quant questions look explained.
  assert.equal(isReasonedExplanation(item({ solution: 'Official source answer key: Choice C.' })), false);
  assert.equal(isReasonedExplanation(item({ solution: 'Answer key: B' })), false);
  assert.equal(isReasonedExplanation(item({ solution: '' })), false);
  assert.equal(isReasonedExplanation(item({ solution: 'Correct.' })), false);
});

test('hasExplanation is not trusted, because it does not know the difference', () => {
  const placeholder = item({ solution: 'Official source answer key: Choice C.', hasExplanation: true });
  const set = skillPracticeFrom(bankOf([placeholder]), { skillId: item().skillId });
  assert.deepEqual(set.questionIds, [], 'a populated field is not enough');
});

test('a strict-pool question is never pulled into practice', () => {
  // This is the guard that protects the fresh-mock protection already shipped:
  // burning an unseen strict paper on practice would defeat the whole feature.
  const bank = bankOf([
    item({ id: 'strict', pool: 'strict' }),
    item({ id: 'practice', pool: 'practice' }),
  ]);
  const set = skillPracticeFrom(bank, { skillId: item().skillId });
  assert.deepEqual(set.questionIds, ['practice']);
});

test('questions the learner has already seen are excluded', () => {
  const bank = bankOf([item({ id: 'seen' }), item({ id: 'fresh' })]);
  const set = skillPracticeFrom(bank, { skillId: item().skillId, exclude: ['seen'] });
  assert.deepEqual(set.questionIds, ['fresh']);
});

test('exclusion matches ids across string and number forms', () => {
  const bank = bankOf([item({ id: 3636 }), item({ id: 'fresh' })]);
  const set = skillPracticeFrom(bank, { skillId: item().skillId, exclude: ['3636'] });
  assert.deepEqual(set.questionIds, ['fresh']);
});

test('a secondary skill still counts as practice for that skill', () => {
  const bank = bankOf([
    item({ id: 'primary' }),
    item({ id: 'secondary', skillId: 'OTHER', secondarySkillIds: ['LEGAL.PRINCIPLE_APPLICATION'] }),
    item({ id: 'unrelated', skillId: 'OTHER' }),
  ]);
  const set = skillPracticeFrom(bank, { skillId: 'LEGAL.PRINCIPLE_APPLICATION' });
  assert.deepEqual([...set.questionIds].sort(), ['primary', 'secondary']);
});

test('a misconception practises one level below, to rebuild the floor', () => {
  const bank = bankOf([
    item({ id: 'l1', difficultyLevel: 1 }),
    item({ id: 'l2', difficultyLevel: 2 }),
    item({ id: 'l3', difficultyLevel: 3 }),
  ]);
  const set = skillPracticeFrom(bank, {
    skillId: item().skillId, dominantMode: 'CONFIDENT_WRONG', failureLevel: 2, limit: 1,
  });
  assert.equal(set.difficultyLevel, 1);
  assert.deepEqual(set.questionIds, ['l1']);
});

test('rushing practises at level, because it is speed and not concept', () => {
  const bank = bankOf([
    item({ id: 'l1', difficultyLevel: 1 }),
    item({ id: 'l2', difficultyLevel: 2 }),
  ]);
  const set = skillPracticeFrom(bank, {
    skillId: item().skillId, dominantMode: 'RUSHED', failureLevel: 2, limit: 1,
  });
  assert.equal(set.difficultyLevel, 2);
  assert.deepEqual(set.questionIds, ['l2']);
});

test('a level below the floor clamps rather than going out of range', () => {
  const bank = bankOf([item({ id: 'l1', difficultyLevel: 1 })]);
  const set = skillPracticeFrom(bank, {
    skillId: item().skillId, dominantMode: 'CONFIDENT_WRONG', failureLevel: 1,
  });
  assert.equal(set.difficultyLevel, 1);
});

test('a short pool backfills from the nearest level rather than returning nothing', () => {
  const bank = bankOf([
    item({ id: 'far', difficultyLevel: 3 }),
    item({ id: 'near', difficultyLevel: 2 }),
  ]);
  const set = skillPracticeFrom(bank, {
    skillId: item().skillId, dominantMode: 'RUSHED', failureLevel: 1, limit: 2,
  });
  assert.deepEqual(set.questionIds, ['near', 'far'], 'nearest difficulty first');
});

test('a thin pool is flagged rather than shipped as a token set', () => {
  const bank = bankOf(Array.from({ length: 3 }, (_, i) => item({ id: `q${i}` })));
  const set = skillPracticeFrom(bank, { skillId: item().skillId });
  assert.equal(set.insufficient, true);
  assert.equal(set.questions.length, 3);
});

test('a full pool is not flagged, and carries a pass mark', () => {
  const bank = bankOf(Array.from({ length: 12 }, (_, i) => item({ id: `q${i}` })));
  const set = skillPracticeFrom(bank, { skillId: item().skillId, limit: 10 });
  assert.equal(set.insufficient, false);
  assert.deepEqual(set.target, { correct: 7, of: 10 });
});

test('an empty or malformed bank does not throw', () => {
  assert.deepEqual(skillPracticeFrom(undefined, { skillId: 'X' }).questionIds, []);
  assert.deepEqual(skillPracticeFrom({}, { skillId: 'X' }).questionIds, []);
  assert.equal(skillPracticeFrom(bankOf([]), { skillId: 'X' }).insufficient, true);
});
