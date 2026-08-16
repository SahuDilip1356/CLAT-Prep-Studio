/**
 * Guards fresh-mock protection.
 *
 * The defect this closes: a mock paper reported nothing about whether the
 * learner had already met its questions, so a fourth sitting read as a clean
 * diagnostic. Exposure is now recorded when questions are served, and a paper
 * is only fresh when none of it has been seen.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { freshPapers, paperExposure, recordQuestionsSeen } from '../src/utils/mockExposure.js';

const paper = (id, questionIds) => ({ id, questions: questionIds.map((qid) => ({ id: qid })) });

test('serving a set marks every question in it as seen', () => {
  const seen = recordQuestionsSeen({}, [{ id: 1 }, { id: 2 }], new Date('2026-08-12T09:00:00Z'));
  assert.deepEqual(seen, { 1: '2026-08-12', 2: '2026-08-12' });
});

test('a question keeps the date it was first met, not the latest retake', () => {
  const first = recordQuestionsSeen({}, [{ id: 1 }], new Date('2026-06-01T00:00:00Z'));
  const second = recordQuestionsSeen(first, [{ id: 1 }, { id: 2 }], new Date('2026-08-12T00:00:00Z'));
  assert.equal(second['1'], '2026-06-01', 'the original sighting stands');
  assert.equal(second['2'], '2026-08-12');
});

test('recording never mutates the map it was given', () => {
  const before = { 1: '2026-06-01' };
  recordQuestionsSeen(before, [{ id: 2 }]);
  assert.deepEqual(before, { 1: '2026-06-01' }, 'React state must not be edited in place');
});

test('ids compare as strings, so a numeric id and its string form are one question', () => {
  const seen = recordQuestionsSeen({}, [{ id: 7 }]);
  assert.equal(paperExposure(paper('p', ['7']), seen).seen, 1);
});

test('questions without an id are skipped rather than stored under a junk key', () => {
  const seen = recordQuestionsSeen({}, [{ id: null }, { id: '' }, {}, null, { id: 3 }]);
  assert.deepEqual(seen, { 3: new Date().toISOString().slice(0, 10) });
});

test('an untouched paper is fresh; one seen question is enough to burn it', () => {
  const p = paper('mock-10', [1, 2, 3, 4]);
  assert.equal(paperExposure(p, {}).isFresh, true);

  // Section practice pools questions across papers — meeting one there costs
  // the whole paper its unseen status, which is the point.
  const afterSectionDrill = recordQuestionsSeen({}, [{ id: 3 }]);
  const exposure = paperExposure(p, afterSectionDrill);
  assert.equal(exposure.isFresh, false);
  assert.equal(exposure.seen, 1);
  assert.equal(exposure.unseen, 3);
  assert.equal(exposure.seenPct, 25);
});

test('an empty or missing paper is not reported as fresh', () => {
  assert.equal(paperExposure(paper('empty', []), {}).isFresh, false);
  assert.equal(paperExposure(null, {}).isFresh, false);
  assert.equal(paperExposure(undefined, undefined).total, 0);
});

test('the strict pool is the papers with nothing seen in them', () => {
  const papers = [paper('a', [1, 2]), paper('b', [3, 4]), paper('c', [5, 6])];
  const seen = recordQuestionsSeen({}, [{ id: 1 }, { id: 6 }]);
  assert.deepEqual(freshPapers(papers, seen).map((p) => p.id), ['b']);
  assert.deepEqual(freshPapers(papers, {}).map((p) => p.id), ['a', 'b', 'c']);
});
