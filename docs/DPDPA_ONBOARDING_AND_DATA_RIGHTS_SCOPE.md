# CLAT Prep Studio
## DPDPA Child Onboarding and Data Principal Rights — Product Scope

**Status:** Superseded implementation scope  
**Prepared:** 23 July 2026  
**Legal baseline:** Digital Personal Data Protection Act, 2023 and Digital Personal Data Protection Rules, 2025  
**Product approach:** SaralPrivacy-style, plain-English and operational  

> **Superseded:** The authoritative requirements are now in
> [`DPDPA_CONTINUOUS_COMPLIANCE_SPEC.md`](./DPDPA_CONTINUOUS_COMPLIANCE_SPEC.md). This file remains as
> background product scope only. Where the documents conflict, the continuous compliance specification
> controls.

**Implementation note:** The repository now contains the age gate, local-only child fallback, consent-state model,
Privacy Centre, rights-request intake, cloud/webhook gates, and proposed Firestore rules. Production activation of
under-18 cloud accounts still requires the approved parent-verification service configured through
`VITE_PARENT_CONSENT_ENDPOINT` and a server-side completion callback that issues `PARENT_VERIFIED`.

> This scope is an implementation aid, not a formal legal opinion. Retention grounds, the applicability of the educational-institution exemption, and production identity-verification methods should be approved by qualified Indian privacy counsel.

---

## 1. Objective

Build a defensible privacy lifecycle for CLAT Prep Studio that:

1. Determines whether a student is under 18 before account or cloud-data processing begins.
2. Obtains and records verifiable parental consent where required.
3. gives adult students and verified parents a simple Privacy Centre.
4. Operationalises Data Principal rights, including access, correction, completion, updating, erasure, consent withdrawal, grievance redressal, and nomination.
5. Propagates approved corrections and erasure across primary systems, processors, exports, and scheduled backup handling.
6. Produces an auditable record of requests and decisions without making unsupported claims of “DPDPA compliance.”

---

## 2. Legal and product principles

### 2.1 Child accounts

- A child is a person who has not completed 18 years.
- For a child, the Data Principal includes the parent or lawful guardian acting on the child's behalf.
- No student profile, OAuth exchange, cloud sync, performance analytics, or non-essential cookie/SDK processing should begin until the age route and, where applicable, parental consent route are complete.
- Processing must not be likely to cause a detrimental effect on a child's well-being.
- Targeted advertising to children is prohibited.
- Tracking or behavioural monitoring of children must be disabled unless a specific, documented exemption applies to the entity and purpose.
- CLAT Prep Studio must not rely on the educational-institution exemption without a written applicability assessment.

### 2.2 Rights

- Correction includes correcting inaccurate or misleading data.
- Completion includes supplying missing data.
- Updating includes replacing data that is no longer current.
- Erasure applies unless retention is necessary for the specified purpose or compliance with law.
- Rights requests must be authenticated, traceable, and handled through a published channel.
- Requester identity verification must be proportionate. Do not collect a government ID by default when account authentication or OTP verification is sufficient.
- A refusal or partial fulfilment must state the specific reason, retained data categories, retention basis, expected deletion date where known, and grievance route.
- Internal service target: acknowledge immediately and resolve within 30 calendar days. The published grievance response period must never exceed the applicable statutory maximum.

---

## 3. Personas and authority

| Persona | Authority |
|---|---|
| Adult student | Exercises rights over their own data |
| Child student | Can view age-appropriate explanations and initiate a request, but the verified parent completes high-impact requests |
| Verified parent or lawful guardian | Gives or withdraws consent and exercises the child's rights |
| Student who turns 18 | Re-consents or confirms preferences and takes control of their own Privacy Centre |
| Privacy operations user | Verifies, fulfils, pauses, partially fulfils, or rejects requests |
| System administrator | Maintains integrations and permissions but cannot silently close a rights case |
| Data processor | Executes correction, restriction, export, or deletion under contract/integration |
| Nominee | Exercises rights after verified death or incapacity, subject to the applicable process |

---

## 4. In-scope product surfaces

### 4.1 Age-first onboarding

1. Display a short, standalone Student Privacy Notice before collecting personal data.
2. Ask date of birth or an approved age-band question.
3. Calculate age on the server using the date and Indian Standard Time.
4. Route users:
   - **18 or older:** adult notice and purpose-specific consent.
   - **Under 18:** create only a short-lived pending reference and begin parent invitation.
