import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeScheduleRuns, summarizeCARun } from '../shared/ca-public-history.js';

test('publishes only sanitized schedule-run fields', () => {
  const summary = summarizeCARun({
    startedAt: '2026-08-18T06:05:03+05:30',
    status: 'completed',
    candidates: [{
      title: 'UNCCD COP17',
      canonicalDossier: 'UNCCD COP17 and India’s Open Natural Ecosystems Guide',
      decision: 'published',
      sources: [{ url: 'https://example.com/private-evidence' }],
      reason: 'Internal editorial reasoning'
    }, {
      title: 'Rejected issue',
      decision: 'ignored',
      rejectionReason: 'Internal rejection detail'
    }]
  });

  assert.equal(summary.runDate, '2026-08-18');
  assert.equal(summary.status, 'PUBLISHED');
  assert.equal(summary.newCount, 1);
  assert.equal(summary.updatedCount, 0);
  assert.deepEqual(summary.accepted, [{
    title: 'UNCCD COP17 and India’s Open Natural Ecosystems Guide',
    updateType: 'NEW'
  }]);
  assert.equal(JSON.stringify(summary).includes('example.com'), false);
  assert.equal(JSON.stringify(summary).includes('editorial reasoning'), false);
});

test('keeps validation failures visible when no dossier was accepted', () => {
  const summary = summarizeCARun({
    startedAt: '2026-08-20T06:09:17+05:30',
    status: 'completed_with_validation_failure',
    candidates: Array.from({ length: 12 }, (_, index) => ({
      title: `Candidate ${index + 1}`,
      decision: 'ignored'
    }))
  });

  assert.equal(summary.status, 'VALIDATION_FAILED');
  assert.equal(summary.candidatesFound, 12);
  assert.equal(summary.ignoredCount, 12);
});

test('merges repository and live runs into one date-wise public record', () => {
  const merged = mergeScheduleRuns(
    [{
      runDate: '2026-08-04', status: 'PUBLISHED', candidatesFound: 8,
      ignoredCount: 7, newCount: 1, updatedCount: 0,
      accepted: [{ title: 'UN Tax Convention', updateType: 'NEW' }],
      auditSource: 'REPOSITORY'
    }],
    [{
      runDate: '2026-08-04', status: 'NO_CHANGES', candidatesFound: 6,
      ignoredCount: 6, newCount: 0, updatedCount: 0, accepted: [], auditSource: 'LIVE'
    }]
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0].status, 'PUBLISHED');
  assert.equal(merged[0].newCount, 1);
  assert.equal(merged[0].candidatesFound, 8);
  assert.equal(merged[0].auditSource, 'REPOSITORY_AND_LIVE');
});

