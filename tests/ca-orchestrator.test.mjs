import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  calculateScore, normalizeIssueKey, toCandidateAuditSummary, validateCandidate
} from '../functions/ca-orchestrator.js';
import {
  compareDossierMonths, formatDossierMonthLabel, getDossierMonths,
  getDossierPriorityForMonth, isDossierInMonth
} from '../src/utils/caMonths.js';
import { normalizeRepositoryAudit } from '../src/utils/caAudit.js';

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

test('keeps the production Daily CA cron registered for 6:00 AM IST', async () => {
  const vercelConfig = JSON.parse(await readFile(
    new URL('../vercel.json', import.meta.url),
    'utf8'
  ));
  const dailyCACron = vercelConfig.crons?.find(
    (cron) => cron.path === '/api/ca-daily-cron'
  );

  assert.ok(dailyCACron, 'vercel.json must register /api/ca-daily-cron');
  assert.equal(dailyCACron.schedule, '30 0 * * *');
});

test('projects one canonical continuing dossier into its update months', () => {
  const dossier = {
    title: 'India’s Energy Security',
    month: 'Feb 2026',
    featuredMonths: ['Aug 2026'],
    priority: 'P2',
    featuredPriority: 'P1'
  };

  assert.deepEqual(getDossierMonths(dossier), ['Feb 2026', 'Aug 2026']);
  assert.equal(isDossierInMonth(dossier, 'Aug 2026'), true);
  assert.equal(getDossierPriorityForMonth(dossier, 'Feb 2026'), 'P2');
  assert.equal(getDossierPriorityForMonth(dossier, 'Aug 2026'), 'P1');
  assert.equal(formatDossierMonthLabel(dossier), 'Feb 2026 · updated Aug 2026');
  assert.ok(compareDossierMonths('Feb 2026', 'Aug 2026') < 0);
});

test('normalizes the August backfills for the Admin publishing log', async () => {
  const augustFirst = JSON.parse(await readFile(new URL(
    '../CA_Agent_Logs/2026-08-01T060000+0530_daily-ca-orchestrator.json',
    import.meta.url
  ), 'utf8'));
  const augustSecond = JSON.parse(await readFile(new URL(
    '../CA_Agent_Logs/2026-08-02T060000+0530_daily-ca-orchestrator.json',
    import.meta.url
  ), 'utf8'));
  const firstRun = normalizeRepositoryAudit(augustFirst);
  const secondRun = normalizeRepositoryAudit(augustSecond);

  assert.equal(firstRun.runDate, '2026-08-01');
  assert.equal(firstRun.publishedCount, 0);
  assert.equal(firstRun.ignoredCount, 3);
  assert.equal(firstRun.auditSource, 'REPOSITORY');
  assert.equal(secondRun.runDate, '2026-08-02');
  assert.equal(secondRun.trigger, 'MANUAL_BACKFILL');
  assert.equal(secondRun.updatedCount, 1);
  assert.equal(secondRun.published[0].title, 'India’s Energy Security');
  assert.equal(secondRun.published[0].score, 82);
});

test('normalizes published_new repository decisions as new dossiers', async () => {
  const augustThird = JSON.parse(await readFile(new URL(
    '../CA_Agent_Logs/2026-08-03T061306+0530_daily-ca-orchestrator.json',
    import.meta.url
  ), 'utf8'));
  const augustFourth = JSON.parse(await readFile(new URL(
    '../CA_Agent_Logs/2026-08-04T061821+0530_daily-ca-orchestrator.json',
    import.meta.url
  ), 'utf8'));
  const thirdRun = normalizeRepositoryAudit(augustThird);
  const fourthRun = normalizeRepositoryAudit(augustFourth);

  assert.equal(thirdRun.newCount, 1);
  assert.equal(thirdRun.published[0].title, 'European Union Artificial Intelligence Act');
  assert.equal(thirdRun.published[0].score, 96);
  assert.equal(fourthRun.newCount, 1);
  assert.equal(
    fourthRun.published[0].title,
    'United Nations Framework Convention on International Tax Cooperation'
  );
  assert.equal(fourthRun.published[0].score, 93);
});

test('falls back to top-level audit outcomes when candidate decisions are absent', () => {
  const run = normalizeRepositoryAudit({
    runId: 'fallback-run',
    startedAt: '2026-08-05T06:00:00+05:30',
    status: 'completed',
    published: [{
      title: 'Fallback New Dossier',
      action: 'published_new',
      score: 88,
      sources: [source('https://www.sci.gov.in/fallback.pdf', 'PRIMARY')]
    }],
    ignored: [{ title: 'Rejected Candidate', reason: 'Below threshold.' }]
  });

  assert.equal(run.newCount, 1);
  assert.equal(run.published[0].updateType, 'NEW');
  assert.equal(run.published[0].sources.length, 1);
  assert.equal(run.ignoredCount, 1);
  assert.deepEqual(run.ignored[0].reasons, ['Below threshold.']);
});
