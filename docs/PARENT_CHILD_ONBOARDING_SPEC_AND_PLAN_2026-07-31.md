# Parent–child onboarding, verified consent and account activation

**Status:** Proposed implementation baseline  
**Date:** 31 July 2026  
**Product:** CLAT Prep Studio  
**Production origin:** `https://theintello.com`

> This document is a product and engineering specification, not legal advice. The
> production method used to establish that a consenting person is an identifiable
> adult parent or lawful guardian must be approved by qualified Indian privacy
> counsel before child cloud accounts are enabled.

## 1. Product decision

CLAT Prep Studio will support two independent onboarding routes:

1. An adult student who declares that they are 18 or older may review the adult
   notice, consent, authenticate and create their own cloud account.
2. A student under 18 may request a parent or lawful guardian to create a linked
   child account. No child cloud account or identifiable progress processing starts
   until the parent completes the required verification and consent journey.

The parent and child must have separate identities:

```text
Parent Firebase user
  └── verified parent–child relationship
        └── Child Firebase user
              └── child profile and educational progress
```

The child must not sign in using the parent's credentials. The parent account owns
consent and privacy controls; the child account owns the learning session and
permitted educational progress.

## 2. Goals

- Verify control of the invited parent email.
- Establish the approved evidence that the consenting person is an identifiable
  adult parent or lawful guardian.
- Capture an explicit, versioned consent decision before creating an active child
  account.
- Capture the child's name and email only for the disclosed account and learning
  purposes.
- Give the child a secure activation journey and their own login.
- Link the parent, consent receipt and child account without exposing sensitive
  records to the browser.
- Allow the parent to view the relationship, manage consent and initiate rights
  requests.
- Allow the child to retain progress across devices after activation.
- Keep the existing adult route working without regression.

## 3. Non-goals for the first release

- The child does not use the parent's login.
- Email ownership alone is not described as proof of adulthood or guardianship.
- A password-reset email is not used as the initial account-activation mechanism.
- Child data is not used for targeted advertising, cross-service tracking,
  commercial profiling or unrelated behavioural analytics.
- Multiple parents per child, custody disputes and institutional/school-managed
  accounts are deferred.
- Full date of birth and government identity documents are not stored by CLAT Prep
  Studio unless the approved verification design makes this strictly necessary.

## 4. Current production behaviour

### Adult route

The adult route is live and working:

1. Select 18 or older.
2. Review and accept the notice.
3. Authenticate with Google.
4. The backend records consent and adds trusted claims.
5. Cloud progress is enabled.

### Under-18 route

The live route currently:

1. Collects only a parent email.
2. Sends an informational email.
3. Creates no consent link, parent account, child identity or cloud account.
4. Keeps the student in a private device session.

This route must be replaced by the target journey below.

## 5. Target user journeys

### 5.1 Student starts an under-18 request

Screen sequence:

1. **Account**
2. **Age band**
3. **Parent details**
4. **Waiting for parent**
5. **Account activation**
6. **Access**

Fields collected at request time:

| Field | Requirement | Reason |
|---|---|---|
| Parent/guardian email | Required | Deliver invitation and bind parent authentication |
| Child first/preferred name | Required | Identify the child to the parent and create the profile |
| Child email | Required for a separate child login | Deliver activation and recovery messages |
| Age band | Required | Select the child consent route |
| Parent relationship | Collected from parent, not child | Parent/lawful-guardian declaration |

The UI must:

- explain that no cloud account or progress is enabled yet;
- obtain confirmation that the entered parent email is correct;
- avoid displaying whether either email already has an account;
- permit private local practice while consent is pending;
- show that the invitation expires after 48 hours;
- provide a rate-limited resend action.

Server result:

```text
PARENT_INVITATION_CREATED
  -> PARENT_INVITATION_SENT
```

### 5.2 Parent opens the invitation

The email contains:

- a neutral subject that does not expose sensitive child information;
- the service name;
- a statement that an under-18 account was requested;
- masked child details sufficient for recognition;
- a single-use `Review request` link;
- expiry, unexpected-request and privacy-contact instructions.

The raw invitation token is sent only in the link. Firestore stores only its hash.
It expires after 48 hours and becomes invalid after successful completion.

Landing page:

```text
https://theintello.com/parent-consent?token=<single-use-token>
```

