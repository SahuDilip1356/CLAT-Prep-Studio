# DPDPA-ready student account activation specification

Date: 25 July 2026  
Operator: SaralPrivacy  
Privacy contact: privacy@saralprivacy.com

## Decision

Login is part of the product. It must not be enabled as an unconditional first step.

- A student may always use the core learning modules in a private device session.
- An adult student may activate cloud progress after an age-band declaration, standalone notice,
  required-purpose consent and verified Google email sign-in.
- A child account may be created only after the parent or lawful guardian has authenticated,
  passed an approved adult-identification check, reviewed the notice and given consent.
- Returning login is permitted only for an account carrying a trusted server-issued status of
  `ADULT_CONSENTED` or `PARENT_VERIFIED`.
- No advertising, commercial profiling or unrelated behavioural monitoring is permitted for a child.
- Child progress processing is restricted to providing the learning service, measuring educational
  performance, recommending revision and protecting the account.

## Legal implementation position

The final Digital Personal Data Protection Rules, 2025 require verifiable parental consent before
processing a child's personal data and due diligence to establish that the person identifying herself
as the parent is an identifiable adult. Reliable identity and age details, an authorised-entity token
or a Digital Locker service may be used.

The Rules contain a limited exemption for an educational institution tracking or behaviourally
monitoring children for its educational activities or enrolled-child safety. SaralPrivacy should not
rely on this exemption without written legal confirmation that CLAT Prep Studio is an “educational
institution” for this purpose. The product therefore retains verified parental consent as the
conservative launch control.

Sections 3–17 of the Act, including the child-processing and Data Principal rights provisions, are
scheduled to commence eighteen months after the 13 November 2025 notification. The system is being
implemented in advance of that commencement; the release standard remains the final Act and Rules,
not the minimum obligations currently in force.

## Data states

| State | Identity stored | Cloud progress | Permitted next action |
|---|---:|---:|---|
| `PRIVATE_LOCAL` | No student identity | No | Learn locally; start account activation |
| `ADULT_NOTICE` | No | No | Accept notice and continue with Google |
| `ADULT_CONSENTED` | Google identity and consent receipt | Yes | Returning login, progress sync and rights |
| `CHILD_PARENT_PENDING` | Time-limited parent contact/invitation only | No | Parent verification or expiry |
| `PARENT_AUTHENTICATED` | Parent Google identity | No | Adult verification |
| `PARENT_ADULT_VERIFIED` | Parent identity plus verification reference hash | No | Parent consent |
| `PARENT_CONSENT_CAPTURED` | Consent receipt; no student identity yet | No | Student activation |
| `CHILD_ACCOUNT_ACTIVATED` | Student Google identity linked to consent | Yes | Returning login, progress sync and rights |
| `WITHDRAWN` | Minimum lawful audit record only | No | Closure/erasure workflow |
| `ERASURE_PENDING` | Restricted request and lawful audit record | No | Verified deletion |
| `ERASED` | De-identified/minimum legally required record | No | New activation required |

## New adult account

1. Select **Create account**.
2. Answer **Yes, 18 or older**. Do not request date of birth or identity documents by default.
3. Display the standalone privacy notice with itemised data, purposes, processors, retention,
   rights, withdrawal route and privacy contact.
4. Require an unticked consent checkbox for account/progress processing.
5. Continue to Google authentication.
6. The server verifies Google authentication and verified email.
7. The server creates an immutable consent receipt and sets trusted account claims.
8. Only after the trusted claim is refreshed may local practice be uploaded and cloud progress begin.

If any step fails, delete a newly created Firebase Auth user where possible, sign out and retain only
the private device session.

## New child account

1. Select **Create account** and **Under 18**.
2. Explain that learning continues without registration.
3. Collect only the parent/lawful-guardian contact required to send the invitation. Delete it if
   delivery fails or the invitation expires.
4. Do not initiate student Google authentication and do not upload practice.
5. The parent opens the secure, expiring link and signs in using the invited email.
6. Verify that the parent is an identifiable adult using the approved Rule 10 provider or authorised
   identity/age token.
7. The parent declares the relationship, reviews the notice and gives consent.
8. Create a consent receipt and issue a single-use, short-lived activation code.
9. The student enters the code and only then continues to Google.
10. The server atomically binds the consent receipt to the student UID and issues
    `PARENT_VERIFIED`.
11. Cloud progress begins only after the refreshed trusted claim is present.

Pending parent invitations expire after 48 hours. The parent-contact record is deleted and any
unactivated receipt is de-identified. No student account is created during the pending period.

## Returning sign-in

1. Select **Sign in to existing account**.
2. Authenticate with Google.
3. Refresh server-issued claims.
4. Permit cloud access only for `ADULT_CONSENTED` or `PARENT_VERIFIED`.
5. If the account has no trusted status, sign it out and direct the user to **Create account** or the
   controlled legacy-user migration.
6. Load cloud progress and enter the student dashboard.

The user must not repeat the age/consent journey on every valid returning login.

## Logout

- Display an explicit **Log out** control whenever a Firebase user is authenticated.
- Call Firebase sign-out, clear trusted claims, clear in-memory personal records and parent/right
  workflow tokens, and return to private local learning.
- Do not delete the cloud account or progress on logout.
- Account deletion is a separate, authenticated erasure journey.

## Progress and personalisation

Permitted child progress fields are limited to:

- learning profile chosen by the student;
- attempted question identifiers;
- answers, scores and completion timestamps;
- topic-level accuracy, speed and revision status;
- bookmarks and educational recommendations.

Do not use child data for targeted advertising, marketing profiles, cross-service tracking, data sale,
or unrelated analytics. Product analytics for children must be aggregate or strictly necessary for the
educational service. Access to identifiable student progress must be least-privilege and logged.

## Rights

- Access, correction, completion, updating, erasure, consent withdrawal, grievance and nomination
  remain available in the Privacy Centre.
- Adult erasure and withdrawal require recent reauthentication.
- A child request not initiated by the verified parent generates a parent approval link before any
  disclosure, correction or deletion.
- Each request receives a stable reference, status history, responsible operator and response target.
- Erasure removes primary account/progress data and Firebase Auth identity, while retaining only
  records required by law with a documented retention basis.

## Release gates

Account mode must remain disabled until all of the following pass:

1. Firebase Functions or an equivalent trusted backend is deployed.
2. Firebase project billing is enabled if Firebase Functions are used. Storage may remain unused.
3. Resend API key is stored as a server secret and the sending domain passes SPF/DKIM/DMARC.
4. `APP_BASE_URL` and the parent-consent sender address are configured.
5. An approved Rule 10 adult-verification provider is integrated and webhook signatures are tested.
6. App Check/reCAPTCHA Enterprise is configured and enforced for callable functions.
7. Firestore rules are deployed and emulator/negative-access tests pass.
8. Existing users without trusted consent claims are migrated or kept restricted.
9. Adult signup, child signup, returning login, logout, correction, erasure, expiry and abuse tests pass.
10. Legal/operator approval is recorded.

Enabling only the frontend flag without these controls would expose a broken and non-compliant journey.
