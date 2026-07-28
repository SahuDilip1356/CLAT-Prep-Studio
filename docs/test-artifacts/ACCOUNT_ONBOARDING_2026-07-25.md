# Account onboarding verification — 25 July 2026

## Source checks

- ESLint passed for `src/App.jsx` and `src/components/AuthModal.jsx`.
- `core_only` compliance build passed.
- `enabled` account-mode compliance build passed with a non-production App Check placeholder used
  only to validate the build-time gate.
- Existing large JavaScript bundle warning remains non-blocking.

## Browser checks

Verified against a clean local development origin without initiating Google authentication or creating
external data:

1. The account entry dialog rendered:
   - **Sign in to existing account**
   - **Create account**
   - **Continue without an account**
2. The dialog stated that only activated accounts may upload progress.
3. **Create account** opened the age-band choice before Google authentication.
4. **Under 18** opened the parent-email route and confirmed that no student profile or learning activity
   is created at that stage.
5. **18 or older** opened the standalone notice with an unticked consent checkbox.
6. The adult notice listed account/progress processing, learning feedback, processors, rights,
   withdrawal and retention.
7. No application console errors were observed on the clean verification origin.

## Fail-closed checks implemented in source

- Returning login requires `ADULT_CONSENTED` or `PARENT_VERIFIED`.
- An unactivated/legacy account is signed out and directed to account activation.
- Adult and child activation flows suppress automatic sign-out only while their consent transaction is
  in progress.
- Failed activation signs out and deletes a newly created Firebase Auth account where possible.
- The authenticated header now exposes an explicit **Log out** label.

## Not exercised

- Google popup authentication.
- Resend email delivery.
- Parent adult-verification provider.
- Activation-code claim.
- Firestore cloud-progress writes.
- Correction or erasure execution.

These require the trusted backend, App Check and vendor secrets. The account frontend must not be
released in `enabled` mode until those release gates pass.
