import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getFirestore } from 'firebase-admin/firestore';
import { refreshFirebaseAdminCredential } from '../server/privacy-service.js';
import { mergeScheduleRuns, summarizeCARun } from '../shared/ca-public-history.js';

const AUDIT_DIRECTORY = resolve(process.cwd(), 'CA_Agent_Logs');
const MAX_RUNS = 30;

const loadRepositoryRuns = async () => {
  const names = (await readdir(AUDIT_DIRECTORY))
    .filter((name) => /^\d{4}-\d{2}-\d{2}.*\.json$/i.test(name))
    .sort()
    .reverse()
    .slice(0, MAX_RUNS);

  return Promise.all(names.map(async (name) => {
    const audit = JSON.parse(await readFile(resolve(AUDIT_DIRECTORY, name), 'utf8'));
    return summarizeCARun(audit, 'REPOSITORY');
  }));
};

const loadLiveRuns = async () => {
  await refreshFirebaseAdminCredential();
  const snapshot = await getFirestore()
    .collection('caOrchestrationRuns')
    .orderBy('startedAt', 'desc')
    .limit(MAX_RUNS)
    .get();
  return snapshot.docs.map((document) => summarizeCARun(document.data(), 'LIVE'));
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({
      error: { code: 'method-not-allowed', message: 'Use GET.' }
    });
  }

  const [repositoryResult, liveResult] = await Promise.allSettled([
    loadRepositoryRuns(),
    loadLiveRuns()
  ]);
  const repositoryRuns = repositoryResult.status === 'fulfilled' ? repositoryResult.value : [];
  const liveRuns = liveResult.status === 'fulfilled' ? liveResult.value : [];
  const runs = mergeScheduleRuns(repositoryRuns, liveRuns).slice(0, MAX_RUNS);

  if (!runs.length) {
    console.error('Public CA schedule history is unavailable', {
      repository: repositoryResult.reason,
      live: liveResult.reason
    });
    return response.status(503).json({
      error: { code: 'unavailable', message: 'Schedule history is temporarily unavailable.' }
    });
  }

  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  return response.status(200).json({
    data: {
      generatedAt: new Date().toISOString(),
      runs
    }
  });
}

