# Privacy deployment runbook

Status: release gate. Production must not be opened to students until every item below passes.

## 0. No-core-disruption release strategy

The learning product and the consent/account layer must be treated as two availability tiers.

| Capability | `core_only` | `enabled` | External dependency |
| --- | --- | --- | --- |
| Quant, GK and Current Affairs content | Available | Available | Vercel static application only |
| Private practice in the current browser session | Available | Available | None |
| Google sign-in and cloud-saved progress | Unavailable | Available after trusted consent claim | Firebase Auth, Functions, Firestore and App Check |
| Child account activation | Existing parent links remain reachable; new student onboarding is unavailable | Available after verified parental consent | Email provider and Rule 10 adult-verification provider |
| Data-principal rights processing | Existing approval links remain reachable | Available | Firebase Functions, email and operational queue |

Set `VITE_ACCOUNT_FEATURES_MODE=core_only` for the first production build and for privacy-service incidents. In this mode the sign-in entry point explains that study remains available, does not start Google sign-in, and does not upload student practice data.

Do not use an old, pre-consent frontend as the rollback after strict Firebase rules are deployed. Its data assumptions may be incompatible with the new rules. The supported service-continuity rollback is the current release built with `VITE_ACCOUNT_FEATURES_MODE=core_only`.

The one intentional limitation is that identifiable cloud progress cannot remain available to an under-18 student until valid, verifiable parental consent exists. That limitation protects the student; it must not block access to the learning content or private session practice.

## 1. Legal and product inputs

- Obtain written review from Indian privacy counsel for the final notice, consent wording, retention schedule, processor list, grievance process, and applicability/commencement analysis.
- Set the operator’s exact legal name and monitored privacy/grievance email.
- Confirm that optional marketing, profiling, targeted advertising, behavioural monitoring, and tracking of children are disabled. Any future optional purpose needs a separate unticked choice and a new review.

## 2. Adult verification for parents

Configure an identity/age verification route that satisfies DPDP Rules, 2025 Rule 10. The provider must establish that the person identifying as the parent is an identifiable adult by reference to reliable identity/age details or a qualifying authorised token. A Google account, email OTP, checkbox, payment card, or parent email by itself is not sufficient.

The implementation expects:

- `ADULT_VERIFICATION_START_URL`: the approved provider entry point.
- `PARENT_VERIFICATION_STATE_SECRET`: high-entropy secret used to sign workflow state.
- `ADULT_VERIFICATION_WEBHOOK_SECRET`: separate high-entropy service-to-service bearer secret.
- Provider callback to `parentAdultVerificationWebhook` containing the signed `state`, `adultVerified: true`, and a provider reference.
- Provider browser return URL set to `APP_BASE_URL`; the invitation token is kept only in same-tab session storage and is removed from the address bar before the provider redirect.
- A documented decision on whether the provider is an authorised entity/person or returns details/token from one, as contemplated by Rule 10.
- Contractual prohibition on retaining raw ID documents unless specifically approved. Store only the provider reference hash and result by default.

## 3. Transactional email and public URL

Configure Firebase Function parameters/secrets:

```text
APP_BASE_URL
PARENT_CONSENT_FROM_EMAIL
ADULT_VERIFICATION_START_URL
RESEND_API_KEY
PARENT_VERIFICATION_STATE_SECRET
ADULT_VERIFICATION_WEBHOOK_SECRET
```

The sending domain must have SPF, DKIM and DMARC. Test invitation delivery, expiry, wrong-parent rejection, duplicate use, activation delivery, and child-rights approval.

## 4. Firebase security

- Deploy `firestore.rules` and `storage.rules`.
- Enable Google Authentication only for the documented routes.
- Register the production web origin with reCAPTCHA Enterprise and configure `VITE_FIREBASE_APP_CHECK_SITE_KEY`.
- Enforce App Check for callable functions and monitor rejection metrics.
- Assign `privacyAdmin` only through a privileged operational script with MFA and a change ticket. An email address never grants admin access.
- Confirm browser clients cannot write consent receipts, parent requests, privacy status, or custom claims.

## 5. Build and deploy gate

Set the client variables in the production build environment and run:

```bash
npm run build:compliance
```

The normal `npm run build` is for local verification only. Production CI must call `build:compliance`.

Deploy functions and rules only after secrets/parameters are present. A missing email or adult-verification integration is designed to fail closed.

### 5.1 Legacy-user migration gate

Strict rules require a trusted server-issued privacy claim. Before changing production rules:

1. Export and count existing Firebase Authentication users and `/users` records.
2. Classify only consent records that counsel confirms are valid. Do not translate a legacy client-written checkbox or profile field into a trusted claim automatically.
3. Server-issue claims only for accounts backed by valid evidence.
4. Quarantine cloud progress for users without valid evidence and require re-consent. Keep the learning application available in `core_only` mode.
5. Record migration totals, exceptions, approver and timestamp as release evidence.

Deploying the strict rules before this migration can interrupt existing users’ cloud progress even though the learning content remains available.

### 5.2 Staged production order

