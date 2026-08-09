/**
 * Guards the numbers a student reads after a test.
 *
 * Each case here corresponds to a defect found in the 2026-08-09 scoring audit:
 * accuracy counted blanks as errors, there was no section breakdown, a partial
 * set marked a whole session complete, mock papers never recorded a completion,
 * and "streak" was the count of sessions ever done rather than consecutive days.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  accuracyOf, attemptRateOf, clatScore, formatDuration, sectionBreakdown, weakestSection,
} from '../src/utils/resultAnalytics.js';
import { calculateStreak, completionKeyFor } from '../src/utils/sessionProgress.js';
import { isQuestionCorrect } from '../src/utils/questionAnswers.js';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const loadJson = (name) => JSON.parse(readFileSync(join(DATA, name), 'utf8'));

const response = (module, verdict, seconds = 40) => ({
  question: { module, id: `${module}-${Math.random()}` },
  isCorrect: verdict === 'correct',
  isUnattempted: verdict === 'blank',
  timeSpentSeconds: seconds,
});

test('accuracy is correct out of attempted, not out of the whole paper', () => {
  // 66 right, 36 wrong, 18 blank — the audit's worked example.
  assert.equal(accuracyOf(66, 36), 65);
  assert.notEqual(accuracyOf(66, 36), Math.round((66 / 120) * 100));
  assert.equal(attemptRateOf(66, 36, 120), 85);
});

test('accuracy does not punish a student for leaving questions blank', () => {
  // Same skill, different pace: both answered 40 and got 30 right.
  assert.equal(accuracyOf(30, 10), accuracyOf(30, 10));
  assert.equal(attemptRateOf(30, 10, 120), 33);
  assert.equal(attemptRateOf(30, 10, 40), 100);
});

test('accuracy is 0, not NaN, when nothing was attempted', () => {
  assert.equal(accuracyOf(0, 0), 0);
  assert.equal(attemptRateOf(0, 0, 120), 0);
});

test('CLAT marking is +1 / -0.25 / 0', () => {
  assert.equal(clatScore(66, 36), 57);
  assert.equal(clatScore(0, 4), -1);
  assert.equal(clatScore(0, 0), 0);
});

test('section breakdown splits a full paper by module', () => {
  const responses = [
    ...Array.from({ length: 3 }, () => response('ENGLISH', 'correct')),
    response('ENGLISH', 'wrong'),
    response('QUANT', 'correct'),
    ...Array.from({ length: 2 }, () => response('QUANT', 'wrong')),
    response('QUANT', 'blank'),
  ];
  const sections = sectionBreakdown(responses);
  assert.equal(sections.length, 2);

  const english = sections.find((s) => s.key === 'ENGLISH');
  assert.deepEqual(
    { correct: english.correct, wrong: english.wrong, blank: english.blank, score: english.score },
    { correct: 3, wrong: 1, blank: 0, score: 2.75 },
  );

  const quant = sections.find((s) => s.key === 'QUANT');
  assert.equal(quant.score, 0.5);
  assert.equal(quant.accuracy, 33);
  assert.equal(quant.blank, 1);
});

test('the weakest section is the one losing most marks per question', () => {
  const responses = [
    ...Array.from({ length: 10 }, () => response('ENGLISH', 'correct')),
    ...Array.from({ length: 8 }, () => response('QUANT', 'wrong')),
    response('QUANT', 'correct'),
  ];
  assert.equal(weakestSection(sectionBreakdown(responses)).key, 'QUANT');
});

test('a single-module set produces no section table', () => {
  const sections = sectionBreakdown([response('LEGAL', 'correct'), response('LEGAL', 'wrong')]);
  assert.equal(sections.length, 1);
  assert.equal(weakestSection(sections), null);
});

test('a partial set does not complete a session', () => {
  const session = { day: 1, sessionSize: 36 };
  assert.equal(completionKeyFor(session, 36), 1, 'the whole session completes it');
  assert.equal(completionKeyFor(session, 15), null, 'a Quick 15 does not');
  assert.equal(completionKeyFor(session, 35), null, 'nor does one question short');
});

test('a mock paper records a completion even though it has no day number', () => {
  assert.equal(completionKeyFor({ paperId: 'cl-prime-2027-10' }, 120), 'cl-prime-2027-10');
});

test('warm-ups and topic drills complete nothing', () => {
  assert.equal(completionKeyFor(null, 10), null);
  assert.equal(completionKeyFor({}, 20), null);
});

test('streak counts consecutive days, not sessions ever completed', () => {
  const today = new Date('2026-08-09T10:00:00Z');
  const at = (day) => ({ timestamp: `2026-08-${String(day).padStart(2, '0')}T09:00:00Z` });

  assert.equal(calculateStreak([at(9), at(8), at(7)], today), 3);
  assert.equal(calculateStreak([at(9), at(9), at(9)], today), 1, 'same-day sessions are one day');
  assert.equal(calculateStreak([at(9), at(7), at(6)], today), 1, 'a gap breaks the streak');
  assert.equal(calculateStreak([at(8), at(7)], today), 2, 'yesterday keeps it live');
  assert.equal(calculateStreak([at(5), at(4), at(3)], today), 0, 'a stale streak is over');
});

test('a learner who has done nothing has no streak', () => {
  assert.equal(calculateStreak([]), 0);
  assert.equal(calculateStreak(undefined), 0);
  assert.equal(calculateStreak([{}, { timestamp: null }]), 0);
});

test('formatDuration is readable and never negative', () => {
  assert.equal(formatDuration(45), '45s');
  assert.equal(formatDuration(605), '10m 05s');
  assert.equal(formatDuration(-5), '0s');
});

test('every mock paper scores its own answer key correctly', () => {
  const papers = Object.values(loadJson('clat_mock_bank.json').mocks);
  assert.equal(papers.length, 4);
  for (const paper of papers) {
    assert.equal(paper.questions.length, 120, `${paper.mock.id} is a 120-question paper`);
    const allCorrect = paper.questions.every((q) => isQuestionCorrect(q, q.correctOption));
    assert.ok(allCorrect, `${paper.mock.id} scores its keyed answers as correct`);
  }
});

test('a full mock produces a five-section breakdown matching the CLAT blueprint', () => {
  const paper = Object.values(loadJson('clat_mock_bank.json').mocks)[0];
  const responses = paper.questions.map((question, index) => ({
    question,
    isCorrect: index % 3 !== 0,
    isUnattempted: false,
    timeSpentSeconds: 55,
  }));
  const sections = sectionBreakdown(responses);
  assert.equal(sections.length, 5);
  assert.deepEqual(
    Object.fromEntries(sections.map((s) => [s.key, s.total])),
    { ENGLISH: 24, CA: 28, LEGAL: 30, LOGICAL: 26, QUANT: 12 },
  );
  assert.equal(sections.reduce((sum, s) => sum + s.total, 0), 120);
});

test('every bank question carries the module the section table needs', () => {
  const banks = ['english_question_bank.json', 'gk_question_bank.json', 'legal_question_bank.json',
    'logical_question_bank.json', 'question_bank.json'];
  for (const bank of banks) {
    const missing = loadJson(bank).questions.filter((q) => !q.module).length;
    assert.equal(missing, 0, `${bank} has ${missing} questions without a module`);
  }
});

test('unsaved work is counted so the learner can be warned about it', async () => {
  const { unsavedAnswerCount } = await import('../src/utils/sessionProgress.js');
  const progress = {
    attemptHistory: [
      { correctCount: 18, wrongCount: 12, unattemptedCount: 6 },
      { correctCount: 5, wrongCount: 0 },
    ],
  };
  // Consent given: the work is persisted, so nothing is at risk.
  assert.equal(unsavedAnswerCount(progress, true), 0);
  // No consent: every answered question is at risk and must be surfaced.
  assert.equal(unsavedAnswerCount(progress, false), 35);
  assert.equal(unsavedAnswerCount({ attemptHistory: [] }, false), 0);
  assert.equal(unsavedAnswerCount(null, false), 0);
});
