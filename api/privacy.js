import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import {
  approveChildRightsRequest,
  authenticateParentForConsent,
  captureParentConsent,
  claimChildConsent,
  createParentConsentRequest,
  finalizeAdultConsent,
  getChildRightsApproval,
  getParentConsentRequest,
  listDataPrincipalRequests,
  processVerifiedRightsRequests,
  refreshFirebaseAdminCredential,
  startParentAdultVerification,
  submitDataPrincipalRequest
} from '../server/privacy-service.js';

const actions = {
  approveChildRightsRequest,
  authenticateParentForConsent,
  captureParentConsent,
  claimChildConsent,
  createParentConsentRequest,
  finalizeAdultConsent,
  getChildRightsApproval,
  getParentConsentRequest,
  listDataPrincipalRequests,
  startParentAdultVerification,
  submitDataPrincipalRequest
};

const statusByCode = {
  'invalid-argument': 400,
  'failed-precondition': 400,
  unauthenticated: 401,
  'permission-denied': 403,
  'not-found': 404,
  'already-exists': 409,
  'resource-exhausted': 429,
  'deadline-exceeded': 410,
  internal: 500,
  unavailable: 503
};

const requestIp = (request) => {
  const forwarded = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || request.socket?.remoteAddress || 'unknown';
};

const verifyAppCheck = async (request) => {
  const token = request.headers['x-firebase-appcheck'];
  const localBypass = process.env.DISABLE_APP_CHECK_FOR_LOCAL_TESTS === 'true';
  if (!token) {
    if (localBypass) return null;
    const error = new Error('Application verification is required.');
    error.code = 'unauthenticated';
    throw error;
  }
  return getAppCheck().verifyToken(String(token));
};

const resolveActor = async (request) => {
  const authorization = String(request.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) return undefined;
  const token = authorization.slice('Bearer '.length).trim();
  if (!token) return undefined;
  const decoded = await getAuth().verifyIdToken(token, true);
  return { uid: decoded.uid, token: decoded };
};

const writeError = (response, error) => {
  const code = String(error?.code || 'internal').replace(/^functions\//, '');
  const status = error?.httpErrorCode?.status || statusByCode[code] || 500;
  const message = status >= 500
    ? 'The privacy service could not complete the request.'
    : String(error?.message || 'The request could not be completed.');
  if (status >= 500) console.error('Privacy API error', error);
  response.status(status).json({ error: { code, message } });
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: { code: 'method-not-allowed', message: 'Use POST.' } });
  }

  try {
    await refreshFirebaseAdminCredential();
    await verifyAppCheck(request);
    const action = String(request.body?.action || '');
    const target = actions[action];
    if (!target) {
      return response.status(404).json({
        error: { code: 'not-found', message: 'Unknown privacy operation.' }
      });
    }

    const actor = await resolveActor(request);
    const data = request.body?.data && typeof request.body.data === 'object'
      ? request.body.data
      : {};
    const result = await target.invoke({
      auth: actor,
      data,
      rawRequest: {
        headers: request.headers,
        ip: requestIp(request)
      }
    });

    // Execute verified rights requests immediately. The daily cron remains a
    // retry/reconciliation mechanism rather than the primary execution path.
    if (
      (action === 'submitDataPrincipalRequest' || action === 'approveChildRightsRequest')
      && result?.status === 'QUEUED_VERIFIED'
    ) {
      await processVerifiedRightsRequests.invoke();
    }

    return response.status(200).json({ data: result ?? null });
  } catch (error) {
    return writeError(response, error);
  }
}
