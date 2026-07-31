import {
  parentAdultVerificationWebhook,
  refreshFirebaseAdminCredential
} from '../server/privacy-service.js';

export default async function handler(request, response) {
  await refreshFirebaseAdminCredential();
  return parentAdultVerificationWebhook.invoke(request, response);
}