5. Prevent bypass through Google OAuth, direct API calls, guest-to-cloud upgrade, or a modified client.
6. Expire and erase abandoned pending applications after the approved short retention period.

### 4.2 Parent verification and consent

1. Collect minimum parent contact information and declared relationship.
2. Send an expiring, single-use parent link or OTP.
3. Verify that the parent is an identifiable adult using an approved method.
4. Prefer an authorised token or verification result over retaining identity-document images.
5. Present a parent notice containing:
   - student data categories;
   - purposes and features enabled;
   - processors and sharing;
   - retention;
   - child-specific analytics;
   - withdrawal consequences;
   - correction, erasure, grievance, and contact routes.
6. Capture required educational purposes separately from optional parent reports, research, testimonials, and marketing.
7. Issue a downloadable consent receipt.
8. Activate cloud processing only after the backend confirms valid consent.

### 4.3 Student and Parent Privacy Centre

The Privacy Centre must contain:

- **Your data:** categories, purposes, sources, processors, and current retention status.
- **Consent and preferences:** view receipts and withdraw optional or core consent.
- **Correct or update data:** guided correction workflow.
- **Erase data / close account:** guided erasure workflow with impact preview.
- **Download/access summary:** request or generate the statutory access response.
- **Requests:** status, messages, decisions, and completion receipts.
- **Parent and student relationship:** verified parent details and change-parent safeguards.
- **Nominee:** nominate, replace, or remove a nominee when the feature is legally operational.
- **Raise a grievance:** designated privacy contact and escalation process.

For child accounts, show child-readable explanations while reserving identity, consent, erasure, and parent-relationship changes for the verified parent.

### 4.4 Privacy operations console

Provide a private, role-restricted console with:

- queue by request type, age status, due date, risk, and assignee;
- identity and authority verification status;
- data-location checklist;
- processor tasks and acknowledgements;
- legal/contractual retention holds;
- internal notes separated from requester-visible messages;
- four-eyes approval for child-account erasure and rejected requests;
- immutable event history;
- response templates;
- overdue and processor-failure alerts;
- metrics without exposing unnecessary student data.

---

## 5. Correction, completion, and updating workflow

### 5.1 Request intake

The requester selects the field, states what is wrong, supplies the requested value, and optionally attaches proportionate supporting material.

Classify fields:

| Field class | Examples | Handling |
|---|---|---|
| Self-service | Display name, parent report preference, target NLU | Apply after authenticated confirmation |
| Re-verification required | Email, mobile, date of birth, verified parent | Verify new value before replacing authoritative value |
| Historical result data | Answer, score, attempt timestamp | Investigate; never overwrite an immutable event without preserving a non-personal integrity trail |
| Derived analytics | Accuracy, weakness label, recommendation | Recalculate after source correction and explain that it is derived |
| Restricted record | Payment/tax or security record | Correct where inaccurate while preserving legally necessary audit history |

### 5.2 Processing

1. Authenticate the adult student or verified parent.
2. Validate that the submitted information is verifiably authentic.
3. Identify the authoritative source record.
4. Apply the correction transactionally where possible.
5. Propagate it to:
   - Firebase Authentication;
   - Firestore profile;
   - attempt/analytics views;
   - email or messaging provider;
   - CRM/support system;
   - payment/customer metadata where applicable;
   - authorised exports still under organisational control.
6. Recalculate derived profiles.
7. Confirm what changed, where it propagated, and any justified exception.

### 5.3 Acceptance criteria

- A requester cannot change another student's data.
- Parent authority is rechecked for a child account.
- High-risk identifiers require step-up verification.
- Previous values are not retained indefinitely merely for convenience.
- Derived analytics are recalculated after relevant source correction.
- Every target system returns a success, exception, or retry state.
- The requester receives a completion record.

---

## 6. Erasure workflow

### 6.1 Request experience

The interface must distinguish:

- **Withdraw an optional purpose**
- **Delete selected data**
- **Close account and request erasure**

Before confirmation, show:

- services that will stop;
- data categories proposed for erasure;
- categories that may need temporary or legal retention;
- effect on scores, reports, purchases, and recovery;
- a cooling-off period only if approved and capable of immediate cancellation;
- how to download an access copy first.

