import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSearchWindow } from '../functions/ca-orchestrator.js';

// The window used to be a fixed 30 hours, so a day the scheduler missed was
// never scanned by anything. Eleven days were lost that way. These cover the
// window reaching back to the last completed run instead.

// Mirrors the single-field query the resolver makes: runDate desc, status
// filtered in code. Takes the run documents newest-first, as Firestore returns.
const dbWithRuns = (runs) => ({
  collection: () => ({
    where: () => ({
      orderBy: () => ({
        limit: () => ({
          get: async () => ({
            empty: runs.length === 0,
            docs: runs.map((run) => ({ data: () => run })),
          }),
        }),
      }),
    }),
  }),
});

const dbReturning = (previous) => dbWithRuns(
  previous ? [{ status: 'COMPLETED', ...previous }] : []
);

const dbThatFails = () => ({
  collection: () => ({
    where: () => ({
      orderBy: () => ({
        limit: () => ({ get: async () => { throw new Error('firestore down'); } }),
      }),
    }),
  }),
});

const at = (iso) => new Date(iso);

test('a first run, with nothing on record, uses the base window', async () => {
  const w = await resolveSearchWindow({
    db: dbReturning(null), now: at('2026-09-03T06:00:00+05:30'), runDate: '2026-09-03',
  });
  assert.equal(w.hours, 30);
  assert.equal(w.maxDossiers, 5);
  assert.equal(w.previousRunDate, null);
  assert.equal(w.daysCovered, 1);
});

test('the ordinary case, yesterday ran, stays near a day', async () => {
  const w = await resolveSearchWindow({
    db: dbReturning({ runDate: '2026-09-02' }),
    now: at('2026-09-03T06:00:00+05:30'),
    runDate: '2026-09-03',
  });
  // 30h from the previous midnight plus overlap, never below the base window.
  assert.equal(w.hours, 36);
  assert.equal(w.daysCovered, 2);
  assert.equal(w.previousRunDate, '2026-09-02');
  assert.equal(w.truncated, false);
});

test('a missed day is swept up rather than lost', async () => {
  const skipped = await resolveSearchWindow({
    db: dbReturning({ runDate: '2026-08-30' }),
    now: at('2026-09-01T06:00:00+05:30'),
    runDate: '2026-09-01',
  });
  const normal = await resolveSearchWindow({
    db: dbReturning({ runDate: '2026-08-31' }),
    now: at('2026-09-01T06:00:00+05:30'),
    runDate: '2026-09-01',
  });
  assert.ok(
    skipped.hours > normal.hours,
    'the run after a gap must look back further than one after a normal day',
  );
  assert.ok(skipped.hours >= 48, `expected at least two days back, got ${skipped.hours}`);
});

test('the cap scales with the gap so catch-up is not throttled to one day', async () => {
  const w = await resolveSearchWindow({
    db: dbReturning({ runDate: '2026-07-26' }),
    now: at('2026-07-31T06:00:00+05:30'),
    runDate: '2026-07-31',
  });
  assert.ok(w.maxDossiers > 5, 'a five-day gap must allow more than one day of dossiers');
  assert.ok(w.maxDossiers <= 15, 'but never an unbounded flood');
});

test('a gap longer than a week is truncated and says so', async () => {
  const w = await resolveSearchWindow({
    db: dbReturning({ runDate: '2026-06-01' }),
    now: at('2026-09-03T06:00:00+05:30'),
    runDate: '2026-09-03',
  });
  assert.equal(w.hours, 24 * 7);
  assert.equal(w.truncated, true, 'a truncated window must be visible in the audit');
  assert.equal(w.maxDossiers, 15);
});

test('a window is never a reason to skip a run', async () => {
  const w = await resolveSearchWindow({
    db: dbThatFails(), now: at('2026-09-03T06:00:00+05:30'), runDate: '2026-09-03',
  });
  assert.equal(w.hours, 30, 'a failed lookup must fall back, not throw');
  assert.equal(w.maxDossiers, 5);
});

test('failed runs in between are skipped to find the last completed one', async () => {
  const w = await resolveSearchWindow({
    db: dbWithRuns([
      { runDate: '2026-09-02', status: 'FAILED' },
      { runDate: '2026-09-01', status: 'RUNNING' },
      { runDate: '2026-08-30', status: 'COMPLETED' },
    ]),
    now: at('2026-09-03T06:00:00+05:30'),
    runDate: '2026-09-03',
  });
  assert.equal(
    w.previousRunDate, '2026-08-30',
    'a failed run is not a scanned day; the window must reach past it',
  );
  assert.ok(w.hours >= 96, `expected to reach back past the failures, got ${w.hours}`);
});

test('no completed run among those scanned falls back to the base window', async () => {
  const w = await resolveSearchWindow({
    db: dbWithRuns([{ runDate: '2026-09-02', status: 'FAILED' }]),
    now: at('2026-09-03T06:00:00+05:30'),
    runDate: '2026-09-03',
  });
  assert.equal(w.hours, 30);
  assert.equal(w.previousRunDate, null);
});
