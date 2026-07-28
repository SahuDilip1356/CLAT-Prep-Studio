import {
  deleteExpiredPrivacyArtifacts,
  processVerifiedRightsRequests,
  refreshFirebaseAdminCredential
} from '../server/privacy-service.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  if (
    !process.env.CRON_SECRET
    || request.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await refreshFirebaseAdminCredential();
    await processVerifiedRightsRequests.invoke();
    await deleteExpiredPrivacyArtifacts.invoke();
    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error('Privacy cron failed', error);
    return response.status(500).json({ ok: false });
  }
}
