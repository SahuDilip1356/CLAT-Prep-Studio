import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db, getAuthenticatedApiHeaders } from './firebase';
import staticDossiers from './data/ca_knowledge_graph.json';
import staticQCards from './data/gk_qcards_data.json';
import { normalizeRepositoryAudit } from './utils/caAudit';

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
    const canonicalKey = item.canonicalKey || normalizeIssueKey(item.title);
    const existing = merged.get(replacementKey || canonicalKey);
    if (replacementKey && replacementKey !== canonicalKey) merged.delete(replacementKey);
    merged.set(canonicalKey, {
      ...existing,
      ...item,
      featuredMonths: [...new Set([
        ...(Array.isArray(existing?.featuredMonths) ? existing.featuredMonths : []),
        ...(Array.isArray(item.featuredMonths) ? item.featuredMonths : [])
      ])]
    });
  });
  return [...merged.values()];
};

export const getQCardKey = (card) => `${card.id}::${card.title}`;

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
  const sourceWarnings = [
    firestoreResult.status === 'rejected' ? {
      source: 'FIRESTORE',
      message: firestoreResult.reason?.message || 'Firestore CA runs are unavailable.'
    } : null,
    repositoryResult.status === 'rejected' ? {
      source: 'REPOSITORY',
      message: repositoryResult.reason?.message || 'Repository CA audit logs are unavailable.'
    } : null
  ].filter(Boolean);

  if (!firestoreRuns.length && !repositoryRuns.length) {
    throw firestoreResult.status === 'rejected'
      ? firestoreResult.reason
      : repositoryResult.reason;
  }

  const runs = [...firestoreRuns, ...repositoryRuns]
    .sort((left, right) => {
      const leftDate = left.startedAt?.toDate?.() || new Date(left.completedAt || left.runDate || 0);
      const rightDate = right.startedAt?.toDate?.() || new Date(right.completedAt || right.runDate || 0);
      return rightDate - leftDate;
    })
    .slice(0, 30);

  return { runs, sourceWarnings };
}
