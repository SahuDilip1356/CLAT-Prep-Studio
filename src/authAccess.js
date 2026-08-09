import { canProcessInCloud } from './privacy.js';

export const hasAdminAccess = (claims) =>
  claims?.privacyAdmin === true || claims?.caAdmin === true;

export const canUseAuthenticatedAccount = (claims) =>
  canProcessInCloud(claims) || hasAdminAccess(claims);
