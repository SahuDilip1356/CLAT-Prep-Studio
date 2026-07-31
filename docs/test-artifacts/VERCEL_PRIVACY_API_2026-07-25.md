# Vercel privacy API implementation evidence — 25 July 2026

## Scope

This evidence covers replacement of the Firebase Functions deployment target with same-origin
Vercel Functions. Firebase Authentication, Firestore and App Check remain in use. Firebase Storage
and Firebase Functions are not required by this release.

## Implemented controls

- The browser sends its Firebase ID token and Firebase App Check token to `/api/privacy`.
- The Vercel API independently verifies App Check and the Firebase ID token.
- Only an explicit allow-list of privacy operations can be invoked.
- Existing server-side adult consent, parent invitation, Rule 10 verification, child activation,
  correction, erasure, withdrawal and audit logic is reused.
- Verified rights requests execute immediately; the daily cron retries failed work and removes
  expired privacy artifacts.
- The cron requires `CRON_SECRET`.
- The adult-verification webhook retains its independent bearer-secret and signed-state checks.
- Firebase Storage initialization was removed from the browser.
- No Supabase dependency or service was introduced.

## Automated results

| Check | Result |
| --- | --- |
| `npm run test:privacy-api` | PASS — 8/8 |
| Targeted ESLint: `npx eslint api src/firebase.js functions/index.js` | PASS — 0 errors |
| Vite production build: `npm run build` | PASS |
| Vercel Build Output API: `vercel build` | PASS |
| Vercel output contains `/api/privacy` | PASS |
| Vercel output contains `/api/parent-verification-webhook` | PASS |
| Vercel output contains `/api/privacy-cron` and daily schedule | PASS |
| Preview learning application | PASS — HTTP 200 |
| Preview `/api/privacy` unsupported GET | PASS — HTTP 405 |
| Preview `/api/privacy` without App Check | PASS — HTTP 401 |
| Preview `/api/privacy-cron` without secret | PASS — HTTP 401 |
| Preview verification webhook unsupported GET | PASS — HTTP 405 |
| Production dependency audit | PASS — zero high or critical findings |

Validated Preview:

- Deployment ID: `dpl_J6wb4QtwqYQoMcVMyXvDj4u7SCCR`
- Immutable URL: `https://clat-prep-studio-niujoxvnx-dilipsahu31s-projects.vercel.app`
- Stable Preview alias: `https://clat-prep-studio-dilipsahu31-dilipsahu31s-projects.vercel.app`
- Target: Preview; production was not modified.

## Tests represented by the automated privacy suite

1. Non-POST privacy requests are rejected.
2. A privacy request without App Check fails closed.
3. A cron request without its secret is rejected.
4. Adult activation requires an authenticated Google identity.
5. Child activation requires an authenticated Google identity.
6. A parent invitation with stale notice versions is rejected before data is stored.
7. A rights request requires a consent-authorized identity.
8. The adult-verification webhook rejects unsupported methods.

## Remaining environment-dependent tests

The code is buildable but must remain `core_only` until staging has all encrypted server variables,
a registered App Check web application, a verified Resend sender and a configured Rule 10
verification provider. End-to-end tests must then use dedicated staging student and parent accounts.

The production-only npm audit has five moderate findings inherited from Firebase Admin's optional
Cloud Storage dependency. Storage is neither imported nor initialized by this application. There
are no high or critical production findings. The optional package must be re-audited when Firebase
Admin publishes a compatible upstream fix.
