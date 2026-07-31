import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getAppCheck } from 'firebase-admin/app-check';
import {
  refreshFirebaseAdminCredential,
  verifyAdminAccessToken
} from '../server/privacy-service.js';

const AUDIT_DIRECTORY = resolve(process.cwd(), 'CA_Agent_Logs');
const MAX_LOGS = 30;

const verifyAppCheck = async (request) => {
  const token = request.headers['x-firebase-appcheck'];
  const localBypass = process.env.NODE_ENV !== 'production'
    && process.env.DISABLE_APP_CHECK_FOR_LOCAL_TESTS === 'true';
  if (!token) {
    if (localBypass) return;
    const error = new Error('Application verification is required.');
    error.code = 'unauthenticated';
    throw error;
  }
  await getAppCheck().verifyToken(String(token));
};

const resolveAdmin = async (request) => {
  const authorization = String(request.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) {
    const error = new Error('Sign in is required.');
    error.code = 'unauthenticated';
    throw error;
  }
  return verifyAdminAccessToken(authorization.slice('Bearer '.length).trim());
};

const loadAuditLogs = async () => {
  const names = (await readdir(AUDIT_DIRECTORY))
    .filter((name) => /^\d{4}-\d{2}-\d{2}.*\.json$/i.test(name))
    .sort()
    .reverse()
    .slice(0, MAX_LOGS);

  const logs = await Promise.all(names.map(async (name) => {
    const contents = await readFile(resolve(AUDIT_DIRECTORY, name), 'utf8');
    const audit = JSON.parse(contents);
    return { ...audit, auditFileName: name, auditSource: 'REPOSITORY' };
  }));
  return logs;
};

const statusFor = (error) => {
  const code = String(error?.code || '').replace(/^functions\//, '');
  if (code === 'unauthenticated') return 401;
  if (code === 'permission-denied') return 403;
  if (code === 'not-found' || error?.code === 'ENOENT') return 404;
  return 500;
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({
      error: { code: 'method-not-allowed', message: 'Use GET.' }
    });
  }

  try {
    await refreshFirebaseAdminCredential();
    await verifyAppCheck(request);
    await resolveAdmin(request);
    const runs = await loadAuditLogs();
    response.setHeader('Cache-Control', 'private, no-store');
    return response.status(200).json({ data: { runs } });
  } catch (error) {
    const status = statusFor(error);
    if (status >= 500) console.error('CA admin audit API error', error);
    return response.status(status).json({
      error: {
        code: String(error?.code || 'internal').replace(/^functions\//, ''),
        message: status >= 500
          ? 'The Current Affairs audit service could not complete the request.'
          : String(error?.message || 'The request could not be completed.')
      }
    });
  }
}
