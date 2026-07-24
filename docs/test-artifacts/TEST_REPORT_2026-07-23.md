# DPDPA journey implementation test report

**Application:** CLAT Prep Studio  
**Date:** 23 July 2026  
**Environment:** Local Vite development/build environment  
**Result:** Implementation tests passed; production compliance release gate remains blocked as designed.

## Scope tested

- Age-band onboarding gate
- Adult notice and consent screen
- Required adult consent validation
- Under-18 parent-email-only screen
- Parent email HTML constraints
- Invalid/unknown parent invitation fail-closed behaviour
- Removal of invitation token from the address bar
- Recovery from an invalid parent link
- Frontend production compilation
- Targeted lint of privacy implementation
- Firebase Functions syntax and module import
- Production configuration release gate

## Automated command evidence

| Test | Result | Evidence |
|---|---|---|
| Targeted ESLint | PASS | Exit `0`; no output, errors or warnings |
| Vite production build | PASS | 1,622 modules transformed; build completed in 1.72 seconds |
| Backend syntax check | PASS | `node --check functions/index.js`, exit `0` |
| Backend module import | PASS | 13 privacy functions imported successfully |
| Git whitespace validation | PASS | `git diff --check`, exit `0` |
| Fresh-page browser console | PASS | No warning or error entries |
| Compliance production gate | PASS — blocked as expected | Exit `1` because mandatory production identity, contact, App Check and Firebase variables are absent |

The JavaScript bundle-size warning is a performance observation, not a privacy test failure.

## Browser interaction evidence

### TC-UI-01: neutral age-band gate

**Expected:** No DOB field; neither route preselected; adult and child routes visible.

**Observed:** One onboarding dialog containing:

- “Is the student 18 years or older?”
- “Yes, 18 or older”
- “No, under 18”
- “We do not ask for or store an exact date of birth during normal onboarding.”

**Result:** PASS  
**Screenshot:** `01-age-band-gate.jpg`

### TC-UI-02: adult notice and consent

**Expected:** Itemised data/purposes, processors, rights, withdrawal and retention information appear before Google sign-in.

**Observed:** Notice rendered with two required educational purposes; optional parent reports and marketing off; correction and erasure rights present.

**Negative test:** Selecting “Consent and continue with Google” without checking consent did not launch Google. It displayed:

> Please review the notice and confirm the required educational processing.

**Result:** PASS  
**Screenshot:** `02-adult-consent.jpg`

### TC-UI-03: under-18 minimisation

**Expected:** Before parental consent, do not request student name, student email, DOB, target year, Google ID or learning information.

**Observed:** The form contains only one input:

- type: `email`
- required: true
- label: “Parent or lawful guardian email”

**Result:** PASS  
**Screenshot:** `03-under-18-parent-email-only.jpg`

### TC-UI-04: invalid parent invitation

**Expected:** An unknown token must not expose a parent form, activate an account or retain the token in the visible URL.

**Observed:**

- URL changed from `/?parentConsent=…` to `/`.
- No consent or activation controls appeared.
- The page displayed a safe failure explanation.
- “Return to CLAT Prep Studio” cleared the temporary journey and returned to the homepage.

**Result:** PASS  
**Screenshot:** `04-invalid-parent-link-fails-closed.jpg`

## Backend surface imported

```text
approveChildRightsRequest
authenticateParentForConsent
captureParentConsent
claimChildConsent
createParentConsentRequest
deleteExpiredPrivacyArtifacts
finalizeAdultConsent
getChildRightsApproval
getParentConsentRequest
parentAdultVerificationWebhook
processVerifiedRightsRequests
startParentAdultVerification
submitDataPrincipalRequest
```

## Defects found and corrected during browser testing

1. An adult validation message remained visible after changing to the child route.
   - Fixed by clearing route-specific errors on every age-band transition.
   - Retest passed.
2. Raw Firebase `internal` errors were shown for invalid/unconfigured parent links.
   - Fixed through privacy-safe error mapping.
   - Retest passed.
3. An invalid parent link left the same-tab session stuck on the parent journey.
   - Added a recovery action that clears the temporary token, signs out any parent session and returns to the studio.
   - Retest passed.

A transient Vite hot-reload service-registration message was observed while source files were being changed.
A newly opened page after the final build produced no browser warning or error entries.

## Deliberately unexecuted production tests

The following cannot be truthfully marked passed until production dependencies are selected and configured:

- Delivery through the approved transactional email domain
- Adult identity/age verification through a DPDP Rule 10-capable provider or authorised-token route
- Signed provider webhook callback
- Parent consent receipt and activation-code delivery
- Child Google account binding with a real one-time code
- Firebase custom-claim enforcement against the production project
- Firestore Rules emulator/integration suite
- Correction and erasure across every actual processor and backup
- Breach and restore/non-resurrection drills

These remain release blockers in `DPDPA_CONTINUOUS_COMPLIANCE_SPEC.md` and `PRIVACY_DEPLOYMENT_RUNBOOK.md`.
