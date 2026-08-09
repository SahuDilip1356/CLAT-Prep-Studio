import {
  CONSENT_VERSION,
  PRIVACY_NOTICE_VERSION
} from '../shared/privacy-versions.js';

export { CONSENT_VERSION, PRIVACY_NOTICE_VERSION };

export const PRIVACY_STATUS = {
  ADULT_CONSENTED: 'ADULT_CONSENTED',
  PARENT_VERIFIED: 'PARENT_VERIFIED',
  WITHDRAWN: 'WITHDRAWN'
};

export function canProcessInCloud(tokenClaims) {
  return tokenClaims?.privacyStatus === PRIVACY_STATUS.ADULT_CONSENTED
    || tokenClaims?.privacyStatus === PRIVACY_STATUS.PARENT_VERIFIED;
}

export function createAdultConsentChoice() {
  return {
    ageBand: 'ADULT',
    adultDeclaration: true,
    noticeVersion: PRIVACY_NOTICE_VERSION,
    consentVersion: CONSENT_VERSION,
    purposes: {
      accountAndProgress: true,
      learningAnalytics: true,
      parentReports: false,
      marketing: false
    }
  };
}

export function createParentInvitation({ parentEmail, childName, childEmail }) {
  return {
    ageBand: 'CHILD',
    noticeVersion: PRIVACY_NOTICE_VERSION,
    consentVersion: CONSENT_VERSION,
    parentEmail: parentEmail.trim().toLowerCase(),
    childName: childName.trim(),
    childEmail: childEmail.trim().toLowerCase()
  };
}

export function privacyErrorMessage(error, fallback) {
  const message = String(error?.message || '').trim();
  if (!message || /^(internal|unknown)$/i.test(message) || message.startsWith('FirebaseError')) {
    return fallback;
  }
  return message;
}

export function createRightsRequest({ type, requesterRole, details = '', requestedChanges = null }) {
  const now = new Date();
  const dueAt = new Date(now);
  dueAt.setDate(dueAt.getDate() + 30);

  return {
    requestId: `DPR-${now.getTime().toString(36).toUpperCase()}`,
    type,
    requesterRole,
    details: details.trim(),
    requestedChanges,
    status: 'SUBMITTED',
    submittedAt: now.toISOString(),
    targetDueAt: dueAt.toISOString()
  };
}
