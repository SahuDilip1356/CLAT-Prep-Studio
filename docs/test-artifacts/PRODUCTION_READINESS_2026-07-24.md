# Production-readiness verification — 24 July 2026

Scope: account-feature continuity switch and deployment configuration gate.

## Results

| Check | Mode | Result |
| --- | --- | --- |
| Targeted ESLint: `src/App.jsx`, `src/components/AuthModal.jsx`, `scripts/verify_privacy_config.mjs` | N/A | PASS |
| Vite production build | `VITE_ACCOUNT_FEATURES_MODE=core_only` | PASS |
| Vite production build | `VITE_ACCOUNT_FEATURES_MODE=enabled` | PASS |
| Privacy configuration verifier with all required non-secret test values | `core_only` | PASS |
| Privacy configuration verifier with `VITE_ACCOUNT_FEATURES_MODE=unsafe` | invalid | PASS — deployment blocked as designed |

Both production builds transformed 1,622 modules successfully. Vite reported an existing bundle-size warning because the main JavaScript bundle exceeds 500 kB; this is a performance follow-up, not a build failure.

## Continuity assertion covered by implementation

When `VITE_ACCOUNT_FEATURES_MODE=core_only`, the application does not attach the Firebase authentication listener and the sign-in modal offers private session study instead of starting Google sign-in or cloud sync. Parent-consent and rights-approval token routes remain reachable so already-started privacy workflows are not stranded.

## Not yet evidenced

- Staging integration with a real email provider.
- Staging integration with a Rule 10-capable adult-verification provider.
- Existing production-user inventory and trusted-claim migration.
- App Check token metrics under real traffic.
- Firebase rules denial tests against the approved production project.
- Vercel Preview, canary, production promotion and production monitoring.

These items remain release blockers in `docs/PRIVACY_DEPLOYMENT_RUNBOOK.md`.

## Streamlined under-18 onboarding update

After the initial verification, the under-18 journey was simplified and rechecked:

- The student can continue learning without an account from the parent-email screen.
- The interface states that no date-of-birth document or identity proof is required to use the learning platform.
- Parent Google-email authentication now hands off directly to the adult-status provider, removing a separate intermediate action.
- The parent check is described as applying only to Google sign-in and saved online progress.
- Targeted ESLint, the `enabled` production build and `git diff --check` passed after the change.

## Correction and erasure lifecycle update

The rights workflow was extended and statically verified:

- Authorised users can request changes to name, verified email, target year and target NLU.
- Name corrections update both Firebase Authentication and the Firestore student profile.
- Email corrections remain pending until the new address is verified, then update the Firestore profile.
- A server callable returns authoritative request statuses; the Privacy Centre refreshes on entry, every 30 seconds and on demand.
- Adult requests receive an acknowledgement email. Child requests require the originally verified parent’s authenticated approval.
- Erasure recursively deletes the Firebase user subtree, revokes sessions, deletes the Firebase Authentication account and parent-consent request, and pseudonymises every linked consent receipt and rights record.
- Completion emails are attempted without allowing an email-provider failure to repeat a destructive deletion.
- External processor and backup confirmation remains a production operational task; the case stays `PROCESSOR_CONFIRMATION_REQUIRED` after primary-system erasure.

Targeted frontend and Functions ESLint, Firebase Functions import, the `enabled` production build and `git diff --check` passed after this update.