The page first validates the token without disclosing the full stored emails. It
then asks the parent to authenticate using the exact invited email address.

Implemented parent email confirmation:

- the parent receives a random, single-use link at the submitted parent email;
- possession and use of that link confirms control of the invited mailbox;
- the parent is not created as a student user and does not enter the learning
  dashboard;
- the parent confirms the student details, relationship and consent declarations
  on the consent page.

Email authentication verifies mailbox control. It does not, on its own, establish
adulthood or the parent/guardian relationship.

### 5.3 Parent adult/authority verification

The current implementation records mailbox confirmation plus the parent's adult and
relationship declarations. Before describing this as independently verified
adulthood or guardianship, the operator must decide whether an additional
production-approved verification step is required. Any selected method should
minimise identity data retained by CLAT Prep Studio.

Possible approved integrations include:

- an authorised identity/age-verification provider;
- an approved Digital Locker-based flow;
- another method formally approved by counsel against the applicable Rules.

Only the provider reference, result, method, timestamp and a keyed/hash reference
should be retained where possible. Do not retain raw identity documents by default.

Firebase App Check/reCAPTCHA Enterprise protects the application from abusive or
non-genuine client requests. It is **not** parent identity or age verification.

Successful result:

```text
PARENT_EMAIL_VERIFIED
  -> PARENT_ADULT_VERIFIED
```

### 5.4 Parent reviews and gives consent

The parent page displays:

- child preferred name and masked child email;
- categories of student data;
- required account/progress purpose;
- required educational-feedback purpose;
- processors and material data flows;
- retention and deletion explanation;
- child and parent rights;
- withdrawal consequences and route;
- privacy contact;
- separate, unticked optional choices, if any;
- notice and consent version.

Required confirmations:

- I am an adult.
- I am this child's parent or lawful guardian.
- The displayed child details are correct.
- I consent to the required account/progress processing.
- I consent to the required educational-feedback processing.

Marketing, testimonials and optional parent reports must not be bundled into the
required consent.

The backend atomically:

1. verifies the authenticated parent and invitation;
2. verifies the adult-verification result;
3. creates an immutable consent receipt;
4. creates or updates the parent profile;
5. creates the pending child profile;
6. creates the parent–child relationship;
7. consumes the parent invitation;
8. creates a single-use child activation token;
9. sends the activation message to the child email.

Successful result:

```text
PARENT_CONSENTED
  -> CHILD_INVITED
```

### 5.5 Child activates their account

The child receives an `Activate your CLAT Prep Studio account` email. It contains a
single-use link, not a reusable activation code.

```text
https://theintello.com/activate-child?token=<single-use-token>
```

The activation page:

1. validates the token;
2. displays the expected child name and masked email;
3. presents a child-readable privacy summary;
4. verifies control of the child email;
5. lets the child establish a password, or completes passwordless email-link
   authentication;
6. atomically binds the Firebase child UID to the pending child profile and consent
   receipt;
7. issues trusted child claims;
8. invalidates the activation token;
9. refreshes the Firebase ID token;
10. enables cloud progress.

Preferred initial credential options:

- **Recommended:** passwordless Firebase email-link login.
- **Alternative:** custom activation link followed by `Set password`.

Do not label initial activation as `Reset password`. Password reset remains a
separate recovery flow after activation.

Successful result:

```text
CHILD_EMAIL_VERIFIED
  -> CHILD_ACCOUNT_ACTIVE
```

### 5.6 Returning login

Parent:

- signs in using the parent email;
- sees linked child name, consent status and privacy controls;
- cannot enter the child's learning session by default.

Child:

- signs in using the child email and selected credential;
- receives only the child role and linked child profile;
- can access permitted educational progress;
- cannot read consent evidence, parent private details or administrative records.

The server permits cloud access only when:

```text
accountRole == CHILD
AND privacyStatus == PARENT_CONSENTED
AND relationshipStatus == ACTIVE
AND consentStatus == ACTIVE
```

## 6. State model

### Invitation and activation states

```text
PARENT_INVITATION_CREATED
  -> PARENT_INVITATION_SENT
  -> PARENT_EMAIL_VERIFIED
  -> PARENT_ADULT_VERIFIED
  -> PARENT_CONSENTED
  -> CHILD_INVITED
  -> CHILD_EMAIL_VERIFIED
  -> CHILD_ACCOUNT_ACTIVE
```

