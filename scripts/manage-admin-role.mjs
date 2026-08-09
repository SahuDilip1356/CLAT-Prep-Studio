import { readFileSync } from 'node:fs';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const readArgument = (name) => {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) || '';
};

const email = readArgument('email').trim().toLowerCase();
const role = readArgument('role');
const confirmation = readArgument('confirm').trim().toLowerCase();
const apply = process.argv.includes('--apply');
const allowedRoles = new Set(['privacyAdmin', 'caAdmin']);

if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  throw new Error('Pass the Firebase user email with --email=person@example.com.');
}
if (!allowedRoles.has(role)) {
  throw new Error('Pass --role=privacyAdmin or --role=caAdmin.');
}
if (apply && confirmation !== email) {
  throw new Error('To apply the change, pass --confirm with the same exact email address.');
}

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const credential = serviceAccountJson
  ? cert(JSON.parse(serviceAccountJson))
  : serviceAccountPath
    ? cert(JSON.parse(readFileSync(serviceAccountPath, 'utf8')))
    : applicationDefault();

if (!getApps().length) {
  initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID || undefined
  });
}

const auth = getAuth();
const user = await auth.getUserByEmail(email);
const usesGoogle = user.providerData.some((provider) => provider.providerId === 'google.com');
if (!usesGoogle || user.emailVerified !== true) {
  throw new Error('The target must be a verified Firebase user linked to Google sign-in.');
}

const currentClaims = user.customClaims || {};
const proposedClaims = { ...currentClaims, [role]: true };

if (!apply) {
  console.log(JSON.stringify({
    mode: 'dry-run',
    projectId: process.env.FIREBASE_PROJECT_ID || 'credential default',
    uid: user.uid,
    email: user.email,
    currentClaims,
    proposedClaims,
    next: `Re-run with --apply --confirm=${email}`
  }, null, 2));
  process.exit(0);
}

await auth.setCustomUserClaims(user.uid, proposedClaims);
console.log(JSON.stringify({
  mode: 'applied',
  uid: user.uid,
  email: user.email,
  role,
  claims: proposedClaims,
  instruction: 'Sign out and sign in again so Firebase issues a token containing the role.'
}, null, 2));
