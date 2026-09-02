const ACCEPTED_DECISIONS = new Set(['published', 'published_new', 'updated']);

const asArray = (value) => Array.isArray(value) ? value : [];

const cleanDate = (value) => {
  const match = String(value || '').match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
};

const acceptedFromCandidates = (audit) => asArray(audit.candidates)
  .filter((candidate) => ACCEPTED_DECISIONS.has(candidate.decision))
  .map((candidate) => ({
    title: candidate.canonicalDossier || candidate.canonicalTitle || candidate.title || 'Untitled dossier',
    updateType: candidate.decision === 'updated' ? 'UPDATED' : 'NEW'
  }));

const acceptedFromTopLevel = (audit) => [
  ...asArray(audit.published).map((item) => ({
    title: item.canonicalDossier || item.title || 'Untitled dossier',
    updateType: String(item.updateType || item.action || 'NEW').toUpperCase().includes('UPDATE')
      ? 'UPDATED'
      : 'NEW'
  })),
  ...asArray(audit.updated).map((item) => ({
    title: item.canonicalDossier || item.title || 'Untitled dossier',
    updateType: 'UPDATED'
  }))
];

const uniqueAccepted = (items) => {
  const unique = new Map();
  items.forEach((item) => {
    const key = String(item.title || '').trim().toLowerCase();
    if (!key) return;
    const existing = unique.get(key);
    unique.set(key, existing?.updateType === 'NEW' ? existing : item);
  });
  return [...unique.values()];
};

export const summarizeCARun = (audit = {}, auditSource = 'REPOSITORY') => {
  const candidates = asArray(audit.candidates);
  const acceptedCandidates = acceptedFromCandidates(audit);
  const accepted = uniqueAccepted(
    acceptedCandidates.length ? acceptedCandidates : acceptedFromTopLevel(audit)
  );
  const rawStatus = String(audit.status || 'completed').toUpperCase();
  const validationFailed = rawStatus.includes('VALIDATION_FAILURE')
    || asArray(audit.validationResults).some((item) => (
      String(item.status || '').toLowerCase() === 'failed'
    ));
  const failed = rawStatus === 'FAILED' || rawStatus.includes('ERROR');
  const runDate = cleanDate(
    audit.runDate || audit.startedAt || audit.searchWindow?.end || audit.window?.end || audit.completedAt
  );
  const ignoredCandidates = candidates.filter((candidate) => candidate.decision === 'ignored');
  const ignoredCount = Number.isFinite(Number(audit.ignoredCount))
    ? Number(audit.ignoredCount)
    : ignoredCandidates.length || asArray(audit.ignored).length;

  return {
    runDate,
    status: accepted.length
      ? 'PUBLISHED'
      : failed ? 'FAILED' : validationFailed ? 'VALIDATION_FAILED' : 'NO_CHANGES',
    candidatesFound: Number.isFinite(Number(audit.candidatesFound))
      ? Number(audit.candidatesFound)
      : candidates.length,
    ignoredCount,
    newCount: accepted.filter((item) => item.updateType === 'NEW').length,
    updatedCount: accepted.filter((item) => item.updateType === 'UPDATED').length,
    accepted,
    auditSource,
    completedAt: audit.completedAt || audit.finishedAt || audit.startedAt || null
  };
};

export const mergeScheduleRuns = (...runGroups) => {
  const byDate = new Map();
  runGroups.flat().filter((run) => run?.runDate).forEach((run) => {
    const existing = byDate.get(run.runDate);
    if (!existing) {
      byDate.set(run.runDate, { ...run, accepted: uniqueAccepted(run.accepted || []) });
      return;
    }

    const accepted = uniqueAccepted([...(existing.accepted || []), ...(run.accepted || [])]);
    const hasFailure = [existing.status, run.status].includes('FAILED');
    const hasValidationFailure = [existing.status, run.status].includes('VALIDATION_FAILED');
    byDate.set(run.runDate, {
      ...existing,
      status: accepted.length
        ? 'PUBLISHED'
        : hasFailure ? 'FAILED' : hasValidationFailure ? 'VALIDATION_FAILED' : 'NO_CHANGES',
      candidatesFound: Math.max(existing.candidatesFound || 0, run.candidatesFound || 0),
      ignoredCount: Math.max(existing.ignoredCount || 0, run.ignoredCount || 0),
      newCount: accepted.filter((item) => item.updateType === 'NEW').length,
      updatedCount: accepted.filter((item) => item.updateType === 'UPDATED').length,
      accepted,
      auditSource: existing.auditSource === run.auditSource
        ? existing.auditSource
        : 'REPOSITORY_AND_LIVE',
      completedAt: run.completedAt || existing.completedAt
    });
  });

  return [...byDate.values()].sort((left, right) => right.runDate.localeCompare(left.runDate));
};