1. Create a separate Firebase staging project and a Vercel Preview deployment. Never test consent emails, identity callbacks or erasure against production student records.
2. In staging, configure Authentication, Firestore, Storage, Functions, billing, Secret Manager, scheduled functions, App Check, transactional email and the adult-verification provider.
3. Deploy the App Check-enabled client and monitor valid-token metrics before enforcing App Check for student traffic.
4. Pass every end-to-end test in section 6, including provider and email failure simulations.
5. Archive the currently deployed Firestore and Storage rules. Rules deployed by the CLI replace the console rules and need a deliberately maintained rollback copy.
6. Deploy the production Firebase functions first while the production frontend remains in `core_only`.
7. Complete the legacy-user migration and verify trusted claims in production with test accounts.
8. Deploy Firestore and Storage rules in a controlled release window and run read/write denial tests.
9. Deploy a Vercel Preview with `VITE_ACCOUNT_FEATURES_MODE=enabled`, run smoke tests, then promote that exact build to a small canary.
10. Expand the canary only when sign-in, parental consent, rights processing, App Check rejection, email delivery and error metrics are healthy.

Suggested Firebase CLI sequence after the project alias and configuration are reviewed:

```bash
firebase use --add
firebase deploy --only functions --project clat1-3bb23
# Complete the migration and production smoke tests before the rules:
firebase deploy --only firestore,storage --project clat1-3bb23
```

The repository does not currently contain a `.firebaserc`, so an operator must explicitly bind and review the intended production project. Replace `clat1-3bb23` if it is not the approved production project.

### 5.3 Production configuration

Set these Vercel variables for both Preview and Production, using separate staging and production values:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_FUNCTIONS_REGION
VITE_FIREBASE_APP_CHECK_SITE_KEY
VITE_PRIVACY_LEGAL_NAME
VITE_PRIVACY_CONTACT_EMAIL
VITE_ACCOUNT_FEATURES_MODE
```

Use `npm run build:compliance` as the Vercel production build command. Start with `VITE_ACCOUNT_FEATURES_MODE=core_only`; change it to `enabled` only after steps 1–9 above are green.

Set Firebase Function parameters in the project-specific Functions environment and store the three sensitive values with Firebase Secret Manager:

```bash
firebase functions:secrets:set RESEND_API_KEY --project clat1-3bb23
firebase functions:secrets:set PARENT_VERIFICATION_STATE_SECRET --project clat1-3bb23
firebase functions:secrets:set ADULT_VERIFICATION_WEBHOOK_SECRET --project clat1-3bb23
```

Do not put secrets in Vercel `VITE_*` variables; Vite exposes those values to the browser.

### 5.4 Incident fallback and rollback

If Firebase Functions, App Check, email or adult verification becomes unhealthy:

1. Set the Vercel production variable `VITE_ACCOUNT_FEATURES_MODE=core_only`.
2. Redeploy the current approved source commit.
3. Confirm Quant, GK and Current Affairs open and a private practice session completes without a Firebase write.
4. Keep strict database rules in place while investigating; do not weaken consent enforcement to restore cloud progress.
5. Re-enable account features through the same preview and canary gate after recovery.

Assign one on-call owner for the privacy service and one release decision-maker. Alert separately on core-learning availability and account/consent availability so a consent vendor outage is not reported as a full learning outage.

## 6. End-to-end release tests

1. Adult says “18 or older,” reviews the itemised notice, checks consent, signs in with Google, and receives `ADULT_CONSENTED` only from the server.
2. An untrusted signed-in user without a privacy claim cannot read or write student progress.
3. Child path retains only parent email, opaque request/token hashes and security/delivery timestamps before consent.
4. Parent must use the invited Google email, then pass the Rule 10 provider, then affirm relationship and purposes.
5. Parent invitations become unusable after 48 hours and are removed by the 15-minute cleanup cycle. Activation
   codes are one-time, expire in 24 hours, and cannot be used before consent.
6. Child Google account and progress are created only after code verification.
7. Adult access/correction/erasure requests enter the server queue; destructive requests require recent reauthentication.
8. Child rights requests do nothing until the originally verified parent authenticates and approves.
9. Correction changes propagate and email corrections require control of the new email.
10. Erasure deletes the Firebase user and user subtree, removes the linked parent request, revokes sessions, and pseudonymises the minimal consent audit record.
11. Expired invitations and rate-limit records are deleted by schedule.
12. Logs, backups, analytics exports, email-provider retention and any webhook destination are covered by tested deletion/retention procedures.

## 7. Operational controls

- Alert on rights requests approaching the internal 30-day target; do not describe that target as a statutory deadline unless counsel confirms it.
- `ACCESS`, `CORRECTION`, `ERASURE`, and `WITHDRAWAL` are automated after identity/guardian verification. `GRIEVANCE` and `NOMINATION` route to human review because they require judgement or supporting evidence.
- Review all `FAILED_RETRYABLE`, stuck `PROCESSING`, email-delivery failures and adult-verification failures daily.
- Run a quarterly child-onboarding and rights tabletop exercise and preserve test evidence.
- Maintain processor contracts, incident response, breach notification, retention, backup-erasure, access-control and change-management evidence outside the application repository.

No software specification can guarantee that an organisation will “never” be non-compliant. This gate reduces product risk, but production compliance also depends on truthful configuration, operations, vendors, legal interpretation and actual staff behaviour.
