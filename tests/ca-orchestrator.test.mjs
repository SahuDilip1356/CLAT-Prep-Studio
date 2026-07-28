import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateScore, normalizeIssueKey, toCandidateAuditSummary, validateCandidate
} from '../functions/ca-orchestrator.js';

const source = (url, sourceType = 'SECONDARY') => ({
  title: 'Verified source',
  url,
  publisher: 'Publisher',
  publishedAt: '2026-07-25',
  sourceType
});

const candidate = {
  canonicalTitle: 'Supreme Court Digital Access Judgment',
  score: {
    legalConstitutional: 22, significance: 12, passagePotential: 12,
    staticGk: 7, recency: 9, sourceStrength: 9, examSimilarity: 8,
    continuingIssue: 2
  },
  sources: [
    source('https://www.sci.gov.in/judgment.pdf', 'PRIMARY'),
    source('https://www.thehindu.com/news/example')
  ],
  dossier: {
    whatHappened: 'The Supreme Court delivered a detailed judgment clarifying access to digital public services and the constitutional obligations imposed on public authorities in India.',
    background: 'The dispute developed through a series of administrative decisions and constitutional challenges concerning equality, access, due process and the delivery of essential services.',
    legalSignificance: 'The judgment explains the relationship between Articles 14, 19 and 21, judicial review, proportionality and the positive obligations of the State under the Constitution.',
    staticGkConnection: 'The issue connects constitutional remedies, the jurisdiction of the Supreme Court, writs, fundamental rights and the institutional structure of Indian public administration.'
  },
  clatPassage: {
    passageText: 'A sufficiently detailed passage explaining the judgment, its reasoning, competing rights and the proportionality analysis so that the attached question is fully answerable by a student.'
  },
  onePager: {
    thirtySecondSummary: 'The Supreme Court clarified how constitutional equality and liberty protections apply when essential public services depend on digital access, requiring proportionate safeguards.'
  },
  facts: [{}, {}, {}],
  qcards: [{}, {}, {}],
  existingDossierTitle: ''
};

test('normalizes issue keys deterministically', () => {
  assert.equal(normalizeIssueKey('Article 19(1)(a) — Speech'), 'article-19-1-a-speech');
});

test('calculates the CLAT score out of 100', () => {
  assert.equal(calculateScore(candidate.score), 81);
});

test('accepts a high-scoring, sourced, complete dossier', () => {
  const result = validateCandidate(candidate, new Set());
  assert.equal(result.valid, true);
  assert.equal(result.score, 81);
});

test('fails closed without an official primary source', () => {
  const result = validateCandidate({
    ...candidate,
    sources: [
      source('https://www.thehindu.com/news/example'),
      source('https://www.reuters.com/world/example')
    ]
  }, new Set());
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('missing-primary-source'));
});

test('accepts recognised international and government primary domains', () => {
  const result = validateCandidate({
    ...candidate,
    sources: [
      source('https://whc.unesco.org/en/news/example', 'PRIMARY'),
      source('https://www.reuters.com/world/example')
    ]
  }, new Set());
  assert.equal(result.valid, true);
});

test('rejects low-scoring candidates', () => {
  const result = validateCandidate({
    ...candidate,
    score: { ...candidate.score, legalConstitutional: 0, passagePotential: 0, significance: 0 }
  }, new Set());
  assert.ok(result.errors.includes('below-threshold'));
});

test('keeps source and scoring evidence in the admin audit summary', () => {
  const validation = validateCandidate(candidate, new Set());
  const summary = toCandidateAuditSummary(candidate, validation);
  assert.equal(summary.score, 81);
  assert.deepEqual(summary.scoreBreakdown, candidate.score);
  assert.equal(summary.sources.length, 2);
  assert.equal(summary.sourceGate.trusted, 2);
  assert.equal(summary.sourceGate.primary, 1);
  assert.equal(summary.sourceGate.passed, true);
  assert.equal(summary.validation.passed, true);
});