Terminal/exception states:

```text
INVITATION_DELIVERY_FAILED
INVITATION_EXPIRED
INVITATION_DECLINED
VERIFICATION_FAILED
CONSENT_DECLINED
CHILD_ACTIVATION_EXPIRED
CONSENT_WITHDRAWN
ACCOUNT_SUSPENDED
ERASURE_PENDING
ERASED
```

Transitions are server controlled. Clients submit requested actions, never trusted
statuses or timestamps.

## 7. Identity and authorization model

### Firebase custom claims

Parent:

```json
{
  "accountRole": "PARENT",
  "privacyStatus": "PARENT_ACTIVE"
}
```

Child:

```json
{
  "accountRole": "CHILD",
  "privacyStatus": "PARENT_CONSENTED",
  "childProfileId": "<opaque-id>"
}
```

Do not place parent email, child name, relationship IDs or consent details in
custom claims. Claims are authorization hints and have size/staleness constraints.
Every sensitive mutation must re-check current server records.

### Parent and child Firebase users

- Parent Firebase UID and child Firebase UID must always differ.
- The same email cannot be used simultaneously as the parent and child email for
  one request.
- Existing accounts require conflict-safe linking; never silently reassign an
  existing Firebase UID.
- Account creation must be performed or finalised by the trusted backend so an
  unconsented child cannot self-register around the onboarding gate.

## 8. Firestore data model

Collection and document names may be adjusted during implementation, but the
separation of concerns is required.

### `parentConsentRequests/{requestId}`

```text
status
parentEmailNormalized
parentEmailHash
childEmailNormalized
childEmailHash
childPreferredName
ageBand
noticeVersion
consentVersion
invitationTokenHash
invitationExpiresAt
parentUid
parentEmailVerifiedAt
adultVerificationMethod
adultVerificationReferenceHash
adultVerifiedAt
consentReceiptId
childProfileId
createdAt
sentAt
consumedAt
expiresAt
```

This collection remains server-only.

### `parentProfiles/{parentUid}`

```text
email
emailVerified
status
createdAt
updatedAt
```

### `childProfiles/{childProfileId}`

```text
childUid
preferredName
email
ageBand
accountStatus
privacyStatus
consentReceiptId
createdAt
activatedAt
updatedAt
```

Do not store full date of birth unless separately approved and necessary.

### `parentChildRelationships/{relationshipId}`

```text
parentUid
childProfileId
relationshipType
status
consentReceiptId
verifiedAt
createdAt
endedAt
```

### `consentReceipts/{receiptId}`

```text
subjectChildProfileId
actorParentUid
actorRole
lawfulRoute
noticeVersion
noticeHash
consentVersion
purposesAccepted
purposesDeclined
parentEmailVerifiedAt
adultVerificationMethod
adultVerificationReferenceHash
givenAt
withdrawnAt
source
```

Receipts are immutable events. Withdrawal creates a new event or dedicated
withdrawal fields under server control; it does not erase the historical fact that
consent was previously recorded.

### `childActivationRequests/{activationId}`

```text
childProfileId
childEmailHash
activationTokenHash
status
expiresAt
createdAt
consumedAt
attemptCount
```

This collection remains server-only.

## 9. API changes

### Replace the current request payload

Current:

```json
{
  "ageBand": "CHILD",
  "parentEmail": "parent@example.com"
}
```

Target:

```json
{
  "ageBand": "CHILD",
  "parentEmail": "parent@example.com",
  "childPreferredName": "Aarav",
  "childEmail": "aarav@example.com",
  "noticeVersion": "<current>",
  "consentVersion": "<current>"
}
```

### Target API operations

| Operation | Authentication | Purpose |
|---|---|---|
| `createParentConsentRequest` | App Check | Create request and send invitation |
| `getParentConsentRequest` | App Check + invitation token | Return safe/masked request summary |
| `authenticateParentForConsent` | Parent Firebase ID token | Bind exact invited parent email |
| `startParentAdultVerification` | Parent ID token | Start approved verification |
| Verification webhook | Signed provider request | Record adult verification result |
| `captureParentConsent` | Parent ID token | Record consent and create pending child |
| `resendChildActivation` | Parent ID token | Rotate and resend activation token |
| `getChildActivationRequest` | App Check + activation token | Return safe activation summary |
| `activateChildAccount` | Verified child credential | Bind child UID and enable claims |
| `getParentDashboard` | Parent ID token | List authorised child relationships |
| `withdrawParentConsent` | Recent parent authentication | Disable child cloud processing |

