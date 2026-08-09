const ACCEPTED_DECISIONS = new Set(['updated', 'published', 'published_new']);

const asArray = (value) => Array.isArray(value) ? value : [];

const scoreFor = (item = {}) => item.score?.total ?? item.score ?? 0;

const normalizePublishedCandidate = (candidate, index, runKey) => ({
  id: `${runKey}-accepted-${index}`,
  title: candidate.canonicalDossier || candidate.title,
  updateType: candidate.decision === 'updated' ? 'UPDATED' : 'NEW',
  score: scoreFor(candidate),
  scoreBreakdown: candidate.score || {},
  reason: candidate.reason || '',
  sources: asArray(candidate.sources),
  sourceGate: candidate.sourceGate || null,
  conflictResolution: candidate.conflictResolution || ''
});

const normalizeTopLevelPublished = (item, index, runKey, fallbackType) => ({
  id: item.id || `${runKey}-accepted-${index}`,
  title: item.canonicalDossier || item.title,
  updateType: String(item.updateType || item.action || fallbackType).toUpperCase()
    .replace('PUBLISHED_', '')
    .replace('PUBLISHED', 'NEW'),
  score: scoreFor(item),
  scoreBreakdown: item.scoreBreakdown || item.score || {},
  reason: item.reason || '',
  sources: asArray(item.sources),
  sourceGate: item.sourceGate || null,
  conflictResolution: item.conflictResolution || ''
});

export const normalizeRepositoryAudit = (audit = {}) => {
  const candidates = asArray(audit.candidates);
  const accepted = candidates.filter((candidate) => ACCEPTED_DECISIONS.has(candidate.decision));
  const ignored = candidates.filter((candidate) => candidate.decision === 'ignored');
  const runKey = audit.runId || audit.auditFileName || 'repository-ca-run';
  const published = accepted.length
    ? accepted.map((candidate, index) => normalizePublishedCandidate(candidate, index, runKey))
    : [
      ...asArray(audit.published).map((item, index) => (
        normalizeTopLevelPublished(item, index, runKey, 'NEW')
      )),
      ...asArray(audit.updated).map((item, index) => (
        normalizeTopLevelPublished(item, index + asArray(audit.published).length, runKey, 'UPDATED')
      ))
    ];
  const ignoredItems = (ignored.length ? ignored : asArray(audit.ignored)).map((candidate) => ({
    title: candidate.title,
    score: scoreFor(candidate),
    scoreBreakdown: candidate.scoreBreakdown || candidate.score || {},
    reasons: asArray(candidate.reasons).length
      ? candidate.reasons
      : [candidate.rejectionReason || candidate.reason].filter(Boolean),
    sources: asArray(candidate.sources),
    sourceGate: candidate.sourceGate || null
  }));
  const runDate = String(audit.startedAt || audit.window?.end || '').slice(0, 10);
  const errors = asArray(audit.errors);

  return {
    id: runKey,
    runId: runKey,
    runDate,
    status: String(audit.status || 'completed').toUpperCase(),
    trigger: audit.trigger || 'CODEX_AUTOMATION',
    auditSource: 'REPOSITORY',
    auditFileName: audit.auditFileName,
    searchWindow: audit.window || null,
    publishedCount: published.length,
    updatedCount: published.filter((item) => item.updateType === 'UPDATED').length,
    newCount: published.filter((item) => item.updateType === 'NEW').length,
    ignoredCount: ignoredItems.length,
    candidatesFound: candidates.length,
    published,
    ignored: ignoredItems,
    sourcesScanned: audit.sourcesScanned || [],
    validationResults: audit.validationResults || [],
    filesChangedByRun: audit.filesChangedByRun || [],
    errors,
    error: audit.error || (errors.length ? errors.map((error) => (
      typeof error === 'string' ? error : error.message || JSON.stringify(error)
    )).join('; ') : ''),
    completedAt: audit.finishedAt || null
  };
};