Do not use dark patterns, repeated warnings, or cancellation friction.

### 6.2 Decision tree

For every data category:

1. Is it still necessary for an active specified purpose?
2. Has consent for that purpose been withdrawn?
3. Is retention required by an identified law?
4. Is there a documented dispute, fraud, security, tax, or litigation hold?
5. Can the record be irreversibly anonymised instead of retained as personal data?

Outcomes:

- erase now;
- erase after a documented hold expires;
- anonymise irreversibly;
- retain a narrowly limited record with purpose, legal basis, access restriction, and review date.

“Possible future need,” “analytics,” or “backup difficulty” are not standalone retention grounds.

### 6.3 Deletion propagation

The erasure orchestrator must cover:

- Firebase Authentication identity;
- Firestore student profile and child-parent linkage;
- attempt history and free-text/support content;
- generated reports and cloud-storage files;
- email, notification, CRM, and support tools;
- marketing audiences and advertising identifiers;
- analytics user identifiers and profiles;
- processor and sub-processor copies;
- downloadable CSVs or reports that remain under organisational control;
- cached data and search indexes;
- backups through documented expiry/non-restoration controls.

Backups:

- do not silently restore erased data into production;
- maintain a suppression/tombstone key that contains no unnecessary personal data;
- re-apply erasure if a backup is restored;
- delete backup copies at the end of the defined backup cycle;
- communicate delayed backup expiry in the response where material.

### 6.4 Proof without re-creating the deleted profile

Retain a minimal case record containing:

- request ID;
- one-way or keyed reference to the former account;
- requester-authority outcome;
- systems instructed;
- completion timestamps;
- categories subject to a justified hold;
- decision and response version.

Do not retain the erased student profile inside the rights-request audit log.

### 6.5 Acceptance criteria

- Erasure is unavailable to an unverified requester.
- A child-account request requires the verified parent or valid lawful authority.
- Each system has a machine-readable completion or exception result.
- Optional consent withdrawal does not erase data required for another disclosed, valid purpose.
- Account access is disabled at the appropriate stage.
- Processor deletion is tracked to acknowledgement.
- Partial fulfilment identifies precisely what was retained and why.
- The completed case contains enough evidence to prove action without retaining the erased data.

---

## 7. Other Data Principal Rights

### 7.1 Access

Return a clear, portable summary of:

- personal data being processed;
- processing activities and purposes;
- sources, where relevant;
- Data Fiduciaries and Data Processors with whom it was shared, subject to statutory exceptions;
- retention status;
- consent records;
- automated/derived educational analytics in plain English.

Do not expose internal secrets, another person's information, or protected law-enforcement disclosures.

### 7.2 Consent withdrawal

- Make withdrawal as easy as giving consent.
- Stop the affected future processing.
- Explain service consequences before confirmation.
- Propagate withdrawal to processors and communication tools.
- Where core consent is withdrawn, offer the erasure/closure workflow.

### 7.3 Grievance redressal

- Publish the privacy contact in the notice, footer, onboarding, and Privacy Centre.
- Auto-acknowledge with request ID and target date.
- Allow supporting information and two-way secure messages.
- Give a reasoned outcome and the applicable escalation route.
- Use an internal escalation before the deadline.

### 7.4 Nomination

- Allow an authenticated adult Data Principal to nominate one or more people.
- Record scope and current status.
- Verify the nominee's identity and the triggering event before granting access.
- Do not activate nominee access merely because someone knows the account email.

---

## 8. Request state model

```text
draft
  -> submitted
  -> identity_verification_required
  -> authority_verification_required
  -> in_review
  -> awaiting_requester
  -> fulfilment_in_progress
  -> processor_action_pending
  -> partially_fulfilled | fulfilled | refused
  -> closed
```

Additional controls:

- `paused_for_legal_hold` must include an approved reason and review date.
- A case cannot be closed while a required processor task is unresolved.
- Reopening creates a new event rather than rewriting history.

---

## 9. Minimum data model

### `privacySubjects`

```text
subjectId
userId
ageStatus
dateOfBirthEncryptedOrAgeEvidence
verifiedParentId
relationshipStatus
adultTransitionDueAt
```

### `consentReceipts`