### Retire

- Informational-only parent email behaviour.
- Parent activation-code display and manual code entry.
- `claimChildConsent(activationCode)`.
- Returning child sign-in through a parent identity.

During migration, old endpoints must fail closed and must not accept previously
issued codes after the defined sunset.

## 10. Frontend changes

### `src/components/AuthModal.jsx`

- Replace `Notify a parent or guardian` with `Ask a parent or guardian`.
- Add child preferred-name and child-email fields.
- Add email-match, same-email and format validation.
- Replace the notification-only success screen with a pending-consent screen.
- Add resend, change-email and continue-private controls.
- Do not offer Google child sign-in until consent and activation are ready.

### `src/components/ParentConsentPage.jsx`

- Rebuild around invitation validation, parent email authentication, approved adult
  verification, notice review and consent.
- Remove manual activation-code display.
- Show clear expired, declined, already-completed and wrong-account states.
- Add a parent receipt/completion screen.

### New `src/components/ChildActivationPage.jsx`

- Validate activation token.
- Show child-readable notice.
- Verify the intended child email.
- Complete passwordless activation or initial password creation.
- Refresh claims and enter the student account.

### New parent privacy/account page

- Show linked child name and relationship status.
- Show/download the consent receipt.
- Resend an unexpired child activation.
- Withdraw consent and initiate closure/erasure.
- Never expose raw verification-provider evidence.

### `src/App.jsx`

- Route `/parent-consent`.
- Route `/activate-child`.
- Separate parent and child post-authentication destinations.
- Prevent parent sessions from being treated as student learning sessions.
- Load progress only for active adult or child learner claims.

### `src/firebase.js`

- Enable the chosen parent email-link and child credential methods.
- Add activation and parent-dashboard API wrappers.
- Refresh ID tokens after server claim updates.
- Preserve App Check headers for every privacy API call.
- Handle email-link completion without putting email addresses in URL parameters.

## 11. Backend changes

### `server/privacy-service.js`

- Restore secure invitation-token creation; the current live implementation creates
  no invitation token.
- Accept and validate the minimum child fields.
- Generate an expiring single-use parent link.
- Make consent capture idempotent and transactional.
- Create separate parent, child and relationship records.
- Generate a child activation link instead of an activation code.
- Use Firebase Admin for controlled account creation/linking and claims.
- Enforce unique/compatible parent and child emails.
- Disable child access immediately on consent withdrawal.
- Rotate tokens on resend and invalidate prior tokens.
- Extend expiry cleanup to invitations and activation requests.
- Record security events without logging raw tokens or unnecessary personal data.

### `api/privacy.js`

- Register the new operations.
- Keep App Check verification.
- Require Firebase authentication per operation.
- Add generic responses that resist email/account enumeration.
- Consider explicit request-body size limits and stricter origin checks.

### Email service

Create templates for:

1. Parent consent invitation.
2. Parent consent completion/receipt.
3. Child account activation.
4. Child activation resend.
5. Invitation expired.
6. Consent withdrawn/account restricted.
7. Child account activated notification to parent.
8. Password reset/account recovery.

No raw token, email address or sensitive child information may be written to logs.

## 12. Firestore rules

Rules must enforce:

- invitation, activation and rate-limit collections are server-only;
- a parent reads only parent-profile fields and relationships where
  `parentUid == request.auth.uid`;
- a child reads only the child profile mapped to its trusted claim;
- parents cannot directly alter consent, relationship or child status;
- children cannot change age, parent, consent or authorization fields;
- learning progress is available only to active learner claims;
- all consent receipts are written by the backend only;
- ordinary users cannot enumerate parent–child relationships.

Emulator tests must cover cross-parent and cross-child access, stale claims,
withdrawn consent and malicious field injection.

## 13. Security and abuse controls

