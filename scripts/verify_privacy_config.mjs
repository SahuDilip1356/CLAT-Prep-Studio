import { existsSync, readFileSync } from 'node:fs';

const productionFile = '.env.production';
if (existsSync(productionFile)) {
  for (const line of readFileSync(productionFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_ACCOUNT_FEATURES_MODE',
  'VITE_PRIVACY_LEGAL_NAME',
  'VITE_PRIVACY_CONTACT_EMAIL'
];

const missing = required.filter((name) => !String(process.env[name] || '').trim());
if (missing.length) {
  console.error(`Compliance build blocked. Missing production variables: ${missing.join(', ')}`);
  process.exit(1);
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.VITE_PRIVACY_CONTACT_EMAIL)) {
  console.error('Compliance build blocked. VITE_PRIVACY_CONTACT_EMAIL is not a valid email address.');
  process.exit(1);
}

if (!['core_only', 'enabled'].includes(process.env.VITE_ACCOUNT_FEATURES_MODE)) {
  console.error('Compliance build blocked. VITE_ACCOUNT_FEATURES_MODE must be core_only or enabled.');
  process.exit(1);
}

if (
  process.env.VITE_ACCOUNT_FEATURES_MODE === 'enabled'
  && !String(process.env.VITE_FIREBASE_APP_CHECK_SITE_KEY || '').trim()
) {
  console.error('Compliance build blocked. VITE_FIREBASE_APP_CHECK_SITE_KEY is required when account features are enabled.');
  process.exit(1);
}

console.log('Client-side privacy deployment configuration is present.');