```text
consentId
subjectId
actorId
actorRole
parentAdultVerificationReference
noticeVersion
noticeHash
purposesAccepted[]
purposesDeclined[]
givenAt
withdrawnPurposes[]
withdrawnAt
source
```

### `rightsRequests`

```text
requestId
subjectReference
requesterId
requesterRole
requestType
requestedFieldsOrCategories[]
identityVerificationStatus
authorityVerificationStatus
status
submittedAt
acknowledgedAt
targetDueAt
decisionCode
retentionExceptions[]
completedAt
```

### `rightsRequestEvents`

```text
eventId
requestId
eventType
actorType
actorId
timestamp
requesterVisible
metadata
previousEventHash
```

### `processorTasks`

```text
taskId
requestId
processor
operation
targetReference
status
attemptCount
lastAttemptAt
acknowledgedAt
exception
```

Keep attachments in a separate encrypted store with strict expiry and access logging.

---

## 10. Backend and security requirements

- Enforce age and consent status in backend authorization rules.
- Do not trust React state or client-submitted consent timestamps.
- Use least-privilege roles for privacy operations.
- Separate consent and rights records from ordinary learning-progress documents.
- Encrypt sensitive verification references and attachments.
- Log all privileged reads and exports.
- Require step-up authentication for erasure, parent changes, and access downloads.
- Rate-limit and protect intake endpoints against enumeration and abuse.
- Prevent CSV export for users without a documented operational need.
- Use signed, short-lived download links.
- Contractually require processors to support correction, export, restriction, and erasure.
- Test backup restore plus re-deletion at least annually.

---

## 11. Notifications

Required templates:

1. Parent consent invitation.
2. Parent consent receipt.
3. Rights request acknowledgement.
4. More information or verification required.
5. Correction completed.
6. Erasure scheduled.
7. Erasure completed.
8. Partial fulfilment with retention explanation.
9. Refusal with reason and grievance route.
10. Request approaching internal deadline.
11. Student turning 18 and transfer-of-control process.

Do not include sensitive student data in email subject lines or notification previews.

---

## 12. Metrics and audit evidence

Track:

- requests by type and age status;
- median acknowledgement and completion time;
- overdue cases;
- partial/refusal reasons;
- processor failure and retry rate;
- corrections that required derived-data recalculation;
- erasure completion by system;
- parent-consent completion and abandonment;
- accounts transitioning at age 18.

Metrics must use aggregated or pseudonymised data wherever possible.

---

## 13. Delivery phases

### Phase 0 — Governance and data map

- Confirm legal entity and privacy contact.
- Map student data, purposes, processors, locations, and retention.
- Obtain counsel view on the educational-institution exemption.
- Approve verification providers and retention schedule.

### Phase 1 — Safe onboarding

- Age gate.
- Pending under-18 state.
- Parent invitation and adult verification.
- Parent notice and consent receipt.
- Server-side consent enforcement.
- Remove unsupported “DPDPA compliant” claims.

### Phase 2 — Core Privacy Centre

- Consent view/withdrawal.
- Self-service correction for low-risk fields.
- Guided correction for verified fields.
- Account closure and erasure intake.
- Request tracking and grievance channel.

### Phase 3 — Fulfilment operations

- Privacy operations console.
- Processor task orchestration.
- Retention holds and approvals.
- Deletion propagation and completion receipts.
- Access summary/export.

### Phase 4 — Advanced rights and assurance

- Nomination.
- Age-18 transition.
- Automated backup re-deletion controls.
- Quarterly rights drills and annual processor test.
- Child-impact and privacy-control review.

---

## 14. Definition of done

The capability is ready for production only when:

1. An under-18 account cannot reach cloud processing without backend-confirmed parental consent.
2. The parent is verified as an identifiable adult using the approved method.
3. Consent evidence includes actor, purposes, notice version, verification reference, and time.
4. An adult student or verified parent can submit and track correction and erasure requests.
5. Corrections propagate and derived educational analytics are recalculated.
6. Erasure covers all mapped systems and processors or records a specific justified exception.
7. Backup restoration cannot permanently resurrect erased data.
8. Request events, decisions, and communications are auditable.
9. Roles prevent ordinary admins from browsing or exporting all student data.
10. Privacy notices, help text, and completion messages have legal and plain-language review.
11. Mobile, accessibility, security, and end-to-end rights-request tests pass.
12. No interface makes an absolute or unsupported compliance claim.
