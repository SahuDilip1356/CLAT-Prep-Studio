/**
 * Guards the section Practice lanes.
 *
 * The defect this closes: English, Legal and Logical showed topic chips and
 * nothing else on their Practice tab. A student who could not already name the
 * skill failing them had no way in — the tab looked broken and, worse, offered
 * no route from "I am weak at Legal" to a set of questions.
 *
 * The lanes are built from difficulty level, so these pin the selection.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { levelPracticeFrom } from '../src/data/sectionBanks.js';

const bank = (levels) => ({
  questions: levels.map((difficultyLevel, index) => ({ id: `q${index + 1}`, difficultyLevel })),
});

test('a lane serves only its own difficulty level', () => {
  const set = levelPracticeFrom(bank([1, 2, 3, 1, 2, 3]), 2, 15);
  assert.deepEqual(set.map((q) => q.id), ['q2', 'q5']);
  assert.ok(set.every((q) => q.difficultyLevel === 2));
});

test('a lane never serves more than the limit', () => {
  const set = levelPracticeFrom(bank(Array(50).fill(1)), 1, 15);
  assert.equal(set.length, 15);
});

test('a level absent from the bank yields nothing rather than a wrong-level set', () => {
  assert.deepEqual(levelPracticeFrom(bank([1, 1, 1]), 3, 15), []);
  assert.deepEqual(levelPracticeFrom(null, 1, 15), []);
  assert.deepEqual(levelPracticeFrom({}, 1, 15), []);
});

// A student returning to the same lane must not be handed the same questions
// again; that is practice that teaches nothing.
test('coming back to a lane advances through the bank instead of repeating', () => {
  const pool = bank(Array(10).fill(1));
  const first = levelPracticeFrom(pool, 1, 3, 0);
  const later = levelPracticeFrom(pool, 1, 3, 3);
  assert.deepEqual(first.map((q) => q.id), ['q1', 'q2', 'q3']);
  assert.deepEqual(later.map((q) => q.id), ['q4', 'q5', 'q6']);
});

test('the rotation wraps rather than running off the end of the bank', () => {
  const pool = bank(Array(5).fill(1));
  const set = levelPracticeFrom(pool, 1, 3, 4);
  assert.deepEqual(set.map((q) => q.id), ['q5', 'q1', 'q2']);
  assert.equal(levelPracticeFrom(pool, 1, 3, 12).length, 3);
});

test('the same attempt count always yields the same set', () => {
  const pool = bank(Array(20).fill(2));
  assert.deepEqual(
    levelPracticeFrom(pool, 2, 5, 7).map((q) => q.id),
    levelPracticeFrom(pool, 2, 5, 7).map((q) => q.id),
  );
});

// An offset can only come from a stored attempt count, which nothing validates.
test('a negative or absurd offset still returns a usable set', () => {
  const pool = bank(Array(6).fill(1));
  assert.equal(levelPracticeFrom(pool, 1, 3, -1).length, 3);
  assert.equal(levelPracticeFrom(pool, 1, 3, 9_999).length, 3);
});
