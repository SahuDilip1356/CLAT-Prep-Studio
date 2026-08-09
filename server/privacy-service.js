// Shared privacy backend used by the Vercel API entrypoints.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getVercelOidcToken } from '@vercel/oidc';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import {
  CONSENT_VERSION,
  PRIVACY_NOTICE_VERSION
} from '../shared/privacy-versions.js';

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const oidcSettings = {
  projectNumber: process.env.GCP_PROJECT_NUMBER,
  serviceAccountEmail: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
  poolId: process.env.GCP_WORKLOAD_IDENTITY_POOL_ID,
  providerId: process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID
};

const createVercelOidcAdc = () => {
  if (!Object.values(oidcSettings).every(Boolean)) return null;
  const providerPath = `projects/${oidcSettings.projectNumber}`
    + `/locations/global/workloadIdentityPools/${oidcSettings.poolId}`
    + `/providers/${oidcSettings.providerId}`;
  const audience = `//iam.googleapis.com/${providerPath}`;
  const tokenAudience = `https://iam.googleapis.com/${providerPath}`;
  const tokenFile = join(tmpdir(), 'clat-vercel-oidc-token');
  const credentialFile = join(tmpdir(), 'clat-google-external-account.json');
  writeFileSync(credentialFile, JSON.stringify({
    type: 'external_account',
    audience,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url:
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/`
      + `${oidcSettings.serviceAccountEmail}:generateAccessToken`,
    credential_source: {
      file: tokenFile,
      format: { type: 'text' }
    }
  }), { mode: 0o600 });
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialFile;
  return { tokenAudience, tokenFile };
};

const oidcAdc = serviceAccountJson ? null : createVercelOidcAdc();
const adminCredential = serviceAccountJson
  ? cert(JSON.parse(serviceAccountJson))
  : oidcAdc
    ? applicationDefault()
    : undefined;
const adminAppOptions = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  ...(adminCredential ? { credential: adminCredential } : {})
};

if (!getApps().length) initializeApp(adminAppOptions);

const db = getFirestore();
const adminAuth = getAuth();
export const refreshFirebaseAdminCredential = async () => {
  if (!oidcAdc) return;
  const token = await getVercelOidcToken({ audience: oidcAdc.tokenAudience });
  writeFileSync(oidcAdc.tokenFile, token, { mode: 0o600 });
};
export const verifyAdminAccessToken = async (token) => {
  const decoded = await adminAuth.verifyIdToken(String(token || ''), true);
  if (decoded.privacyAdmin !== true && decoded.caAdmin !== true) {
    throw new HttpsError('permission-denied', 'Current Affairs administrator access is required.');
  }
  return decoded;
};
const REGION = 'asia-south1';
const NOTICE_VERSION = PRIVACY_NOTICE_VERSION;
const INVITATION_TTL_HOURS = Number(process.env.PARENT_INVITATION_TTL_HOURS || 48);
const CHILD_ACTIVATION_TTL_HOURS = Number(process.env.CHILD_ACTIVATION_TTL_HOURS || 24);
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

const environmentValue = (name) => ({ value: () => process.env[name] || '' });
const resendApiKey = environmentValue('RESEND_API_KEY');
const verificationWebhookSecret = environmentValue('ADULT_VERIFICATION_WEBHOOK_SECRET');
const verificationStateSecret = environmentValue('PARENT_VERIFICATION_STATE_SECRET');
const appBaseUrl = environmentValue('APP_BASE_URL');
const consentFromEmail = environmentValue('PARENT_CONSENT_FROM_EMAIL');
const consentReplyToEmail = environmentValue('PARENT_CONSENT_REPLY_TO_EMAIL');
const adultVerificationStartUrl = environmentValue('ADULT_VERIFICATION_START_URL');

const hash = (value) => createHash('sha256').update(value).digest('hex');
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const escapeHtml = (value) => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');
const maskEmail = (value) => {
  const [local, domain] = normalizeEmail(value).split('@');
  if (!local || !domain) return '';
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(2, Math.min(6, local.length - 1)))}@${domain}`;
};
const callableOptions = { region: REGION, enforceAppCheck: true };
const httpStatusByCode = {
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
class HttpsError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.httpErrorCode = { status: httpStatusByCode[code] || 500 };
  }
}
const createCallable = (_options, handler) => ({ invoke: handler });
const createRequestHandler = (_options, handler) => ({ invoke: handler });
const createScheduledHandler = (_options, handler) => ({ invoke: handler });
const requireHttpsUrl = (value, label) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new HttpsError('failed-precondition', `${label} is not configured.`);
  }
  if (url.protocol !== 'https:') {
    throw new HttpsError('failed-precondition', `${label} must use HTTPS.`);
  }
  return url;
};
const requireStrongSecret = (value, label) => {
  if (String(value || '').length < 32) {
    throw new HttpsError('failed-precondition', `${label} is not securely configured.`);
  }
  return value;
};
const authenticatedGoogleUser = (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Google sign-in is required.');
  if (request.auth.token.firebase?.sign_in_provider !== 'google.com') {
    throw new HttpsError('failed-precondition', 'This workflow requires Google sign-in.');
  }
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError('failed-precondition', 'The Google email address must be verified.');
  }
  return request.auth;
};

const privacyAdministrator = (request) => {
  const actor = authenticatedGoogleUser(request);
  if (actor.token.privacyAdmin !== true) {
    throw new HttpsError('permission-denied', 'Privacy administrator access is required.');
  }
  return actor;
};

const validateVersions = (data) => {
  if (data.noticeVersion !== NOTICE_VERSION || data.consentVersion !== CONSENT_VERSION) {
    throw new HttpsError('failed-precondition', 'The privacy notice changed. Please review it again.');
  }
};

const validateRequiredPurposes = (purposes) => {
  if (purposes?.accountAndProgress !== true || purposes?.learningAnalytics !== true) {
    throw new HttpsError('invalid-argument', 'Required educational purposes were not accepted.');
  }
};

