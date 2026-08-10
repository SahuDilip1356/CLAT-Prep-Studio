/**
 * The cross-module memory the tutor reasons from.
 *
 * These numbers drive what the learner is told to do next and what is sent to
 * the model as fact, so they are tested directly rather than through the UI.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dueRevisions, moduleStates, nextAction, studyState } from '../src/utils/studyState.js';

const NOW = Date.parse('2026-08-10T09:00:00Z');
const hoursFromNow = (hours) => new Date(NOW + hours * 3600_000).toISOString();

const err = (module, id, dueInHours, status = 'open') => ({
  questionId: id, module, status, topic: `${module} topic`,
  lastAttemptAt: hoursFromNow(-48), revisionDueAt: hoursFromNow(dueInHours),
});

test('only overdue, unresolved errors count as due', () => {
  const progress = {
    errorNotebook: {
      'GK:1': err('GK', 1, -2),
      'GK:2': err('GK', 2, 5),
      'LEGAL:3': err('LEGAL', 3, -1),
      'LEGAL:4': err('LEGAL', 4, -10, 'resolved'),
    },
  };
  const due = dueRevisions(progress, NOW);
  assert.deepEqual(due.map((e) => e.questionId).sort(), [1, 3]);
});

test('an error with no due date is treated as due now', () => {
  const progress = { errorNotebook: { 'GK:9': { questionId: 9, module: 'GK', status: 'open' } } };
  assert.equal(dueRevisions(progress, NOW).length, 1);
});

test('module state reports progress, accuracy and what is due', () => {
  const progress = {
    legalCompletedDays: { 1: true, 2: true, 3: true },
    legalTotalAttempted: 100,
    legalTotalCorrect: 54,
    legalTopicAttempted: { Torts: 20, Contracts: 10, Rare: 2 },
    legalTopicCorrect: { Torts: 6, Contracts: 8, Rare: 0 },
    errorNotebook: { 'LEGAL:1': err('LEGAL', 1, -1) },
  };
  const legal = moduleStates(progress, NOW).find((m) => m.id === 'LEGAL');
  assert.equal(legal.completedSessions, 3);
  assert.equal(legal.accuracy, 54);
  assert.equal(legal.hasEvidence, true);
  assert.equal(legal.dueCount, 1);
  assert.equal(legal.weakTopics[0].topic, 'Torts', 'weakest topic first');
  assert.ok(!legal.weakTopics.some((t) => t.topic === 'Rare'), 'two attempts is not evidence');
});

test('a module with too few answers reports no baseline, not 0% ability', () => {
  const english = moduleStates({ englishTotalAttempted: 4, englishTotalCorrect: 1 }, NOW)
    .find((m) => m.id === 'ENGLISH');
  assert.equal(english.hasEvidence, false);
});

test('overdue revision outranks new practice', () => {
  const progress = {
    errorNotebook: Object.fromEntries(
      Array.from({ length: 6 }, (_, i) => [`GK:${i}`, err('GK', i, -1)]),
    ),
    gkTotalAttempted: 100, gkTotalCorrect: 80,
    englishTotalAttempted: 100, englishTotalCorrect: 80,
    legalTotalAttempted: 100, legalTotalCorrect: 80,
    logicalTotalAttempted: 100, logicalTotalCorrect: 80,
    totalAttempted: 100, totalCorrect: 80,
  };
  const state = studyState(progress, NOW);
  assert.equal(state.nextAction.kind, 'REVISION');
  assert.match(state.nextAction.label, /6/);
});

test('a module with no baseline is prioritised over an established weak one', () => {
  const progress = {
    gkTotalAttempted: 100, gkTotalCorrect: 40,
    englishTotalAttempted: 0, englishTotalCorrect: 0,
  };
  const action = studyState(progress, NOW).nextAction;
  assert.equal(action.kind, 'BASELINE');
  assert.equal(action.moduleId, 'QUANT', 'the first module without evidence');
});

test('with evidence everywhere, the weakest module is chosen and the reason states why', () => {
  const progress = {
    totalAttempted: 100, totalCorrect: 80,
    gkTotalAttempted: 100, gkTotalCorrect: 75,
    englishTotalAttempted: 100, englishTotalCorrect: 70,
    legalTotalAttempted: 100, legalTotalCorrect: 41,
    logicalTotalAttempted: 100, logicalTotalCorrect: 65,
  };
  const action = studyState(progress, NOW).nextAction;
  assert.equal(action.kind, 'PRACTICE');
  assert.equal(action.moduleId, 'LEGAL');
  assert.match(action.why, /41%/, 'the reason cites the real figure');
});

test('an empty profile produces a usable state, not a crash or a fake number', () => {
  const state = studyState({}, NOW);
  assert.equal(state.totalAttempted, 0);
  assert.equal(state.overallAccuracy, 0);
  assert.equal(state.modulesStarted, 0);
  assert.equal(state.dueCount, 0);
  assert.equal(state.modules.length, 5);
  assert.equal(state.nextAction.kind, 'BASELINE');
  assert.ok(state.modules.every((m) => m.hasEvidence === false));
});
