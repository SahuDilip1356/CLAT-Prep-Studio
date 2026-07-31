import { runDailyCAOrchestration } from '../functions/ca-orchestrator.js';

export default async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  if (
    !process.env.CRON_SECRET
    || request.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await runDailyCAOrchestration({
      force: request.method === 'POST' && request.query?.force === 'true'
    });
    return response.status(200).json({
      ok: true,
      runId: result.runId,
      skipped: Boolean(result.skipped),
      publishedCount: result.publishedCount || 0,
      ignoredCount: result.ignoredCount || 0
    });
  } catch (error) {
    console.error('Daily CA orchestration failed', error);
    return response.status(500).json({ ok: false, error: 'Daily CA orchestration failed' });
  }
}