const secureCompare = (a, b) => {
  const first = Buffer.from(String(a || ''));
  const second = Buffer.from(String(b || ''));
  return first.length === second.length && timingSafeEqual(first, second);
};

async function sendEmail({ to, subject, html }) {
  const key = resendApiKey.value();
  const from = consentFromEmail.value();
  const replyTo = normalizeEmail(consentReplyToEmail.value());
  if (!key || !from) throw new Error('Parent email delivery is not configured.');
  if (replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) {
    throw new Error('Parent email reply-to address is invalid.');
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {})
    })
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const detail = errorBody.message || errorBody.error?.message || errorBody.error || `Email provider rejected the request (${response.status}).`;
    throw new Error(detail);
  }
}

export const finalizeAdultConsent = createCallable(callableOptions, async (request) => {
  const actor = authenticatedGoogleUser(request);
  const data = request.data || {};
  validateVersions(data);
  validateRequiredPurposes(data.purposes);
  if (data.ageBand !== 'ADULT' || data.adultDeclaration !== true) {
    throw new HttpsError('invalid-argument', 'An adult age-band declaration is required.');
  }

  const receiptRef = db.collection('consentReceipts').doc(hash(`${actor.uid}:${CONSENT_VERSION}:adult`));
  await db.runTransaction(async (transaction) => {
    transaction.set(receiptRef, {
      subjectUid: actor.uid,
      actorUid: actor.uid,
      actorRole: 'SELF',
      lawfulRoute: 'CONSENT',
      ageBand: 'ADULT',
      noticeVersion: NOTICE_VERSION,
      consentVersion: CONSENT_VERSION,
      purposes: data.purposes,
      event: 'GRANTED',
      source: 'WEB_GOOGLE_ONBOARDING',
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
    transaction.set(db.doc(`users/${actor.uid}/privacy/current`), {
      status: 'ADULT_CONSENTED',
      ageBand: 'ADULT',
      consentReceiptId: receiptRef.id,
      noticeVersion: NOTICE_VERSION,
      updatedAt: FieldValue.serverTimestamp()
    });
  });
  await adminAuth.setCustomUserClaims(actor.uid, {
    ...(await adminAuth.getUser(actor.uid)).customClaims,
    privacyStatus: 'ADULT_CONSENTED',
    subjectType: 'ADULT',
    consentReceiptId: receiptRef.id
  });
  return { status: 'ADULT_CONSENTED', consentReceiptId: receiptRef.id };
});

export const createParentConsentRequest = createCallable(
  { ...callableOptions, secrets: [resendApiKey] },
  async (request) => {
    const data = request.data || {};
    validateVersions(data);
    if (data.ageBand !== 'CHILD') throw new HttpsError('invalid-argument', 'Child age band is required.');
    const parentEmail = normalizeEmail(data.parentEmail);
    const childEmail = normalizeEmail(data.childEmail);
    const childName = String(data.childName || '').trim().replace(/\s+/g, ' ');
    if (!validEmail(parentEmail)) {
      throw new HttpsError('invalid-argument', 'Enter a valid parent or guardian email.');
    }
    if (!validEmail(childEmail)) {
      throw new HttpsError('invalid-argument', 'Enter a valid student email.');
    }
    if (childName.length < 2 || childName.length > 120) {
      throw new HttpsError('invalid-argument', 'Enter the student name.');
    }
    if (parentEmail === childEmail) {
      throw new HttpsError('invalid-argument', 'The student and parent must use different email addresses.');
    }

    const rateKey = hash(`${request.rawRequest.ip || 'unknown'}:${parentEmail}`);
    const rateRef = db.doc(`privacyRateLimits/${rateKey}`);
    const now = Date.now();
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(rateRef);
      const value = snapshot.data();
      const windowStart = value?.windowStart?.toMillis?.() || 0;
      const count = now - windowStart < RATE_LIMIT_WINDOW_MS ? (value?.count || 0) : 0;
      if (count >= RATE_LIMIT_MAX) {
        throw new HttpsError('resource-exhausted', 'Too many invitations. Please try again later.');
      }
      transaction.set(rateRef, {
        count: count + 1,
        windowStart: Timestamp.fromMillis(count ? windowStart : now),
        expiresAt: Timestamp.fromMillis(now + (2 * RATE_LIMIT_WINDOW_MS))
      });
    });

    const requestRef = db.collection('parentConsentRequests').doc();
    const expiresAt = Timestamp.fromMillis(now + (INVITATION_TTL_HOURS * 60 * 60 * 1000));
    const invitationToken = randomBytes(32).toString('base64url');
    const baseUrl = requireHttpsUrl(appBaseUrl.value(), 'Application base URL');
    baseUrl.pathname = '/';
    baseUrl.search = '';
    baseUrl.searchParams.set('parentConsent', invitationToken);
    await requestRef.create({
      ageBand: 'CHILD',
      parentEmail,
      childEmail,
      childName,
      noticeVersion: NOTICE_VERSION,
      consentVersion: CONSENT_VERSION,
      invitationTokenHash: hash(invitationToken),
      status: 'PARENT_INVITATION_CREATED',
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      deliveryAttempts: 0
    });

    try {
      await sendEmail({
        to: parentEmail,
        subject: 'Review a CLAT Prep Studio student account request',
        html: `<p>A student entered this address as their parent or lawful guardian contact.</p>
          <p><strong>Student:</strong> ${escapeHtml(childName)} (${escapeHtml(maskEmail(childEmail))})</p>
          <p>No student user or cloud account has been created.</p>
          <p><a href="${escapeHtml(baseUrl.toString())}">Review the request and provide consent</a></p>
          <p>This single-use link expires in ${INVITATION_TTL_HOURS} hours. Ignore this message if you did not expect it.</p>`
      });
      await requestRef.update({
        status: 'PARENT_INVITATION_SENT',
        deliveryAttempts: FieldValue.increment(1),
        sentAt: FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Parent email delivery failure:', error);
      await requestRef.delete();
      throw new HttpsError('failed-precondition', error?.message || 'The secure invitation could not be delivered.');
    }
    return {
      requestId: requestRef.id,
      status: 'PARENT_INVITATION_SENT',
      expiresAt: expiresAt.toDate().toISOString()
    };
  }
);

async function resolveInvitation(token) {
  if (!token || String(token).length < 32) throw new HttpsError('invalid-argument', 'Invalid invitation link.');
  const snapshot = await db.collection('parentConsentRequests')
    .where('invitationTokenHash', '==', hash(String(token)))
    .limit(1)
    .get();
  if (snapshot.empty) throw new HttpsError('not-found', 'Invitation not found.');
  const document = snapshot.docs[0];
  const data = document.data();
  if (data.expiresAt.toMillis() <= Date.now()) throw new HttpsError('deadline-exceeded', 'Invitation expired.');
  return { ref: document.ref, id: document.id, data };
}

export const getParentConsentRequest = createCallable(callableOptions, async (request) => {
  const invitation = await resolveInvitation(request.data?.token);
  return {
    requestId: invitation.id,
    status: invitation.data.status,
    expiresAt: invitation.data.expiresAt.toDate().toISOString(),
    noticeVersion: invitation.data.noticeVersion,
    childName: invitation.data.childName,
    childEmail: invitation.data.childEmail,
    parentEmail: invitation.data.parentEmail
  };
});

export const authenticateParentForConsent = createCallable(callableOptions, async (request) => {
  const actor = authenticatedGoogleUser(request);
  const invitation = await resolveInvitation(request.data?.token);
  if (normalizeEmail(actor.token.email) !== invitation.data.parentEmail) {
    throw new HttpsError('permission-denied', 'Sign in with the email address that received the invitation.');
  }
  await invitation.ref.update({
    parentUid: actor.uid,
    parentEmailVerified: true,
    status: 'PARENT_AUTHENTICATED',
    authenticatedAt: FieldValue.serverTimestamp()
  });
  return { requestId: invitation.id, status: 'PARENT_AUTHENTICATED' };
});

export const startParentAdultVerification = createCallable(
  { ...callableOptions, secrets: [verificationStateSecret] },
  async (request) => {
    const actor = authenticatedGoogleUser(request);
    const invitation = await resolveInvitation(request.data?.token);
    if (invitation.data.parentUid !== actor.uid || invitation.data.status !== 'PARENT_AUTHENTICATED') {
      throw new HttpsError('failed-precondition', 'Authenticate the invited parent before adult verification.');
    }
    const providerUrl = requireHttpsUrl(
      adultVerificationStartUrl.value(),
      'Adult verification provider URL'
    );
    const stateValue = `${invitation.id}.${actor.uid}`;
    const stateSecret = requireStrongSecret(
      verificationStateSecret.value(),
      'Parent verification state secret'
    );
    const signature = createHmac('sha256', stateSecret).update(stateValue).digest('base64url');
    const url = new URL(providerUrl);
    url.searchParams.set('state', `${stateValue}.${signature}`);
    url.searchParams.set('request_id', invitation.id);
    return { redirectUrl: url.toString() };
  }
);

export const parentAdultVerificationWebhook = createRequestHandler(
  { region: REGION, secrets: [verificationWebhookSecret, verificationStateSecret] },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).send('Method not allowed');
      return;
    }
    const configuredWebhookSecret = verificationWebhookSecret.value();
    const configuredStateSecret = verificationStateSecret.value();
    if (configuredWebhookSecret.length < 32 || configuredStateSecret.length < 32) {
      response.status(503).send('Verification service is not configured');
      return;
    }
    const bearer = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!secureCompare(bearer, configuredWebhookSecret)) {
      response.status(401).send('Unauthorized');
      return;
    }
    const { state, adultVerified, providerReference } = request.body || {};
    const parts = String(state || '').split('.');
    if (parts.length !== 3 || adultVerified !== true) {
      response.status(400).send('Invalid verification result');
      return;
    }
    const [requestId, parentUid, suppliedSignature] = parts;
    const expected = createHmac('sha256', configuredStateSecret)
      .update(`${requestId}.${parentUid}`)
      .digest('base64url');
    if (!secureCompare(suppliedSignature, expected)) {
      response.status(401).send('Invalid state');
      return;
    }
    const ref = db.doc(`parentConsentRequests/${requestId}`);
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.data().parentUid !== parentUid) {
      response.status(404).send('Request not found');
      return;
    }
    if (snapshot.data().status === 'PARENT_ADULT_VERIFIED') {
      response.status(204).send();
      return;
    }
    if (snapshot.data().status !== 'PARENT_AUTHENTICATED') {
      response.status(409).send('Request is not awaiting adult verification');
      return;
    }
    await ref.update({
      status: 'PARENT_ADULT_VERIFIED',
      adultVerifiedAt: FieldValue.serverTimestamp(),
      verificationProviderReferenceHash: hash(String(providerReference || requestId))
    });
    response.status(204).send();
  }
);