- Firebase App Check enforced on production privacy endpoints.
- Single-use random tokens with at least 256 bits of entropy.
- Only token hashes stored server-side.
- Parent invitation TTL: 48 hours.
- Child activation TTL: 24 hours, configurable.
- Rate limits by IP, parent-email hash and child-email hash.
- Resend cooldown and maximum attempts.
- Constant/generic responses for account-existence-sensitive operations.
- Exact invited-email matching after authentication.
- Recent reauthentication for withdrawal, parent change and erasure.
- Signed verification webhooks with replay protection.
- Atomic/idempotent state transitions.
- Secret rotation runbook.
- Security audit trail for privileged transitions.
- Content Security Policy and no-referrer protections for token-bearing pages.
- Tokens removed from browser history where practical after exchange.

## 14. Data lifecycle

| Record | Proposed retention |
|---|---|
| Failed delivery request | Delete immediately or retain minimal abuse record |
| Pending parent invitation | 48 hours |
| Unused child activation | 24 hours after issue |
| Consent receipt | Account life plus approved legal/audit period |
| Active child profile/progress | While service and purpose remain active |
| Withdrawn account | Restrict immediately; complete approved closure/erasure process |
| Security/rate-limit record | Short documented abuse-prevention window |

Exact production periods require the approved retention schedule. Cron processing
must remove expired tokens and unnecessary contact data.

## 15. Existing-user and pending-request migration

- Adult accounts with valid `ADULT_CONSENTED` claims remain unchanged.
- Current notification-only under-18 records do not represent consent and cannot be
  converted into active child accounts.
- Existing notification-only requests expire naturally and are deleted.
- Parents who received the old informational message must start a new invitation
  after the new flow launches.
- Existing `PARENT_VERIFIED` child accounts, if any, require an audit before being
  mapped into the new parent/child relationship model.
- Old activation codes must be invalidated at rollout.

## 16. Environment and platform configuration

Retain:

- Firebase web configuration.
- Firebase Admin credentials.
- Resend API key and verified sender.
- App Check/reCAPTCHA Enterprise key.
- `APP_BASE_URL`.
- cron and webhook secrets.

Add or confirm:

```text
PARENT_INVITATION_TTL_HOURS=48
CHILD_ACTIVATION_TTL_HOURS=24
PARENT_CONSENT_FROM_EMAIL=<verified sender>
PARENT_CONSENT_REPLY_TO_EMAIL=<monitored privacy address>
PARENT_ADULT_VERIFICATION_PROVIDER=<approved method>
PARENT_ADULT_VERIFICATION_START_URL=<provider URL, if applicable>
PARENT_ADULT_VERIFICATION_WEBHOOK_SECRET=<strong secret, if applicable>
PARENT_VERIFICATION_STATE_SECRET=<strong secret>
```

Do not invent placeholder verification URLs or secrets. The provider-dependent
variables are added only after a provider and integration contract are selected.

Production and preview must use separate Firebase/App Check configurations. A
production App Check key must not become the permanent preview/staging key.

## 17. Observability

Track aggregate operational events:

- invitation created/sent/failed/expired;
- parent email verified;
- adult verification passed/failed;
- consent given/declined;
- child activation sent/completed/expired;
- time and abandonment between stages;
- resend and rate-limit events;
- withdrawal and erasure completion;
- authentication and authorization failures.

Do not send child names, emails, raw Firebase UIDs, tokens or verification evidence
to general analytics.

## 18. Test plan

### Unit tests

- field normalisation and validation;
- same parent/child email rejection;
- token hashing, expiry and rotation;
- every allowed and forbidden state transition;
- consent-version mismatch;
- idempotent repeated webhook and consent calls;
- email template escaping;
- claims generated for parent versus child.

### API integration tests

- App Check missing/invalid;
- invalid, expired, consumed and rotated invitation;
- wrong parent email after authentication;
- unverified parent attempting consent;
- consent creates all records atomically;
- child activation cannot be claimed by another email/UID;
- duplicate existing-email conflicts;
- withdrawal immediately blocks cloud access;
- cleanup removes expired personal data.

### Firestore emulator tests

- parent A cannot access parent B or child B;
- child cannot access parent contact or consent evidence;
- child cannot activate itself through direct writes;
- stale claims cannot access a withdrawn profile;
- only backend/Admin SDK can mutate privacy states.

### End-to-end tests

