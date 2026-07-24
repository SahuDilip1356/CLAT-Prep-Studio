# CLAT Prep Studio
## DPDPA Continuous Compliance Specification

**Document ID:** CPS-PRIV-SPEC-001  
**Version:** 1.0.0  
**Status:** Authoritative implementation specification  
**Owner:** Privacy and Product  
**Approved legal baseline date:** 23 July 2026  
**Next mandatory review:** Before production launch and at least quarterly thereafter  
**Supersedes:** `DPDPA_ONBOARDING_AND_DATA_RIGHTS_SCOPE.md` where the documents conflict  

> This specification is designed to prevent, detect, contain and evidence DPDPA non-conformity. It cannot
> guarantee permanent legal compliance: laws, government orders, product purposes, vendors, threats and
> interpretations can change. No person or interface may describe CLAT Prep Studio as “DPDPA compliant,”
> “certified compliant” or “guaranteed compliant” solely because this specification exists or is implemented.

---

## 1. Purpose

This specification defines mandatory product, engineering, security, legal-operations and vendor controls for
processing student and parent personal data in CLAT Prep Studio.

It converts the Digital Personal Data Protection Act, 2023 and the Digital Personal Data Protection Rules,
2025 into testable requirements for:

- age assurance;
- adult student consent;
- verifiable parental consent;
- Google and Firebase authentication;
- child-safe educational analytics;
- notices and consent evidence;
- Data Principal rights;
- retention and erasure;
- processor governance;
- security and breach response;
- autonomous workflow agents;
- audit evidence;
- continuous legal and technical monitoring.

The specification applies to production, staging, support, analytics, exports, backups, mobile applications,
web applications, administrative tools, processors, subprocessors and manually maintained records.

---

## 2. Normative language

- **MUST / MUST NOT / SHALL / SHALL NOT:** mandatory release-blocking requirement.
- **SHOULD / SHOULD NOT:** expected control; deviation requires documented risk acceptance.
- **MAY:** optional control.
- **Privacy Owner:** named person accountable for privacy operations.
- **Legal Approver:** qualified counsel or authorised legal reviewer.
- **Trusted Backend:** server environment controlled by CLAT Prep Studio that verifies authentication tokens
  and cannot be modified by the browser or mobile client.
- **Consent Ticket:** short-lived, single-use server-generated credential linking a verified consent event to
  an account activation.
- **Child:** an individual who has not completed 18 years.
- **Data Principal:** the individual to whom data relates; for a child, includes the parent or lawful guardian
  acting on the child's behalf.

An exception to a MUST is valid only when:

1. the exact requirement is identified;
2. the Privacy Owner and Security Owner approve it;
3. the Legal Approver confirms the legal position where relevant;
4. compensating controls and an expiry date are recorded; and
5. production telemetry can detect use of the exception.

---

## 3. Legal baseline and commencement

### 3.1 Authoritative sources

Engineering and legal reviews SHALL use primary sources:

