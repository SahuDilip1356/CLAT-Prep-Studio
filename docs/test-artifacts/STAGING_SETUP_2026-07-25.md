# Staging setup evidence — 25 July 2026

## Confirmed resources

- Authenticated Firebase operator: `dilip.sahu@gmail.com`.
- Production project access verified read-only: `clat1-3bb23`.
- New staging project created: `clat1-3bb23-staging`.
- Staging project number: `1048130539465`.
- Staging web app registered: `1:1048130539465:web:fa456b423f20d13b876218`.
- Default Firestore database created in `asia-south1`.
- `firestore.rules` compiled and deployed successfully to staging.
- `.firebaserc` defaults to staging; production requires the explicit `production` alias or project ID.

## Preview source inspection

`vercel deploy --dry --format=json` completed without uploading or creating a deployment:

- Framework: Vite.
- Files selected: 138.
- Total upload candidate size: 17,707,424 bytes.
- Main included roots: `public` and `src`.
- Firebase Functions, rules, documentation, raw PDFs, Android build files, backup folders and local environment files were excluded through `.vercelignore`.

## Pending console/vendor gates

- Firebase Storage still requires the one-time **Get Started** action before deny-all Storage rules can be deployed.
- Google Authentication provider enablement has not yet been independently verified.
- App Check/reCAPTCHA Enterprise is intentionally not enforced in `core_only`.
- Firebase Functions are not deployed because the Resend key, verified sender domain, stable Preview callback URL and Rule 10 adult-verification provider are not yet configured.
- No Vercel Preview was created and no source branch was pushed to GitHub.
- Production Firebase and production Vercel were not modified.
