# Staging setup evidence — 25 July 2026

## Confirmed resources

- Authenticated Firebase operator: `dilip.sahu@gmail.com`.
- Production project access verified read-only: `clat1-3bb23`.
- New staging project created: `clat1-3bb23-staging`.
- Staging project number: `1048130539465`.
- Staging web app registered: `1:1048130539465:web:fa456b423f20d13b876218`.
- Default Firestore database created in `asia-south1`.
- `firestore.rules` compiled and deployed successfully to staging.
- Google Authentication provider confirmed enabled by operator screenshot.
- `.firebaserc` defaults to staging; production requires the explicit `production` alias or project ID.

## Preview source inspection

`vercel deploy --dry --format=json` completed without uploading or creating a deployment:

- Framework: Vite.
- Files selected: 138.
- Total upload candidate size: 17,707,424 bytes.
- Main included roots: `public` and `src`.
- Firebase Functions, rules, documentation, raw PDFs, Android build files, backup folders and local environment files were excluded through `.vercelignore`.

## Core-only Preview deployment

- Deployment ID: `dpl_8B5qsRwNaowvFvKd7Ed1Jkn28KhB`.
- Preview URL: `https://clat-prep-studio-1gu0mh9xa-dilipsahu31s-projects.vercel.app`.
- Vercel state: `READY`.
- Target: Preview (`target: null`); production was not promoted or modified.
- Source: direct constrained CLI upload; no GitHub branch was pushed.
- Remote build completed successfully. The only build diagnostic was the existing JavaScript chunk-size warning.
- Vercel Authentication protects the Preview from anonymous access.

## Browser smoke-test evidence

The authenticated Preview was exercised in Chrome:

- Landing page rendered with the CLAT 2027 countdown, daily mission and all three learning tracks.
- Quant mission opened the 40-question Day 1 CLAT-style drill.
- Static GK opened the 1,565-question preparation hub.
- Current Affairs opened the dossier, passage, rapid-GK and spaced-revision hub.
- Sign-in displayed the `core_only` private-session notice: learning remains available, cloud sync is unavailable and practice is not uploaded.
- Privacy centre rendered Access, Correction, Erasure, Consent Withdrawal, Grievance and Nominee journeys.
- The Correction journey opened its structured request form and displayed the 30-day internal target.
- No browser console warnings or errors were observed during these checks.

## Pending console/vendor gates

- Firebase Storage is intentionally not provisioned because the application does not use file storage and Firebase requires a Blaze billing upgrade. Storage must remain unused until separately approved and secured.
- App Check/reCAPTCHA Enterprise is intentionally not enforced in `core_only`.
- Firebase Functions are no longer required. The replacement Vercel privacy API is deployed to a
  fail-closed Preview and its static/method/authentication smoke tests pass.
- The Preview environment is wired to the staging Firebase browser application, SaralPrivacy legal
  identity, staging server project ID, stable callback alias and `core_only` safety mode.
- Strong Preview-only `CRON_SECRET` and `PARENT_VERIFICATION_STATE_SECRET` values were generated
  directly into encrypted Vercel variables and were not printed or stored in the repository.
- Correction and erasure submissions remain disabled in `core_only` until the Firebase Admin
  credential, App Check site key, Resend configuration and Rule 10 provider are present.
- No source branch was pushed to GitHub.
- Production Firebase and production Vercel were not modified.
