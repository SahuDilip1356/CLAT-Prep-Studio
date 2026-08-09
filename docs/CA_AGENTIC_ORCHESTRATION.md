# CLAT Current Affairs Agentic Orchestration

## Daily execution

Daily orchestration has two independently scheduled pipelines:

1. The production Vercel cron calls `/api/ca-daily-cron` at `00:30 UTC`, which is
   6:00 AM Asia/Kolkata. It publishes validated dossiers and run records to Firestore.
2. The Codex automation `CLAT Daily CA Orchestrator` runs every day at 6:00 AM
   Asia/Kolkata against the saved CLAT Prep Studio project. It maintains the repository
   catalogue, derived assets, validation results, and dated JSON audit log.

Both pipelines use the same publication gates below. A completed Firestore run is
idempotent by date, while the repository automation updates canonical dossiers instead
of creating duplicates.

The automation:

1. Searches the previous 30 hours of primary and trusted secondary sources.
2. Clusters duplicate reports and compares candidates with the existing catalogue.
3. Applies the 100-point CLAT Issue Dossier filter.
4. Publishes only candidates scoring at least 65 that pass source and content validation.
5. Updates existing or continuing issues instead of creating duplicate dossiers.
   Repository dossiers can declare `featuredMonths` and `featuredPriority` so a
   material update appears in its event month while retaining one canonical dossier,
   one bookmark key, and one progress record.
6. Rebuilds the knowledge graph and derived question/Q-card data.
7. Runs the CA tests and production build.
8. Writes a run record to `CA_Agent_Logs`, including no-op and failed runs.
9. Sends the run summary through the Codex automation notification.

The local automation does not commit, push, deploy, or send external messages.

## Publication gates

- Total CLAT score of 65 or higher.
- At least two trusted sources.
- At least one official primary source.
- No unresolved source contradiction.
- No placeholder or generic template content.
- Complete Issue Dossier, One-Pager and Q-Card sections.
- CLAT questions answerable from their passage.
- No duplicate canonical issue.

Scores are composed from:

| Dimension | Maximum |
| --- | ---: |
| Legal and constitutional relevance | 25 |
| National or international significance | 15 |
| CLAT passage potential | 15 |
| Static-GK connectivity | 10 |
| Recency and substantive novelty | 10 |
| Source strength | 10 |
| Exam-pattern similarity | 10 |
| Continuing-issue value | 5 |

## Live-cloud adapter

The application also supports published `caDossiers` records in Firestore. Live records
are merged with the bundled catalogue by canonical title and automatically projected
into the Current Affairs Hub, Monthly Dossier, Daily One-Pager and Q-Card Studio.

The authenticated manual endpoint is `/api/ca-daily-cron`. It is registered in the
Vercel cron schedule only when the production project has `OPENAI_API_KEY`,
`FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_PROJECT_ID`, and `CRON_SECRET`. The CA test
suite verifies that the endpoint remains registered for 6:00 AM Asia/Kolkata.

## Admin visibility

The Admin Portal reads the latest 30 `caOrchestrationRuns` records and presents:

- new and updated dossiers;
- completed runs with no relevant dossiers;
- ignored candidates and rejection reasons;
- source lists and primary-source gate results;
- deterministic score breakdowns and conflict resolutions;
- build/test validation results from repository audit logs;
- failed runs and error messages;
- a read-only JSON download for each run.

Firestore writes remain server-only. Published dossiers are read-only to the client;
orchestration logs and notifications require either the dedicated `caAdmin` claim or
the broader `privacyAdmin` claim. A `caAdmin` can review Current Affairs evidence but
cannot read student records. Repository logs in `CA_Agent_Logs` are exposed only through
the authenticated, App-Check-protected `/api/ca-admin-audit` endpoint; they are never
bundled into the public browser application. The endpoint includes up to the latest 30
dated JSON logs, while scheduled cloud runs remain available from Firestore.