1. Adult registration remains successful.
2. Under-18 request through parent invitation.
3. Parent opens link on a different device.
4. Wrong Google/email account is rejected safely.
5. Parent verification and consent complete.
6. Child activation link completes.
7. Child returning login restores progress.
8. Parent login opens parent controls, not the student dashboard.
9. Invitation and child activation expiry/resend.
10. Consent withdrawal disables child cloud access.
11. Password recovery after child activation.
12. Mobile, keyboard, screen-reader and reduced-motion checks.

## 19. Delivery plan

### Phase 0 — Product, legal and verification decision

Deliverables:

- approve exact required/optional purposes and notice copy;
- approve parent/guardian evidence method;
- select passwordless or set-password child activation;
- approve data fields and retention periods;
- decide whether parent reports are part of the first release.

Exit gate: no unresolved verification or notice decision.

### Phase 1 — Backend domain model

Deliverables:

- new state machine and schemas;
- token generation/rotation;
- invitation, consent and activation APIs;
- parent/child/relationship records;
- email templates;
- expiry cleanup;
- unit and API tests.

Exit gate: no client can activate a child without valid server-recorded consent.

### Phase 2 — Parent journey

Deliverables:

- enhanced under-18 request form;
- secure parent invitation;
- parent email authentication;
- approved adult verification;
- parent notice/consent page;
- completion receipt.

Exit gate: end-to-end parent consent passes in staging.

### Phase 3 — Child activation and returning login

Deliverables:

- activation email and page;
- separate child Firebase identity;
- token/claim refresh;
- child login and recovery;
- progress binding and sync;
- parent/child route separation.

Exit gate: activated child restores progress across devices and an unactivated child
cannot use cloud storage.

### Phase 4 — Parent controls and rights

Deliverables:

- parent dashboard;
- receipt view;
- consent withdrawal;
- child access/correction/erasure initiation;
- immediate account restriction and deletion orchestration.

Exit gate: withdrawal and rights flows pass with audit evidence.

### Phase 5 — Assurance and rollout

Deliverables:

- Firestore emulator security suite;
- staging end-to-end suite;
- abuse and replay testing;
- accessibility and mobile review;
- legal/privacy approval;
- monitoring and rollback runbook;
- controlled production rollout.

Rollout:

1. Deploy backend and rules with the feature disabled.
2. Deploy the parent and child pages.
3. Test with internal allowlisted accounts.
4. Enable a small production cohort.
5. Monitor delivery, verification, abandonment and authorization errors.
6. Enable the under-18 account route generally.
7. Remove the notification-only UI and old activation-code paths after the rollback
   window.

## 20. Definition of done

The feature is complete only when:

1. Parent and child have separate Firebase identities.
2. The parent email is verified and matches the invitation.
3. The approved adult/guardian verification requirement is satisfied.
4. Consent evidence contains actor, role, purposes, versions, verification reference
   and server timestamp.
5. No child cloud account or identifiable progress exists before valid consent.
6. The child activation link is single-use and bound to the intended email/profile.
7. Parent sessions cannot access the student learning session by accident.
8. Child sessions cannot access parent or consent-administration data.
9. Withdrawal immediately prevents further cloud processing and starts the approved
   closure workflow.
10. Expired and failed requests remove unnecessary personal data.
11. Security, API, rules and end-to-end tests pass.
12. Preview and production configurations are isolated.
13. Legal, privacy and product approvals are recorded.

## 21. Change summary by repository area

| Area | Retain | Change/add |
|---|---|---|
| `AuthModal.jsx` | Age gate and adult route | Child name/email, real invitation and pending state |
| `ParentConsentPage.jsx` | Route foundation | Email auth, verification, consent; remove activation code |
| `ChildActivationPage.jsx` | — | New activation and credential setup page |
| `App.jsx` | Adult authentication | Role-aware parent/child routing |
| `firebase.js` | App Check and privacy API wrapper | Email-link auth, activation and parent APIs |
| `privacy.js` | Versioned payload helpers | New child request and role/state helpers |
| `privacy-service.js` | Admin auth, Resend, receipts, expiry | Linked identities, token activation and new state machine |
| `api/privacy.js` | App Check and action dispatcher | New actions and per-action authentication |
| `firestore.rules` | Server-only privacy records | Role/relationship-based parent and child access |
| Tests | Existing privacy smoke checks | Unit, API, emulator and full onboarding E2E coverage |
| Vercel/Firebase | Production setup | New auth method, provider secrets and isolated staging config |