export const captureParentConsent = createCallable(
  { ...callableOptions, secrets: [resendApiKey] },
  async (request) => {
    const data = request.data || {};
    validateVersions(data);
    validateRequiredPurposes(data.purposes);
    if (
      !['FATHER', 'MOTHER', 'LAWFUL_GUARDIAN'].includes(data.relationship)
      || data.guardianDeclaration !== true
      || data.adultDeclaration !== true
      || data.studentDetailsConfirmed !== true
    ) {
      throw new HttpsError('invalid-argument', 'A parent or lawful guardian declaration is required.');
    }
    const invitation = await resolveInvitation(data.token);
    if (!['PARENT_INVITATION_SENT', 'ACTIVATION_DELIVERY_FAILED', 'ACTIVATION_EXPIRED'].includes(invitation.data.status)) {
      if (invitation.data.status === 'CHILD_ACCOUNT_ACTIVATED') {
        return { status: 'CHILD_ACCOUNT_ACTIVATED' };
      }
      throw new HttpsError('failed-precondition', 'This parent consent request is not available.');
    }

    const activationToken = randomBytes(32).toString('base64url');
    const activationExpiresAt = Timestamp.fromMillis(
      Date.now() + (CHILD_ACTIVATION_TTL_HOURS * 60 * 60 * 1000)
    );
    let receiptId = invitation.data.consentReceiptId;
    if (!receiptId) {
      const receiptRef = db.collection('consentReceipts').doc();
      receiptId = receiptRef.id;
      await db.runTransaction(async (transaction) => {
        transaction.create(receiptRef, {
          actorReferenceHash: hash(`parent:${invitation.data.parentEmail}`),
          actorRole: data.relationship,
          lawfulRoute: 'PARENT_EMAIL_LINK_AND_DECLARATION',
          ageBand: 'CHILD',
          noticeVersion: NOTICE_VERSION,
          consentVersion: CONSENT_VERSION,
          purposes: data.purposes,
          event: 'GRANTED',
          parentConsentRequestId: invitation.id,
          parentEmailConfirmedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp()
        });
        transaction.update(invitation.ref, {
          status: 'PARENT_CONSENT_CAPTURED',
          relationship: data.relationship,
          parentEmailVerified: true,
          parentEmailVerifiedAt: FieldValue.serverTimestamp(),
          activationTokenHash: hash(activationToken),
          consentReceiptId: receiptRef.id,
          consentedAt: FieldValue.serverTimestamp(),
          activationExpiresAt
        });
      });
    } else {
      await invitation.ref.update({
        status: 'PARENT_CONSENT_CAPTURED',
        activationTokenHash: hash(activationToken),
        activationExpiresAt,
        activationDeliveryError: FieldValue.delete()
      });
    }

    const activationUrl = requireHttpsUrl(appBaseUrl.value(), 'Application base URL');
    activationUrl.pathname = '/';
    activationUrl.search = '';
    activationUrl.searchParams.set('childActivation', activationToken);
    try {
      await sendEmail({
        to: invitation.data.childEmail,
        subject: 'Activate your CLAT Prep Studio student account',
        html: `<p>Your parent or lawful guardian completed the consent request for ${escapeHtml(invitation.data.childName)}.</p>
          <p><a href="${escapeHtml(activationUrl.toString())}">Activate your student account with Google</a></p>
          <p>Use the Google account for ${escapeHtml(maskEmail(invitation.data.childEmail))}. This single-use link expires in ${CHILD_ACTIVATION_TTL_HOURS} hours.</p>`
      });
      await invitation.ref.update({
        status: 'CHILD_INVITED',
        invitationTokenHash: FieldValue.delete(),
        activationDeliveryStatus: 'SENT',
        activationSentAt: FieldValue.serverTimestamp()
      });
    } catch (error) {
      await invitation.ref.update({
        status: 'ACTIVATION_DELIVERY_FAILED',
        activationDeliveryStatus: 'FAILED',
        activationDeliveryError: String(error.message || error).slice(0, 300)
      });
      throw new HttpsError('unavailable', 'Consent was recorded, but the student activation email could not be delivered. Please retry.');
    }
    return {
      status: 'CHILD_INVITED',
      childEmailMasked: maskEmail(invitation.data.childEmail),
      activationExpiresAt: activationExpiresAt.toDate().toISOString(),
      consentReceiptId: receiptId
    };
  }
);