- [Digital Personal Data Protection Act, 2023 — India Code](https://www.indiacode.nic.in/handle/123456789/22037)
- [Digital Personal Data Protection Rules, 2025 — MeitY](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf)
- [DPDP Act commencement notification, 13 November 2025](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf)
- [MeitY DPDP Rules and corrigendum page](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa)

### 3.2 Current commencement position

As at the baseline date, sections 3–17 of the Act and Rules 3, 5–16, 22 and 23 are scheduled to commence
18 months after 13 November 2025. The Compliance Monitor SHALL verify commencement and any amending
notification before every release and at least monthly.

### 3.3 Legal change control

The Compliance Monitor SHALL:

- check MeitY and India Code at least monthly;
- check before every production release;
- record the source URL, publication date, reviewer and result;
- open a blocking change ticket for any new rule, corrigendum, order or relevant Board direction;
- map the change to controls, notices, vendors, retention and code;
- prevent release when a legally required change is unresolved.

No AI-generated legal summary may replace review of the primary notification.

---

## 4. Compliance invariants

The following conditions SHALL always hold in production:

1. No student account or identifiable learning record exists without a trusted consent state.
2. A browser, mobile client or user-editable database field cannot grant a trusted consent state.
3. Google Sign-In is never treated as proof of age, adulthood, parenthood or guardianship.
4. A child account cannot activate before verified parental consent unless a documented statutory exemption
   applies to that exact processing purpose.
5. Parent email control alone is never treated as verifiable parental consent.
6. Optional purposes are off by default and do not block the educational service.
7. Child-targeted advertising is disabled.
8. Child data is not sold, brokered or used for unrelated commercial profiling.
9. Consent cannot authorise processing likely to harm a child's well-being.
10. Every personal-data field has an approved purpose, owner, system location, processor and deletion rule.
11. Withdrawal, correction and erasure propagate to all in-scope systems and processors.
12. A rights case cannot close while a required fulfilment task is unresolved.
13. A legal-retention exception cannot be invented by an autonomous agent.
14. Backups cannot permanently reintroduce erased data.
15. Production access is least-privilege, logged and periodically reviewed.
16. A personal-data breach triggers the approved notification workflow without delay.
17. No new SDK, webhook, export, AI model or vendor receives personal data without privacy review.
18. Failure of a verification, consent, policy or audit service causes a fail-closed outcome.

---

## 5. Data classification and inventory

### 5.1 Required register

Before production launch, the Privacy Owner SHALL approve a Record of Processing Activities containing,
for every processing activity:

```text
activity_id
business_owner
data_principal_type
data_categories
source
purpose
service_or_feature_enabled
consent_or_permitted_ground
child_processing_status
systems
processors_and_subprocessors
transfer_locations
retention_rule
deletion_method
rights_connectors
security_classification
last_reviewed_at
```

### 5.2 Data classes

| Class | Examples | Minimum handling |
|---|---|---|
| Restricted identity | verification tokens, government-ID exception documents | encrypted, isolated, minimal access |
| Child account | student UID, name, email, parent link | trusted consent required |
| Educational behaviour | answers, time spent, attempts, weak-topic analysis | child-purpose review required |
| Financial | invoices, transactions, payment references | separate retention mapping |
| Communications | support, grievance and parent emails | role-restricted and retained by purpose |
| Consent evidence | notice hash, purposes, verification reference | immutable, segregated |
| Security logs | access, authentication, export and incident logs | tamper-evident and time-limited |
| Anonymous content | question bank and non-identifiable aggregate statistics | re-identification prohibited |

### 5.3 Data minimisation

- Exact DOB SHALL NOT be collected by default.
- The default age field SHALL be a required, non-preselected age-band declaration.
- Government-ID images SHALL NOT be collected unless the Legal Approver documents necessity.
- Full Aadhaar numbers or Aadhaar images SHALL NOT be retained for this workflow.
- Free-text fields SHALL be avoided where structured choices meet the purpose.
- Analytics payloads SHALL exclude name, email, parent email and verification references.
- Test and staging environments SHALL use synthetic data.

---

## 6. Authoritative identity and consent architecture

### 6.1 Trust boundary

The following are untrusted:

- React state;
- local storage;
- session storage, except as an opaque navigation aid;
- client timestamps;
- client-supplied `privacyStatus`;
- client-supplied roles;
- email-address string comparisons;
- query parameters not exchanged for a server-validated token.

Only the Trusted Backend may:

- verify Firebase ID tokens;
- verify consent tickets;
- set Firebase custom claims;
- create authoritative consent receipts;
- activate or suspend cloud processing;
- approve processor fulfilment;
- write legal-retention decisions;
- grant privacy-administration roles.

### 6.2 Trusted Firebase claims

The Trusted Backend SHALL issue:

```json
{
  "privacyStatus": "ADULT_CONSENTED | PARENT_VERIFIED | SUSPENDED | WITHDRAWN",
  "subjectType": "ADULT | CHILD",
  "consentId": "opaque-reference",
  "privacyPolicyVersion": "version"
}
```

Claims SHALL contain no DOB, parent email, ID number or sensitive verification detail.

Firestore, Storage, Functions and API rules SHALL use validated token claims. Rules SHALL NOT infer trusted
consent from a document the user can create or modify.

### 6.3 Required fail-closed behaviour

If a claim is missing, expired, inconsistent or unrecognised:

- account/profile writes SHALL be denied;
- learning-data cloud writes SHALL be denied;
- external analytics and webhooks SHALL be denied;
- the user MAY access anonymous, session-only practice;
- a privacy-safe explanation SHALL be displayed.

---

## 7. Age-assurance specification

### 7.1 Required age gate

Before Google Sign-In or collection of student identity, present:

> Are you 18 years or older?

Options:

- Yes, I am 18 or older.
- No, I am under 18.

Requirements:

- neither option is preselected;
- both options have equal visual prominence;
- the answer is processed in memory until the applicable consent event;
- the interface explains why the answer is needed;
- refusal or uncertainty routes to child-safe session-only use;
- changing the answer after a failed child route triggers risk review;
- age-gate bypass attempts are security events.

### 7.2 Adult self-declaration

An affirmative answer creates only:

```text
ageAssurance = ADULT_SELF_DECLARED
```

It SHALL NOT create `ADULT_VERIFIED`.

The approved Age Assurance Policy SHALL define risk signals that require additional verification, including:

- repeated age answer changes;
- known school-managed or supervised-account context;
- support communications showing the user is a child;
- contradictory parent communication;
- suspected circumvention;
- any future government or Board direction.

No automated model may infer age from face, voice, name, writing style or photograph without a separately
approved legal, child-safety and biometric assessment.

### 7.3 Child declaration

An under-18 answer SHALL:

- prevent student Google Sign-In;
- prevent student identity collection;
- request only a parent/lawful guardian communication address;
- create only the minimal pending-consent record;
- keep learning practice session-only and non-identifiable.

---

## 8. Adult onboarding state machine

```text
AGE_UNDECLARED
  -> ADULT_SELF_DECLARED
  -> NOTICE_PRESENTED
  -> ADULT_CONSENT_CAPTURED
  -> GOOGLE_AUTHENTICATED
  -> BACKEND_TOKEN_VERIFIED
  -> ADULT_CONSENTED
  -> ACTIVE
```

### 8.1 Mandatory sequence

1. Age band is selected.
2. A standalone notice is presented.
3. Required educational purposes are explained.
4. Optional purposes are separately selectable and off by default.
5. The student performs an affirmative consent action.
6. Google Sign-In may begin.
7. Backend verifies the Google/Firebase token.
8. Backend creates an immutable consent receipt.
9. Backend issues `ADULT_CONSENTED`.
10. Cloud processing may begin.

If any step fails, the account SHALL remain inactive and no student identity SHALL be written to application
databases.

---

## 9. Child and parent onboarding state machine

```text
AGE_UNDECLARED
  -> CHILD_DECLARED
  -> PARENT_CONTACT_SUBMITTED
  -> INVITATION_SENT
  -> PARENT_EMAIL_AUTHENTICATED
  -> PARENT_ADULT_VERIFIED
  -> PARENT_RELATIONSHIP_DECLARED
  -> PARENT_NOTICE_PRESENTED
  -> PARENT_CONSENT_CAPTURED
  -> CONSENT_TICKET_ISSUED
  -> STUDENT_GOOGLE_AUTHENTICATED
  -> CONSENT_TICKET_BOUND
  -> PARENT_VERIFIED
  -> ACTIVE
```

### 9.1 Pre-consent storage

Before parent consent, only the following MAY be persisted:

```text
consent_request_id
age_band = CHILD
parent_contact
invitation_token_hash
created_at
expires_at
delivery_status
abuse_and_security_events
```

The record SHALL NOT contain:

- student name;
- student email;
- student Google UID;
- exact DOB;
- answers or scores;
- analytics identifiers;
- target NLU or exam year;
- advertising identifiers.

Pending requests SHALL become unusable automatically after 48 hours. The scheduled cleanup SHALL run every
15 minutes and erase the parent-contact request after expiry. If a consent receipt exists but no student account
was activated, it SHALL be stripped of the parent UID and request link before the pending request is deleted.
No student account or student ID exists at this stage.

### 9.2 Invitation

The invitation SHALL:

- be sent through an approved provider under contract;
- contain no sensitive information in the subject or preview;
- explain why the parent was contacted;
- include “not my request” and privacy-contact routes;
- use a random, single-use, expiring token;
- resist link-scanner consumption;
- be rate-limited;
- not disclose student identity before consent.

### 9.3 Parent authentication and verification

Email or Google authentication MAY prove account control but SHALL NOT by itself prove adulthood.

Before parent consent is accepted, the system SHALL:

- authenticate the parent;
- verify adulthood through reliable identity and age details or an approved authorised token/provider;
- record the provider and opaque transaction reference;
- obtain a parent/lawful guardian declaration;
- flag conflicting or disputed authority for human review.

The platform SHOULD store the verification result rather than identity attributes or documents.

### 9.4 Parent notice and consent

The parent notice SHALL identify, at minimum:

- the legal entity and privacy contact;
- itemised student data categories;
- each purpose and feature enabled;
- educational performance analysis;
- processors and material sharing;
- transfer information;
- retention and deletion triggers;
- children's tracking position;
- withdrawal consequences;
- access, correction, erasure, grievance and nomination routes;
- the means to complain to the Data Protection Board when legally available;
- a direct link or equivalent means to withdraw consent and exercise rights.

The notice SHALL be understandable independently of other material, use clear and plain language, and be
available in English and any additional Eighth Schedule language offered by the product. Translation changes
SHALL preserve the approved purpose and legal meaning and SHALL be versioned.

Consent SHALL be:

- purpose-specific;
- affirmative;
- unbundled from terms;
- free of preselected optional purposes;
- recorded against the exact notice version and hash;
- withdrawable with comparable ease.

### 9.5 Consent ticket and Google binding

After verified parent consent:

1. Backend creates the consent receipt.
2. Backend issues a single-use consent ticket.
3. Student initiates Google Sign-In.
4. Backend verifies the Firebase ID token.
5. Backend atomically binds the Firebase UID to the consent ticket and receipt.
6. Backend invalidates the ticket.
7. Backend issues `PARENT_VERIFIED`.
8. Cloud processing may begin.

A ticket SHALL be short-lived, random, rate-limited and unusable after binding. Cross-device activation MAY
use a short code if it has equivalent controls and does not reveal personal data.

---

## 10. Consent ledger

### 10.1 Consent receipt

Every authoritative consent event SHALL record:

```text
consent_id
subject_reference
actor_reference
actor_role
subject_type
age_assurance_method
adult_verification_provider
adult_verification_reference
relationship_declaration
notice_version
notice_hash
purposes_accepted
purposes_declined
source_channel
given_at_server_time
withdrawal_events
superseded_by
```

Receipts SHALL be append-only. Corrections create a new event; they do not rewrite history.

### 10.2 Purpose catalogue

Every consent purpose SHALL have:

```text
purpose_id
plain_language_description
data_categories
service_enabled
required_or_optional
processors
retention_rule
child_eligibility
legal_review_version
```

Code SHALL reference purpose IDs, not hard-coded prose.

### 10.3 Withdrawal

Withdrawal SHALL:

- be available from the Privacy Centre;
- require proportionate authentication;
- stop future processing for the purpose;
- update trusted claims where necessary;
- dispatch processor tasks;
- trigger erasure when no valid purpose or legal retention remains;
- issue a receipt;
- preserve evidence without preserving unnecessary withdrawn-purpose data.

---

## 11. Child-safe processing

### 11.1 Absolute controls

The platform SHALL NOT:

- process child data in a way likely to harm well-being;
- target advertisements to children;
- sell or broker child data;
- use child data to advertise unrelated goods or services;
- publish identifiable results, rankings or testimonials without separate valid permission;
- use manipulative streaks, shame, fear or coercive notifications;
- allow public discovery of child accounts;
- expose child performance to unauthorised teachers, parents or peers.

### 11.2 Tracking and behavioural monitoring

The Privacy Owner and Legal Approver SHALL maintain a purpose-by-purpose Child Processing Register for:

- attempt history;
- time spent;
- topic accuracy;
- weakness analysis;
- recommendations;
- engagement and streaks;
- AI tutoring;
- proctoring;
- support and moderation.

No team may rely on the educational-institution exemption until counsel approves:

1. the operating entity as an educational institution; and
2. each processing purpose as restricted to educational activities or child safety.

The exemption decision SHALL be renewed when the entity, feature, purpose, vendor or data categories change.

Parental consent SHALL NOT be treated as permission to override the detrimental-effect prohibition.

### 11.3 Advertising and SDK policy

- Advertising SDKs SHALL be disabled for child and unknown-age sessions.
- Cross-context behavioural advertising SHALL be disabled.
- Non-essential analytics SHALL be disabled before trusted consent.
- Analytics SHALL use purpose-limited, pseudonymous identifiers.
- Session replay, heatmaps and keystroke capture require prior privacy and child-safety approval.
- No webhook may receive child profile or performance data unless listed in the processing register and
  protected by contract, purpose controls and deletion integration.

---

## 12. Data Principal Rights

### 12.1 Supported rights

The Privacy Centre SHALL support:

- access information;
- correction of inaccurate or misleading data;
- completion of incomplete data;
- updating outdated data;
- erasure;
- consent withdrawal;
- grievance redressal;
- nomination.

For a child, a verified parent or lawful guardian acts for the child. Child-readable explanations SHOULD be
available. On turning 18, control SHALL transfer through the transition process in section 13.

### 12.2 Request controls

Every request SHALL:

- receive a unique ID and immediate acknowledgement;
- identify the requester and authority;
- use server time;
- have a target date and escalation timers;
- create immutable events;
- list every required system and processor task;
- prevent closure with unresolved required tasks;
- provide a reasoned result and grievance route.

The internal completion target is 30 calendar days. The published grievance period SHALL be reasonable and
SHALL NOT exceed the applicable statutory maximum.

### 12.3 Access

The response SHALL include:

- a summary of personal data being processed;
- processing activities and purposes;
- identities of applicable Data Fiduciaries and Data Processors with whom data was shared, subject to legal
  exceptions;
- retention status;
- consent history;
- plain-English description of derived educational analytics.

Exports SHALL exclude another person's data, security secrets and legally protected disclosures.

### 12.4 Correction, completion and updating

| Field class | Automated action | Approval |
|---|---|---|
| display/preference | authenticated update | none |
| email/mobile | verify new value and notify old channel | risk-based |
| age status/parent | step-up verification | privacy review |
| score/source event | investigate source and preserve integrity event | academic/privacy review |
| derived analytics | recalculate after source correction | none after valid source update |
| payment/legal record | correct inaccuracy, preserve required evidence | finance/legal review |

Corrections SHALL propagate to every mapped system. The case SHALL record `SUCCESS`, `RETRY_REQUIRED`,
`MANUAL_REVIEW` or `NOT_APPLICABLE` per target.

### 12.5 Erasure

For each data category, the policy engine SHALL decide only from an approved retention rule:

```text
ERASE_NOW
IRREVERSIBLY_ANONYMISE
RETAIN_UNTIL_APPROVED_DATE
HUMAN_LEGAL_REVIEW
```

“Possible future use,” “analytics value” and “backup difficulty” are not valid retention reasons.

Erasure SHALL cover:

- Firebase Authentication;
- Firestore;
- Storage;
- reports;
- support and CRM;
- email and marketing;
- analytics identifiers;
- webhooks and integrations;
- processors and subprocessors;
- caches and search indexes;
- controlled exports;
- backups through expiry and non-restoration controls.

A partial erasure or refusal requires Privacy Owner and Legal Approver approval, a specific basis, affected
categories, access restriction, review date and requester-visible explanation.

### 12.6 Backup erasure

- Restored backups SHALL pass through a re-erasure suppression process before production use.
- A tombstone SHALL contain only a keyed/one-way former-account reference and deletion instruction.
- Backup expiry SHALL follow the approved schedule.
- The completed request SHALL explain any material delayed backup expiry.

---

## 13. Age-18 transition

Where a reliable transition date is known, the system SHALL notify the parent and student before transition.
Where only age band is held, the system SHALL periodically request age-status reconfirmation without
collecting exact DOB unless necessary.

Transition SHALL:

1. suspend parent authority for new actions;
2. authenticate the now-adult student;
3. present the current adult notice;
4. obtain the student's consent and preferences;
5. issue `ADULT_CONSENTED`;
6. allow the student to retain, change or remove parent-report access;
7. preserve the prior parental consent as historical evidence.

No parent SHALL retain automatic access after a valid adult transition without the adult student's choice or
another lawful basis.

---

## 14. Retention policy

### 14.1 Required rule

No production data store may exist without an approved retention entry:

```text
data_category
purpose
trigger
duration
legal_requirement_if_any
deletion_method
processor_propagation
backup_expiry
owner
review_date
```

### 14.2 Default triggers

| Record | Default trigger |
|---|---|
| pending parent invitation | expiry, refusal or “not my request” |
| student profile | withdrawal, account closure or purpose end |
| learning history | purpose end, withdrawal or valid erasure request |
| optional marketing | immediate withdrawal |
| verification document exception | immediately after verification where possible |
| verification result | approved evidence period |
| rights attachment | case completion plus approved short period |
| processor task | completion plus audit-evidence period |
| security log | approved security/rule period |
| payment/tax record | applicable legal period |

Automated retention jobs SHALL run at least daily, produce signed results and alert on failure.

---

## 15. Processor and transfer governance

No processor or subprocessor may receive personal data until the Vendor Register records:

- legal entity and service;
- data and purposes;
- processing location;
- subprocessors;
- security review;
- breach notification commitment;
- rights fulfilment capability;
- erasure and return terms;
- retention;
- transfer assessment;
- contract owner and renewal date.

The Data Fiduciary remains accountable for processor activity.

The Compliance Monitor SHALL track Central Government transfer restrictions. The system SHALL be capable of
blocking a prohibited transfer by region, processor or data category.

---

## 16. Security controls

### 16.1 Access

- Roles SHALL be issued through trusted server claims.
- Frontend email comparison SHALL NOT grant administration access.
- Privacy operations and teaching access SHALL be separate roles.
- Bulk student export SHALL require explicit role, reason and audit event.
- Privileged access SHALL use multi-factor authentication.
- Access reviews SHALL occur at least quarterly.
- Departed or transferred staff SHALL lose access promptly.

### 16.2 Data protection

- Restricted data SHALL be encrypted in transit and at rest.
- Verification references and attachments SHALL be isolated from learning data.
- Secrets SHALL use a managed secret store.
- Signed URLs SHALL be short-lived.
- Logs SHALL be tamper-evident.
- Production data SHALL NOT appear in developer logs or error trackers.
- Mobile and web clients SHALL use supported dependencies and security updates.

### 16.3 Security testing

Release tests SHALL include:

- modified-client attempt to self-grant consent;
- direct API bypass;
- cross-account read/write;
- parent-ticket replay;
- invitation brute force;
- expired-token use;
- admin privilege escalation;
- bulk export attempt;
- erased-account backup restore;
- analytics/webhook emission before consent;
- child account targeted-ad activation attempt.

Critical or high findings block release.

---

## 17. Breach response

The incident system SHALL:

1. accept automated and human reports;
2. preserve evidence securely;
3. identify affected Data Principals, including parent contact for child accounts;
4. assess nature, extent, time, location, consequences and mitigation;
5. notify affected Data Principals without delay as required;
6. support notification to the Board without delay;
7. support the detailed update within 72 hours of awareness or approved extension;
8. record communications and remedial action;
9. trigger processor and subprocessor investigation;
10. complete lessons learned and recurrence prevention.

Templates SHALL use plain language and provide a staffed privacy/security contact.

---

## 18. Autonomous compliance agents

### 18.1 Permitted agents

| Agent | Autonomous actions |
|---|---|
| Consent Orchestrator | state transitions, tickets, receipts, expiry |
| Communication Agent | invitations, reminders, acknowledgements, receipts |
| Verification Adapter | call approved provider and store result reference |
| Rights Intake Agent | create, classify and route requests |
| Correction Agent | low-risk corrections and connector propagation |
| Erasure Orchestrator | dispatch approved deletion tasks and verify results |
| Processor Agent | connector retries and acknowledgement collection |
| Retention Agent | execute approved deletion rules |
| SLA Agent | timers, reminders and escalation |
| Audit Agent | event integrity, evidence packages and anomaly alerts |
| Compliance Monitor | primary-source checks and change tickets |

### 18.2 Prohibited autonomous decisions

An autonomous or AI agent SHALL NOT:

- invent or approve a legal-retention basis;
- refuse or partially fulfil erasure;
- determine disputed guardianship;
- declare a government ID authentic without an approved verification service;
- infer age from biometric or behavioural characteristics;
- broaden a processing purpose;
- approve a new vendor or transfer;
- close a breach incident;
- waive a failed release gate;
- make a public compliance claim.

These actions require recorded human approval.

### 18.3 Agent security

- Agents SHALL use least-privilege service identities.
- Every action SHALL be idempotent and auditable.
- Destructive jobs SHALL support dry-run and target validation.
- A failed task SHALL retry according to policy and then escalate.
- Agents SHALL not place personal data in prompts unless the specific processing is approved.
- Agent output SHALL not be the sole evidence of fulfilment; connector acknowledgements are required.

---

## 19. Evidence and audit

The Audit Agent SHALL maintain:

- notice and purpose versions;
- consent receipts;
- parent-verification references;
- trusted-claim issuance events;
- rights cases and processor acknowledgements;
- retention job results;
- access and export logs;
- vendor reviews and contracts;
- security tests;
- breach exercises and incidents;
- legal-change reviews;
- exemption decisions;
- child-impact reviews;
- release-gate approvals.

Evidence SHALL be tamper-evident, access-controlled and retained according to an approved schedule.

At least quarterly, the organisation SHALL perform:

- one child signup test;
- one adult signup test;
- one withdrawal test;
- one correction test;
- one complete erasure drill including a processor;
- one restored-backup re-erasure test on the approved schedule;
- one access review;
- one legal-source review;
- one child-well-being/analytics review.

---

## 20. Release and change gates

### 20.1 Privacy change triggers

Privacy review is mandatory for:

- new personal-data field;
- new purpose;
- new SDK, webhook or processor;
- new AI or analytics feature;
- new export;
- new child interaction;
- changed notice;
- changed retention;
- changed country/region;
- changed authentication;
- changed parent access;
- changed educational-institution exemption reliance.

### 20.2 Production release gate

A release SHALL be blocked unless:

- data inventory is current;
- purposes and notices are versioned;
- all trusted-backend tests pass;
- Firestore/Storage/API rules pass emulator tests;
- pre-consent analytics and webhooks are absent;
- parent verification works end-to-end;
- consent tickets are single-use;
- rights connectors are operational;
- retention jobs are healthy;
- processor contracts are active;
- child-targeted advertising is disabled;
- security findings are resolved;
- monitoring and rollback exist;
- legal-source review is current;
- Privacy Owner and Security Owner approve;
- Legal Approver approves any exemption or legal-retention dependency.

### 20.3 Emergency release

An emergency security fix MAY use expedited approval but SHALL NOT weaken consent, child protection, access,
retention or rights controls. Retrospective review must occur within two business days.

---

## 21. Required automated acceptance tests

### 21.1 Age and consent

- [ ] Neither age option is preselected.
- [ ] Unknown age cannot initiate Google Sign-In.
- [ ] Adult selection cannot write identity before adult consent.
- [ ] Child selection cannot initiate student Google Sign-In.
- [ ] Parent email control without adult verification cannot activate a child.
- [ ] Client-written `PARENT_VERIFIED` is rejected.
- [ ] Replayed or expired consent ticket is rejected.
- [ ] Optional consent is off by default.
- [ ] Consent withdrawal blocks the affected processing.

### 21.2 Data leakage

- [ ] No student data reaches Zapier before trusted consent.
- [ ] No child profile reaches advertising systems.
- [ ] No personal data appears in unauthenticated logs.
- [ ] Another student cannot read or change a record.
- [ ] Teacher access is limited to assigned students and fields.
- [ ] Bulk export requires approved role and creates an event.

### 21.3 Rights

- [ ] Adult student can access their request history.
- [ ] Verified parent can act for the child.
- [ ] Unverified adult cannot act for the child.
- [ ] Email correction requires new-email verification.
- [ ] Source correction recalculates derived analytics.
- [ ] Erasure dispatches every mapped connector.
- [ ] Case cannot close with pending connector.
- [ ] Partial erasure requires recorded approval and explanation.
- [ ] Restored backup does not resurrect erased data.

### 21.4 Failure modes

- [ ] Verification provider outage fails closed.
- [ ] Email failure does not activate account.
- [ ] Consent-ledger failure does not activate account.
- [ ] Token-claim issuance failure does not permit cloud writes.
- [ ] Processor deletion failure escalates.
- [ ] Retention-job failure alerts the Privacy Owner.

---

## 22. Current implementation status and release blockers

Implemented in the repository on 23 July 2026:

1. age-band question replaces exact DOB;
2. pre-consent child collection is limited to parent email and opaque security/workflow metadata;
3. pre-consent practice progress is memory-only and is not stored in browser persistence;
4. parent invitation, authentication, adult-verification callback, consent receipt and one-time activation
   functions exist;
5. adult and child privacy status is issued only as a backend Firebase custom claim;
6. Firestore and Storage rules fail closed and do not trust progress fields;
7. frontend email-address admin authorisation is replaced by the `privacyAdmin` server claim;
8. verified rights intake, child guardian approval, access, basic correction, withdrawal, Firebase erasure
   and scheduled retry functions exist;
9. expired invitations, activation codes and rate-limit records have scheduled cleanup;
10. the compliance build and deployment runbook are present.

The following remain production release blockers:

1. A Rule 10-capable identity/age provider or authorised-token route is not selected, contracted, configured
   or tested. The generic adapter deliberately fails closed.
2. The operator legal name, monitored privacy/grievance contact and final legally approved notice are not
   configured.
3. App Check, transactional email domain/secrets and Firebase Function parameters are not configured in a
   verified production project.
4. Rights connectors do not yet cover every actual processor, support system, analytics destination,
   controlled export and backup. The implemented erasure covers Firebase Authentication, the user Firestore
   subtree and linked parent workflow.
5. Backup non-restoration/tombstone controls are not implemented or drilled.
6. Correction recalculation for derived scores and all external replicas is incomplete.
7. Grievance and nomination are routed for human review, but the staffed privacy queue, escalation alerts and
   evidence repository are not connected.
8. Formal processor contracts, subprocessor/transfer register, approved retention register and child
   processing impact review are not represented in the repository.
9. Breach detection and the notification workflow, including the applicable update deadline, are not
   implemented and drilled.
10. Educational-institution exemption applicability is not legally approved and no exemption is relied on.
11. Emulator/integration tests for claims, rules, invitation abuse, adult-provider callbacks, rights retries
   and erasure have not yet been added.
12. Risk-based age-assurance escalation signals and the age-18 transfer-of-control journey are specified but
   not yet implemented.

The application SHALL NOT process production student data under a claim of compliance until all applicable
release blockers are closed.

---

## 23. Implementation order

### Milestone A — Trust boundary

1. Trusted backend.
2. Firebase ID-token verification.
3. Custom claims.
4. Server-enforced Firestore and Storage rules.
5. Removal of frontend admin authorisation.

### Milestone B — Minimal onboarding

1. Age-band question.
2. Adult notice and consent.
3. Minimal child invitation record.
4. Parent email delivery.
5. Adult-verification adapter.
6. Parent consent ledger.
7. Consent ticket and Google binding.

### Milestone C — Child-safe learning

1. Child Processing Register.
2. Disable ad and non-essential analytics SDKs.
3. Purpose-limited educational analytics.
4. Parent access boundaries.
5. Age-18 transition.

### Milestone D — Rights and lifecycle

1. Access export.
2. Correction connectors.
3. Withdrawal.
4. Erasure orchestration.
5. Processor acknowledgements.
6. Retention and backup controls.
7. Nomination and grievance.

### Milestone E — Operational assurance

1. Compliance agents.
2. Breach workflow.
3. Legal change monitoring.
4. Quarterly drills.
5. Independent privacy and security review.

---

## 24. Final production definition of done

Production student-data processing is approved only when:

1. all applicable MUST requirements are implemented;
2. all automated acceptance tests pass;
3. all known repository blockers are closed or have valid time-limited exceptions;
4. an end-to-end child signup proves that no student identity is processed before verified parent consent;
5. an end-to-end adult signup proves notice, consent, authentication and evidence;
6. an erasure drill completes across Firebase and at least one external processor;
7. a backup-restore drill preserves prior erasure;
8. the Privacy Owner, Security Owner and Legal Approver sign the release record;
9. processor contracts and transfer register are current;
10. notices and privacy contact are published;
11. breach contacts and escalation are staffed;
12. monitoring can detect consent bypass, unexpected exports, processor failure and retention failure;
13. no public interface makes an unsupported compliance claim.

Implementation of this specification creates a controlled compliance system. Continued conformity depends on
executing the monitoring, review, audit, vendor and legal-change processes defined above.

---

## 25. Legal traceability matrix

| Legal obligation | Primary SPEC controls | Required evidence |
|---|---|---|
| Grounds for processing | Sections 5, 10 and 15 | processing register, purpose catalogue |
| Notice | Sections 8.1, 9.4 and 10 | notice version/hash, delivery event |
| Valid consent and withdrawal | Sections 8, 9 and 10 | consent and withdrawal receipts |
| Data Fiduciary accountability | Sections 15, 16, 18 and 19 | contracts, logs, approvals |
| Accuracy where used for decisions/disclosure | Sections 12.4 and 18 | correction and recalculation events |
| Technical and organisational measures | Sections 6, 16 and 20 | architecture and test results |
| Reasonable security safeguards | Section 16 | access reviews, security tests, monitoring |
| Breach notifications | Section 17 | incident timeline and notification evidence |
| Erasure after withdrawal/purpose end | Sections 10.3, 12.5 and 14 | erasure tasks and acknowledgements |
| Privacy contact and grievances | Sections 9.4 and 12 | published contact and case records |
| Verifiable parental consent | Sections 7 and 9 | adult verification and consent receipt |
| No detrimental child processing | Section 11 | child-impact and purpose review |
| Child tracking/advertising restrictions | Section 11 | SDK configuration and exemption decision |
| Access right | Section 12.3 | access response package |
| Correction, completion and updating | Section 12.4 | connector results and completion receipt |
| Erasure right | Sections 12.5–12.6 | deletion evidence and retention exception |
| Nomination | Section 12.1 | nomination and triggering-event verification |
| Grievance response period | Section 12.2 | timers, escalations and response |
| Transfer restrictions | Section 15 | transfer register and government-order review |
| Rule 6 security details | Section 16 | encryption, access, logging, backup evidence |
| Rule 7 breach detail and 72-hour update | Section 17 | notification package |
| Rule 10 parental due diligence | Section 9.3 | verification provider reference |
| Rule 12 exemption controls | Section 11.2 | written legal approval by purpose |
| Rule 14 rights publication | Section 12 | Privacy Centre and identifiers |

The Privacy Owner SHALL update this matrix when a primary-source change or new processing activity affects
the mapping.
