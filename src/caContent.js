import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db, getAuthenticatedApiHeaders } from './firebase';
import staticDossiers from './data/ca_knowledge_graph.json';
import staticQCards from './data/gk_qcards_data.json';

const normalizeIssueKey = (value) => String(value || '')
  .normalize('NFKD')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const qCardFromDossier = (dossier) => ({
  id: `qcard-ca-${dossier.id}`,
  topic: dossier.category,
  category: dossier.subcategory,
  title: dossier.title,
  subtitle: dossier.whyThisMayBeAsked,
  badge: dossier.priority === 'P1' ? 'Daily P1 Dossier' : 'Daily Issue Dossier',
  color: dossier.category === 'Law and justice' ? '#6C4CF1' : '#FF6B5E',
  readTime: '3 min read',
  summary: dossier.onePager?.thirtySecondSummary || dossier.dossier?.whatHappened || '',
  keyMilestones: dossier.dossier?.timeline || [],
  keyArticles: (dossier.facts || []).slice(0, 8).map((fact) => ({
    article: fact.id || 'Verified fact',
    desc: fact.factText
  })),
  examTraps: dossier.onePager?.examTraps || [],
  memoryTip: dossier.onePager?.mnemonic || 'Connect the event to its governing institution.',
  sourceDossierId: dossier.id,
  publishedAt: dossier.publishedAt || null
});

const mergeByCanonicalTitle = (staticItems, liveItems) => {
  const merged = new Map(staticItems.map((item) => [normalizeIssueKey(item.title), item]));
  liveItems.forEach((item) => {
    const aliases = Array.isArray(item.aliases) ? item.aliases : [];
    const replacementKey = aliases.map(normalizeIssueKey).find((alias) => merged.has(alias));
    if (replacementKey) merged.delete(replacementKey);
    merged.set(item.canonicalKey || normalizeIssueKey(item.title), item);
  });
  return [...merged.values()];
};

export const getQCardKey = (card) => `${card.id}::${card.title}`;

const normalizeRepositoryAudit = (audit) => {
  const candidates = Array.isArray(audit.candidates) ? audit.candidates : [];
  const accepted = candidates.filter((candidate) => (
    candidate.decision === 'updated' || candidate.decision === 'published'
  ));
  const ignored = candidates.filter((candidate) => candidate.decision === 'ignored');
  const published = accepted.map((candidate, index) => ({
    id: `${audit.runId || audit.auditFileName}-accepted-${index}`,
    title: candidate.canonicalDossier || candidate.title,
    updateType: candidate.decision === 'updated' ? 'UPDATED' : 'NEW',
    score: candidate.score?.total ?? candidate.score ?? 0,
    scoreBreakdown: candidate.score || {},
    reason: candidate.reason || '',
    sourceGate: candidate.sourceGate || null,
    conflictResolution: candidate.conflictResolution || ''
  }));
  const ignoredItems = ignored.map((candidate) => ({
    title: candidate.title,
    score: candidate.score?.total ?? candidate.score ?? 0,
    scoreBreakdown: candidate.score || {},
    reasons: [candidate.rejectionReason].filter(Boolean),
    sourceGate: candidate.sourceGate || null
  }));
  const runDate = String(audit.startedAt || audit.window?.end || '').slice(0, 10);

  return {
    id: audit.runId || audit.auditFileName,
    runId: audit.runId || audit.auditFileName,
    runDate,
    status: String(audit.status || 'completed').toUpperCase(),
    trigger: 'CODEX_AUTOMATION',
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
    errors: audit.errors || [],
    completedAt: audit.finishedAt || null
  };
};

const fetchRepositoryCAAuditRuns = async () => {
  const response = await fetch('/api/ca-admin-audit', {
    method: 'GET',
    headers: await getAuthenticatedApiHeaders(),
    cache: 'no-store'
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'Repository CA audit logs are unavailable.');
    error.code = payload.error?.code || `http-${response.status}`;
    throw error;
  }
  return (payload.data?.runs || []).map(normalizeRepositoryAudit);
};

export function useCAContent() {
  const [liveDossiers, setLiveDossiers] = useState([]);
  const [contentStatus, setContentStatus] = useState('LOADING');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'caDossiers'));
        if (!active) return;
        setLiveDossiers(snapshot.docs
          .map((document) => ({ firestoreId: document.id, ...document.data() }))
          .filter((dossier) => dossier.status === 'PUBLISHED'));
        setContentStatus('LIVE');
      } catch (error) {
        console.warn('Live CA catalogue unavailable; using bundled catalogue.', error);
        if (active) setContentStatus('BUNDLED');
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const dossiers = useMemo(
    () => mergeByCanonicalTitle(staticDossiers, liveDossiers),
    [liveDossiers]
  );
  const qcards = useMemo(() => {
    const liveCards = liveDossiers.map(qCardFromDossier);
    return mergeByCanonicalTitle(staticQCards, liveCards)
      .map((card) => ({ ...card, cardKey: getQCardKey(card) }));
  }, [liveDossiers]);

  return { dossiers, qcards, liveDossierCount: liveDossiers.length, contentStatus };
}

export async function fetchCAOrchestrationRuns() {
  const [firestoreResult, repositoryResult] = await Promise.allSettled([
    getDocs(query(
      collection(db, 'caOrchestrationRuns'),
      orderBy('startedAt', 'desc'),
      limit(30)
    )),
    fetchRepositoryCAAuditRuns()
  ]);

  const firestoreRuns = firestoreResult.status === 'fulfilled'
    ? firestoreResult.value.docs.map((document) => ({
      id: document.id,
      auditSource: 'FIRESTORE',
      ...document.data()
    }))
    : [];
  const repositoryRuns = repositoryResult.status === 'fulfilled' ? repositoryResult.value : [];

  if (!firestoreRuns.length && !repositoryRuns.length) {
    throw firestoreResult.status === 'rejected'
      ? firestoreResult.reason
      : repositoryResult.reason;
  }

  return [...firestoreRuns, ...repositoryRuns]
    .sort((left, right) => {
      const leftDate = left.startedAt?.toDate?.() || new Date(left.completedAt || left.runDate || 0);
      const rightDate = right.startedAt?.toDate?.() || new Date(right.completedAt || right.runDate || 0);
      return rightDate - leftDate;
    })
    .slice(0, 30);
}
