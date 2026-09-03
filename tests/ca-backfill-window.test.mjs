import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCandidate } from '../functions/ca-orchestrator.js';

// A backfill asks a live web search for news from weeks ago. The model will
// return something whether or not it is from the right period, so the server
// has to prove the date rather than trust it. These cover that proof.

const WINDOW = { from: '2026-08-30', to: '2026-08-31' };
const longText = 'x'.repeat(120);

const candidate = (overrides = {}) => ({
  canonicalTitle: 'Supreme Court on preventive detention safeguards',
  eventDate: '2026-08-31',
  score: {
    legal: 25, significance: 15, passagePotential: 15, staticGk: 10,
    recency: 10, sourceStrength: 10, examPattern: 10, continuingIssue: 5,
  },
  sources: [
    { title: 'Judgment', url: 'https://main.sci.gov.in/x', publisher: 'SCI', publishedAt: '2026-08-31', sourceType: 'PRIMARY' },
    { title: 'Report', url: 'https://pib.gov.in/y', publisher: 'PIB', publishedAt: '2026-08-31', sourceType: 'SECONDARY' },
  ],
  dossier: {
    whatHappened: longText, background: longText,
    legalSignificance: longText, staticGkConnection: longText,
  },
  clatPassage: { passageText: longText },
  onePager: { thirtySecondSummary: longText },
  facts: [1, 2, 3],
  qcards: [1, 2, 3],
  existingDossierTitle: '',
  ...overrides,
});

test('a candidate genuinely from the missed day is accepted', () => {
  const result = validateCandidate(candidate(), new Set(), WINDOW);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
});

test('news from today, stamped with the backfill date, is rejected', () => {
  const result = validateCandidate(
    candidate({
      eventDate: '2026-09-03',
      sources: candidate().sources.map((s) => ({ ...s, publishedAt: '2026-09-03' })),
    }),
    new Set(), WINDOW,
  );
  assert.ok(result.errors.includes('event-date-outside-window'));
  assert.equal(result.valid, false);
});

test('the right eventDate cannot launder sources from outside the window', () => {
  const result = validateCandidate(
    candidate({ sources: candidate().sources.map((s) => ({ ...s, publishedAt: '2026-09-03' })) }),
    new Set(), WINDOW,
  );
  assert.ok(
    result.errors.includes('no-source-published-in-window'),
    'claiming the date is not enough; a source must corroborate it',
  );
});

test('a missing or malformed eventDate is rejected, not defaulted', () => {
  for (const bad of [undefined, '', 'last Tuesday', '31-08-2026']) {
    const result = validateCandidate(candidate({ eventDate: bad }), new Set(), WINDOW);
    assert.ok(
      result.errors.includes('event-date-outside-window'),
      `expected ${JSON.stringify(bad)} to be rejected`,
    );
  }
});

test('a daily run is not date-bound, so a dateline a day early still passes', () => {
  const result = validateCandidate(candidate({ eventDate: '2026-07-04' }), new Set());
  assert.equal(result.valid, true, 'no window means no date check');
  assert.ok(!result.errors.some((e) => e.includes('window')));
});

test('the date guard adds to the existing checks rather than replacing them', () => {
  const result = validateCandidate(
    candidate({ eventDate: '2026-09-03', canonicalTitle: 'sh' }),
    new Set(), WINDOW,
  );
  assert.ok(result.errors.includes('invalid-title'));
  assert.ok(result.errors.includes('event-date-outside-window'));
});