async function resolveChildActivation(token) {
  if (!token || String(token).length < 32) throw new HttpsError('invalid-argument', 'Invalid activation link.');
  const snapshot = await db.collection('parentConsentRequests')
    .where('activationTokenHash', '==', hash(String(token)))
    .limit(1)
    .get();
  if (snapshot.empty) throw new HttpsError('not-found', 'Activation request not found.');
  const document = snapshot.docs[0];
  const data = document.data();
  if (!data.activationExpiresAt || data.activationExpiresAt.toMillis() <= Date.now()) {
    throw new HttpsError('deadline-exceeded', 'Activation link expired.');
  }
  return { ref: document.ref, id: document.id, data };
}

export const getChildActivationRequest = createCallable(callableOptions, async (request) => {
  const activation = await resolveChildActivation(request.data?.token);
  return {
    requestId: activation.id,
    status: activation.data.status,
    childName: activation.data.childName,
    childEmailMasked: maskEmail(activation.data.childEmail),
    activationExpiresAt: activation.data.activationExpiresAt.toDate().toISOString()
  };
});

export const activateChildAccount = createCallable(callableOptions, async (request) => {
  const actor = authenticatedGoogleUser(request);
  const activation = await resolveChildActivation(request.data?.token);
  const data = activation.data;
  if (data.status !== 'CHILD_INVITED') {
    throw new HttpsError('failed-precondition', 'This student activation is not available.');
  }
  if (normalizeEmail(actor.token.email) !== data.childEmail) {
    throw new HttpsError('permission-denied', 'Sign in with the student Google email approved by the parent.');
  }
  const currentUser = await adminAuth.getUser(actor.uid);
  if (currentUser.customClaims?.privacyStatus && currentUser.customClaims.privacyStatus !== 'PARENT_VERIFIED') {
    throw new HttpsError('already-exists', 'This Google account is already activated through another privacy route.');
  }

  await db.runTransaction(async (transaction) => {
    const latest = await transaction.get(activation.ref);
    const current = latest.data();
    if (current.childUid && current.childUid !== actor.uid) {
      throw new HttpsError('already-exists', 'This activation link was already used.');
    }
    if (current.status !== 'CHILD_INVITED') {
      throw new HttpsError('failed-precondition', 'This activation link is no longer available.');
    }
    transaction.update(activation.ref, {
      childUid: actor.uid,
      status: 'CHILD_ACCOUNT_ACTIVATED',
      activatedAt: FieldValue.serverTimestamp(),
      expiresAt: FieldValue.delete(),
      invitationTokenHash: FieldValue.delete(),
      activationTokenHash: FieldValue.delete(),
      activationExpiresAt: FieldValue.delete()
    });
    transaction.set(db.doc(`users/${actor.uid}/privacy/current`), {
      status: 'PARENT_VERIFIED',
      ageBand: 'CHILD',
      consentReceiptId: current.consentReceiptId,
      parentConsentRequestId: activation.id,
      noticeVersion: NOTICE_VERSION,
      updatedAt: FieldValue.serverTimestamp()
    });
    transaction.set(db.doc(`users/${actor.uid}`), {
      progress: {
        studentProfile: {
          name: current.childName,
          email: current.childEmail,
          targetYear: 'CLAT 2027',
          targetNlu: 'NLSIU Bengaluru'
        }
      },
      lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(db.doc(`childProfiles/${activation.id}`), {
      childUid: actor.uid,
      preferredName: current.childName,
      email: current.childEmail,
      ageBand: 'CHILD',
      accountStatus: 'ACTIVE',
      privacyStatus: 'PARENT_VERIFIED',
      consentReceiptId: current.consentReceiptId,
      activatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    transaction.set(db.doc(`parentChildRelationships/${activation.id}`), {
      parentEmail: current.parentEmail,
      childUid: actor.uid,
      childProfileId: activation.id,
      relationshipType: current.relationship,
      status: 'ACTIVE',
      consentReceiptId: current.consentReceiptId,
      verifiedAt: FieldValue.serverTimestamp()
    });
    transaction.update(db.doc(`consentReceipts/${current.consentReceiptId}`), {
      subjectUid: actor.uid,
      subjectChildProfileId: activation.id,
      activatedAt: FieldValue.serverTimestamp()
    });
  });
  await adminAuth.setCustomUserClaims(actor.uid, {
    ...currentUser.customClaims,
    privacyStatus: 'PARENT_VERIFIED',
    subjectType: 'CHILD',
    accountRole: 'CHILD',
    childProfileId: activation.id,
    consentReceiptId: data.consentReceiptId
  });
  return {
    status: 'PARENT_VERIFIED',
    childName: data.childName,
    consentReceiptId: data.consentReceiptId
  };
});

const RIGHTS_TYPES = new Set(['ACCESS', 'CORRECTION', 'ERASURE', 'WITHDRAWAL', 'GRIEVANCE', 'NOMINATION']);

export const submitDataPrincipalRequest = createCallable(
  { ...callableOptions, secrets: [resendApiKey] },
  async (request) => {
    const actor = request.auth;
    if (!actor || !['ADULT_CONSENTED', 'PARENT_VERIFIED'].includes(actor.token.privacyStatus)) {
      throw new HttpsError('permission-denied', 'A consent-authorized account is required.');
    }
    const data = request.data || {};
    if (!RIGHTS_TYPES.has(data.type)) throw new HttpsError('invalid-argument', 'Unsupported rights request.');
    if (
      actor.token.subjectType !== 'CHILD'
      && ['ERASURE', 'WITHDRAWAL'].includes(data.type)
      && (Math.floor(Date.now() / 1000) - Number(actor.token.auth_time || 0)) > 300
    ) {
      throw new HttpsError('unauthenticated', 'Recent re-authentication is required for account deletion.');
    }
    const requestRef = db.collection('privacyRightsRequests').doc();
    const now = Date.now();
    const isChild = actor.token.subjectType === 'CHILD';
    const rightsRecord = {
      subjectUid: actor.uid,
      subjectType: isChild ? 'CHILD' : 'ADULT',
      notificationEmail: normalizeEmail(actor.token.email),
      type: data.type,
      details: String(data.details || '').trim().slice(0, 4000),
      requestedChanges: data.type === 'CORRECTION' ? {
        name: String(data.requestedChanges?.name || '').trim().slice(0, 200),
        email: normalizeEmail(data.requestedChanges?.email),
        targetYear: String(data.requestedChanges?.targetYear || '').trim().slice(0, 50),
        targetNlu: String(data.requestedChanges?.targetNlu || '').trim().slice(0, 200)
      } : null,
      status: isChild ? 'PENDING_GUARDIAN_AUTHORIZATION' : 'QUEUED_VERIFIED',
      submittedAt: FieldValue.serverTimestamp(),
      acknowledgementDueAt: Timestamp.fromMillis(now + (2 * 24 * 60 * 60 * 1000)),
      targetDueAt: Timestamp.fromMillis(now + (30 * 24 * 60 * 60 * 1000)),
      audit: [{
        event: 'REQUEST_RECEIVED',
        at: Timestamp.now(),
        actorUid: actor.uid
      }]
    };

    if (!isChild) {
      await requestRef.create(rightsRecord);
      try {
        await sendEmail({
          to: rightsRecord.notificationEmail,
          subject: 'CLAT Prep Studio privacy request received',
          html: `<p>We received your <strong>${data.type}</strong> request.</p>
            <p>Reference: <strong>${requestRef.id}</strong></p>
            <p>You can track its status in the Privacy Centre.</p>`
        });
        await requestRef.update({ acknowledgementEmailStatus: 'SENT' });
      } catch {
        await requestRef.update({ acknowledgementEmailStatus: 'FAILED_RETRYABLE' });
      }
      return { requestId: requestRef.id, status: 'QUEUED_VERIFIED' };
    }

    const privacy = await db.doc(`users/${actor.uid}/privacy/current`).get();
    const parentRequestId = privacy.data()?.parentConsentRequestId;
    if (!parentRequestId) throw new HttpsError('failed-precondition', 'Verified parent relationship was not found.');
    const parentRequest = await db.doc(`parentConsentRequests/${parentRequestId}`).get();
    if (!parentRequest.exists || !parentRequest.data().parentUid) {
      throw new HttpsError('failed-precondition', 'Verified parent relationship was not found.');
    }
    const approvalToken = randomBytes(32).toString('base64url');
    await requestRef.create({
      ...rightsRecord,
      notificationEmail: parentRequest.data().parentEmail,
      verifiedParentUid: parentRequest.data().parentUid,
      guardianApprovalTokenHash: hash(approvalToken),
      guardianApprovalExpiresAt: Timestamp.fromMillis(now + (7 * 24 * 60 * 60 * 1000))
    });
    const link = requireHttpsUrl(appBaseUrl.value(), 'Application base URL');
    link.searchParams.set('rightsApproval', approvalToken);
    try {
      await sendEmail({
        to: parentRequest.data().parentEmail,
        subject: 'Approve a CLAT Prep Studio privacy rights request',
        html: `<p>A privacy request was started for the linked child account.</p>
          <p>Request type: <strong>${data.type}</strong></p>
          <p><a href="${link.toString()}">Review and approve this request</a></p>
          <p>No correction, disclosure or erasure will occur until you authenticate and approve it.</p>`
      });
    } catch {
      await requestRef.delete();
      throw new HttpsError('failed-precondition', 'Guardian authorization email could not be delivered.');
    }
    return { requestId: requestRef.id, status: 'PENDING_GUARDIAN_AUTHORIZATION' };
  }
);

export const listDataPrincipalRequests = createCallable(callableOptions, async (request) => {
  const actor = request.auth;
  if (!actor || !['ADULT_CONSENTED', 'PARENT_VERIFIED'].includes(actor.token.privacyStatus)) {
    throw new HttpsError('permission-denied', 'A consent-authorized account is required.');
  }
  const snapshot = await db.collection('privacyRightsRequests')
    .where('subjectUid', '==', actor.uid)
    .limit(100)
    .get();
  const requests = snapshot.docs
    .map((document) => {
      const data = document.data();
      return {
        requestId: document.id,
        type: data.type,
        status: data.status,
        submittedAt: data.submittedAt?.toDate?.().toISOString() || null,
        targetDueAt: data.targetDueAt?.toDate?.().toISOString() || null,
        completedAt: data.completedAt?.toDate?.().toISOString() || null,
        emailStatus: data.emailStatus || null,
        accountDeleted: data.accountDeleted === true
      };
    })
    .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
  return { requests };
});

export const listAdminUserDirectory = createCallable(callableOptions, async (request) => {
  privacyAdministrator(request);

  const authUsers = [];
  let pageToken;
  do {
    const page = await adminAuth.listUsers(1000, pageToken);
    authUsers.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);

  const progressSnapshot = await db.collection('users').get();
  const progressByUid = new Map(progressSnapshot.docs.map((document) => [
    document.id,
    { id: document.id, ...document.data() }
  ]));
  const authByUid = new Map(authUsers.map((user) => [user.uid, user]));
  const allUids = [...new Set([...authByUid.keys(), ...progressByUid.keys()])];

  const users = allUids.map((uid) => {
    const authUser = authByUid.get(uid);
    const stored = progressByUid.get(uid) || {};
    const progress = stored.progress || {};
    const storedProfile = progress.studentProfile || null;
    const claims = authUser?.customClaims || {};
    const profile = storedProfile ? {
      ...storedProfile,
      name: storedProfile.name || authUser?.displayName || '',
      email: storedProfile.email || authUser?.email || ''
    } : {
      name: authUser?.displayName || '',
      email: authUser?.email || ''
    };
    const createdAt = authUser?.metadata?.creationTime || null;
    const lastSignInAt = authUser?.metadata?.lastSignInTime || null;
    const lastUpdated = stored.lastUpdated?.toDate?.().toISOString()
      || lastSignInAt
      || createdAt;

    return {
      uid,
      profile,
      profileStored: Boolean(storedProfile),
      progress,
      lastUpdated,
      account: {
        email: authUser?.email || profile.email || '',
        displayName: authUser?.displayName || profile.name || '',
        emailVerified: authUser?.emailVerified === true,
        disabled: authUser?.disabled === true,
        createdAt,
        lastSignInAt,
        privacyStatus: claims.privacyStatus || 'NOT_ACTIVATED',
        subjectType: claims.subjectType || null,
        privacyAdmin: claims.privacyAdmin === true,
        caAdmin: claims.caAdmin === true,
        authRecordPresent: Boolean(authUser)
      }
    };
  }).sort((first, second) => String(second.lastUpdated || '').localeCompare(String(first.lastUpdated || '')));

  return { users };
});

async function resolveRightsApproval(token) {
  if (!token || String(token).length < 32) throw new HttpsError('invalid-argument', 'Invalid approval link.');
  const snapshot = await db.collection('privacyRightsRequests')
    .where('guardianApprovalTokenHash', '==', hash(String(token)))
    .limit(1)
    .get();
  if (snapshot.empty) throw new HttpsError('not-found', 'Approval request not found.');
  const document = snapshot.docs[0];
  if (document.data().guardianApprovalExpiresAt?.toMillis() <= Date.now()) {
    throw new HttpsError('deadline-exceeded', 'Approval link expired.');
  }
  return { ref: document.ref, id: document.id, data: document.data() };
}

export const getChildRightsApproval = createCallable(callableOptions, async (request) => {
  const item = await resolveRightsApproval(request.data?.token);
  return { requestId: item.id, type: item.data.type, status: item.data.status };
});

export const approveChildRightsRequest = createCallable(callableOptions, async (request) => {
  const actor = authenticatedGoogleUser(request);
  const item = await resolveRightsApproval(request.data?.token);
  if (item.data.verifiedParentUid !== actor.uid) {
    throw new HttpsError('permission-denied', 'The verified parent must approve this request.');
  }
  await item.ref.update({
    status: 'QUEUED_VERIFIED',
    guardianApprovedAt: FieldValue.serverTimestamp(),
    guardianApprovalTokenHash: FieldValue.delete(),
    audit: FieldValue.arrayUnion({
      event: 'GUARDIAN_AUTHORIZED',
      at: Timestamp.now(),
      actorUid: actor.uid
    })
  });
  return { requestId: item.id, status: 'QUEUED_VERIFIED' };
});

async function processRightsRequest(document) {
  const record = document.data();
  const userRef = db.doc(`users/${record.subjectUid}`);
  const userSnapshot = await userRef.get();
  const userProgress = userSnapshot.data()?.progress || {};
  let completion = {};

  if (record.type === 'ACCESS') {
    const privacySnapshot = await db.doc(`users/${record.subjectUid}/privacy/current`).get();
    completion = {
      response: {
        generatedAt: new Date().toISOString(),
        accountAndProgress: userProgress,
        privacyStatus: privacySnapshot.data() || null,
        processingPurposes: ['account and saved progress', 'learning analytics and educational feedback'],
        processors: ['Google Firebase authentication, database and hosting', 'configured transactional email provider']
      }
    };
  } else if (record.type === 'CORRECTION') {
    const changes = record.requestedChanges || {};
    const profileUpdates = {};
    if (changes.name) {
      profileUpdates['progress.studentProfile.name'] = changes.name;
      await adminAuth.updateUser(record.subjectUid, { displayName: changes.name });
    }
    if (changes.targetYear) {
      profileUpdates['progress.studentProfile.targetYear'] = changes.targetYear;
    }
    if (changes.targetNlu) {
      profileUpdates['progress.studentProfile.targetNlu'] = changes.targetNlu;
    }
    if (Object.keys(profileUpdates).length) {
      await userRef.update({
        ...profileUpdates,
        lastUpdated: FieldValue.serverTimestamp()
      });
    }
    if (changes.email) {
      const user = await adminAuth.getUser(record.subjectUid);
      if (normalizeEmail(user.email) !== changes.email) {
        const verificationLink = await adminAuth.generateVerifyAndChangeEmailLink(
          user.email,
          changes.email,
          {
            url: requireHttpsUrl(appBaseUrl.value(), 'Application base URL').toString(),
            handleCodeInApp: false
          }
        );
        await sendEmail({
          to: changes.email,
          subject: 'Verify your corrected CLAT Prep Studio email',
          html: `<p>Confirm this email correction:</p><p><a href="${verificationLink}">Verify corrected email</a></p>`
        });
        await document.ref.update({
          status: 'AWAITING_EMAIL_REVERIFICATION',
          emailStatus: 'REVERIFICATION_SENT',
          verificationSentAt: FieldValue.serverTimestamp(),
          audit: FieldValue.arrayUnion({
            event: 'NEW_EMAIL_REVERIFICATION_SENT',
            at: Timestamp.now()
          })
        });
        return;
      }
      await userRef.update({
        'progress.studentProfile.email': changes.email,
        lastUpdated: FieldValue.serverTimestamp()
      });
    }
  } else if (record.type === 'ERASURE' || record.type === 'WITHDRAWAL') {
    const subjectHash = hash(`erased:${record.subjectUid}`);
    const notificationEmail = record.notificationEmail;
    const privacySnapshot = await db.doc(`users/${record.subjectUid}/privacy/current`).get();
    const parentConsentRequestId = privacySnapshot.data()?.parentConsentRequestId;
    const receipts = await db.collection('consentReceipts').where('subjectUid', '==', record.subjectUid).get();
    const linkedRights = await db.collection('privacyRightsRequests')
      .where('subjectUid', '==', record.subjectUid)
      .get();
    const operations = [];
    receipts.docs.forEach((receipt) => {
      operations.push((batch) => batch.update(receipt.ref, {
        subjectUid: FieldValue.delete(),
        actorUid: FieldValue.delete(),
        subjectReferenceHash: subjectHash,
        actorReferenceHash: hash(`erased-actor:${receipt.data().actorUid || record.subjectUid}`),
        erasureRecordedAt: FieldValue.serverTimestamp()
      }));
    });
    linkedRights.docs.forEach((rightsDocument) => {
      operations.push((batch) => batch.update(rightsDocument.ref, {
        subjectUid: FieldValue.delete(),
        subjectReferenceHash: subjectHash,
        details: FieldValue.delete(),
        requestedChanges: FieldValue.delete(),
        notificationEmail: FieldValue.delete(),
        verifiedParentUid: FieldValue.delete(),
        guardianApprovalTokenHash: FieldValue.delete(),
        audit: [{ event: 'ERASURE_AUTHORIZED', at: Timestamp.now() }]
      }));
    });
    if (parentConsentRequestId) {
      operations.push((batch) => batch.delete(db.doc(`parentConsentRequests/${parentConsentRequestId}`)));
    }
    for (let index = 0; index < operations.length; index += 400) {
      const batch = db.batch();
      operations.slice(index, index + 400).forEach((operation) => operation(batch));
      await batch.commit();
    }
    await db.recursiveDelete(userRef);
    await adminAuth.revokeRefreshTokens(record.subjectUid);
    await adminAuth.deleteUser(record.subjectUid);
    await document.ref.update({
      status: 'PROCESSOR_CONFIRMATION_REQUIRED',
      accountDeleted: true,
      primaryErasureCompletedAt: FieldValue.serverTimestamp(),
      audit: FieldValue.arrayUnion({
        event: 'PRIMARY_SYSTEMS_ERASED_PROCESSOR_CONFIRMATION_PENDING',
        at: Timestamp.now()
      })
    });
    try {
      await sendEmail({
        to: notificationEmail,
        subject: 'CLAT Prep Studio account erasure completed',
        html: `<p>The account and primary student records for privacy request <strong>${document.id}</strong> have been erased.</p>
          <p>Minimal pseudonymised audit evidence and processor/back-up retention, where necessary, are handled under the published retention schedule.</p>`
      });
      await document.ref.update({ completionEmailStatus: 'SENT' });
    } catch {
      await document.ref.update({ completionEmailStatus: 'FAILED' });
    }
    return;
  } else {
    await document.ref.update({
      status: 'HUMAN_REVIEW_REQUIRED',
      routedAt: FieldValue.serverTimestamp(),
      audit: FieldValue.arrayUnion({ event: 'ROUTED_TO_PRIVACY_TEAM', at: Timestamp.now() })
    });
    return;
  }

  await document.ref.update({
    status: 'COMPLETED',
    ...completion,
    completedAt: FieldValue.serverTimestamp(),
    audit: FieldValue.arrayUnion({ event: 'REQUEST_COMPLETED', at: Timestamp.now() })
  });
  if (record.notificationEmail) {
    try {
      await sendEmail({
        to: record.notificationEmail,
        subject: `CLAT Prep Studio ${record.type.toLowerCase()} request completed`,
        html: `<p>Your privacy request <strong>${document.id}</strong> has been completed.</p>
          <p>You can review the updated status in the Privacy Centre.</p>`
      });
      await document.ref.update({ completionEmailStatus: 'SENT' });
    } catch {
      await document.ref.update({ completionEmailStatus: 'FAILED_RETRYABLE' });
    }
  }
}

export const processVerifiedRightsRequests = createScheduledHandler(
  {
    region: REGION,
    schedule: 'every 15 minutes',
    timeZone: 'Asia/Kolkata',
    secrets: [resendApiKey]
  },
  async () => {
    const awaitingEmail = await db.collection('privacyRightsRequests')
      .where('status', '==', 'AWAITING_EMAIL_REVERIFICATION')
      .limit(50)
      .get();
    for (const document of awaitingEmail.docs) {
      const record = document.data();
      try {
        const user = await adminAuth.getUser(record.subjectUid);
        if (normalizeEmail(user.email) === normalizeEmail(record.requestedChanges?.email)) {
          await document.ref.update({
            status: 'QUEUED_VERIFIED',
            emailStatus: 'VERIFIED',
            emailVerifiedAt: FieldValue.serverTimestamp()
          });
        }
      } catch (error) {
        await document.ref.update({
          lastError: String(error.message || error).slice(0, 500),
          lastFailedAt: FieldValue.serverTimestamp()
        });
      }
    }
    const queued = await db.collection('privacyRightsRequests')
      .where('status', 'in', ['QUEUED_VERIFIED', 'FAILED_RETRYABLE'])
      .limit(50)
      .get();
    for (const document of queued.docs) {
      try {
        const claimed = await db.runTransaction(async (transaction) => {
          const latest = await transaction.get(document.ref);
          if (!['QUEUED_VERIFIED', 'FAILED_RETRYABLE'].includes(latest.data()?.status)) return false;
          transaction.update(document.ref, {
            status: 'PROCESSING',
            processingStartedAt: FieldValue.serverTimestamp(),
            processingAttempts: FieldValue.increment(1)
          });
          return true;
        });
        if (!claimed) continue;
        await processRightsRequest(document);
      } catch (error) {
        await document.ref.update({
          status: 'FAILED_RETRYABLE',
          lastError: String(error.message || error).slice(0, 500),
          lastFailedAt: FieldValue.serverTimestamp()
        });
      }
    }
  }
);

export const deleteExpiredPrivacyArtifacts = createScheduledHandler(
  { region: REGION, schedule: 'every 15 minutes', timeZone: 'Asia/Kolkata' },
  async () => {
    const now = Timestamp.now();
    const expiredApprovals = await db.collection('privacyRightsRequests')
      .where('guardianApprovalExpiresAt', '<=', now)
      .limit(400)
      .get();
    if (!expiredApprovals.empty) {
      const approvalBatch = db.batch();
      expiredApprovals.docs.forEach((document) => {
        if (document.data().status === 'PENDING_GUARDIAN_AUTHORIZATION') {
          approvalBatch.update(document.ref, {
            status: 'GUARDIAN_APPROVAL_EXPIRED',
            guardianApprovalTokenHash: FieldValue.delete(),
            guardianApprovalExpiresAt: FieldValue.delete()
          });
        }
      });
      await approvalBatch.commit();
    }
    const expiredCodes = await db.collection('parentConsentRequests')
      .where('activationExpiresAt', '<=', now)
      .limit(400)
      .get();
    if (!expiredCodes.empty) {
      const codeBatch = db.batch();
      expiredCodes.docs.forEach((document) => {
        if (['PARENT_CONSENT_CAPTURED', 'CHILD_INVITED', 'ACTIVATION_DELIVERY_FAILED'].includes(document.data().status)) {
          codeBatch.update(document.ref, {
            status: 'ACTIVATION_EXPIRED',
            activationTokenHash: FieldValue.delete(),
            activationExpiresAt: FieldValue.delete()
          });
        }
      });
      await codeBatch.commit();
    }
    for (const collectionName of ['parentConsentRequests', 'privacyRateLimits']) {
      // A parent request may also require one consent-receipt update; keep the batch below 500 writes.
      const expired = await db.collection(collectionName).where('expiresAt', '<=', now).limit(200).get();
      if (expired.empty) continue;
      const batch = db.batch();
      expired.docs.forEach((document) => {
        if (collectionName === 'parentConsentRequests' && document.data().consentReceiptId) {
          batch.update(db.doc(`consentReceipts/${document.data().consentReceiptId}`), {
            actorUid: FieldValue.delete(),
            parentConsentRequestId: FieldValue.delete(),
            actorReferenceHash: hash(`expired-parent:${document.data().parentUid || document.id}`),
            pendingActivationExpiredAt: FieldValue.serverTimestamp()
          });
        }
        batch.delete(document.ref);
      });
      await batch.commit();
    }
  }
);
