# F2 execution and actual status

7 November 2026. Governing sequence: [locked roadmap](locked-delivery-roadmap.md). Baseline main `73f1f8eb`; untracked root PNG preserved.

## Real Atlas development acceptance

7 November 2026. The Free `cleancity-dev` cluster in Mumbai is active. The local municipal API and its frontend proxy both returned database-ready responses. The application database user has read/write access scoped to `cleancity_development`, and the connection string is stored in the ignored local `.env`.

- A fresh acceptance workspace in the real Atlas database passed login and logout, unauthorized access and CSRF rejection, city create/read/edit, stale revision rejection, archive and restore, and idempotent migration with read-back. After recreating the Express listener and MongoDB client, the session, city revision, import identity, immutable planning inputs and replay-verified four-pickup result persisted.
- Isolated Chromium passed operator sign-in, a database save with read-back, session resume after page refresh, inspection of the saved simulation result and reopening the edited Atlas city in City Studio. The isolated browser library was preserved. The test removed only the records in its uniquely named acceptance workspace.
- A later release check repeated these workflows and injected an isolated connection refusal. The same API returned 503, then reached the real Atlas cluster on retry. It also stored a labeled four-channel TEST batch, deduplicated a retry, and read its history after restarting the API and MongoDB client. Cleanup was scoped to the unique acceptance workspace. The generic disposable-database integration command was skipped because it requires broader database creation and deletion rights.

## Original repository inspection

F1 is implemented. `src/core/storage.ts` saves City JSON v1 in `cleancity.scenarios.v1`; operating results are tab-local. `server/local` is serial/SQLite, not the municipal database backend. No server environment file or Atlas URI is configured in this checkout. Preserve these contracts and the receiver.

## Focused chunks and acceptance

1. Protected persistence foundation: Express initialization/listener, bounded Mongo client, process health versus database readiness, operator sessions, workspace-scoped City CRUD with revision checks and soft-delete/restore, meaningful API tests.
2. Frontend database workspace and migration: explicit sign-in/save/read/open; preserve local draft/save behavior, conflicts and errors; backup and independently preview/select local imports, idempotent retries, read-back verification. Never clear localStorage automatically.
3. Immutable scenarios and terminal results: snapshots/hashes/engine version; canonical server planning/replay verification, bounded results, retry-safe writes and retrievable history. No per-frame database writes.
4. Real dedicated Atlas acceptance: browser → authenticated API → MongoDB, restart/read-back, concurrent conflicts, scope/CSRF/malformed/oversized rejection, outage/recovery, migration corruption/retry and immutable history. Test doubles alone cannot pass F2.

## External gate

Actual Atlas acceptance requires a dedicated development database URI in an ignored server environment file. Do not paste/commit credentials or provision production resources. Test memory repositories are never production fallbacks. No cloud connectivity claims without real evidence. F3, F4 and deployment remain out of scope.

## Implemented chunks

1. **API/authentication:** Express 5 listener separate from initialization; native MongoDB adapter with bounded connection pool/timeouts/retry of failed initialization, indexes and health/readiness separation. Operator passwords use salted scrypt; opaque HttpOnly/SameSite sessions store token hashes and explicit expiry. Server-scoped workspace identity, exact-origin mutation checks, CSRF tokens, bounded login attempts/JSON input and sanitized error responses are implemented. No memory fallback exists in the production listener.
2. **City persistence:** protected create/read/list/update/soft-delete/restore with shared City v1 validation, ETags/If-Match, 428 missing revision and 409 conflicts; retry-safe explicit copies. Metadata stays outside City JSON. Cursor-paged library/history reads have Load more controls. The Cities database workspace is explicit and preserves browser-local save semantics. Draft revision context survives screen navigation; canceled Open does not replace it, and selecting a refreshed row cannot silently rebase stale edits.
3. **Migration:** raw backup download, per-entry preview, explicit selection, bounded validation before writes, deterministic import identities/receipts, retry safety and read-back checks. Corrupt entries and original localStorage remain untouched. Receiver/SQLite data is excluded.
4. **Snapshots/results:** immutable labeled City inputs, content hashes, engine version, canonical planning endpoint, server replay verification of submitted terminal plans/completed pickups, immutable results/history and JSON exports. The UI saves the simulation's original inputs when a run exists; no per-frame writes or physical collection claims.

## Actual verification — 7 November 2026

- Full suite: **164 tests passed, one real MongoDB integration test skipped** (17 passing files, one skipped file). The skip is due to absent `CLEANCITY_TEST_MONGODB_URI`; it is not a database pass.
- TypeScript, production build and whitespace checks passed. Existing F1, municipal graph/showcase and local serial/SQLite tests remain passing; no COM port was accessed.
- Fourteen F2 HTTP tests use an explicitly TEST-only repository: auth/CSRF/origin/logout/expiry/rate limits; validation/body bounds; workspace isolation; CRUD/restore, simultaneous revision conflicts, retry-bound copies/imports/snapshots, pagination, outage/recovery and immutable history/canonical replay.
- Isolated installed-Chrome desktop/mobile journey passed: login, duplicate-free save retry, simulated other-tab update, stale draft rejection across navigation, backup/selected import/retry without local mutation, snapshot, existing collection simulation, replay-verified result, reload/session/history and overflow check. No uncaught application exceptions. This is **TEST-memory repository evidence**, not MongoDB durability.
- Actual ChatGPT in-app browser also signed in to that isolated TEST API and inspected the stored simulated run: four completed, zero pending, 6.13 modeled km, 36.4 min and INR 171.07. Application-only screenshot: ignored `build/f2-e2e/chatgpt-TEST-history.png`. Other evidence: `f2-TEST-library-migration.png`, `f2-TEST-saved-result.png`, `f2-TEST-mobile.png`, and `results.json` in that directory. Generated screenshots/backups are not source files.
- Dependency install exposed prior Vite/Vitest advisories. Audit-recommended updates stayed within Vite 7/Vitest 4; installation reported **zero vulnerabilities** afterward. No forced major update was used.

## Original acceptance plan

Configure dedicated development Atlas access using [the exact setup guide](f2-local-setup.md), then run the real-driver test and authenticated browser/database restart, conflict, migration/history and outage/recovery checks. Any genuine adapter/integration failures must be fixed before marking F2 complete. Production readiness/security/performance refinement belongs to F3; physical acceptance belongs to F4. No F3/F4 execution, cloud provisioning, deployment, commit or push was performed. Changes remain reviewable in the working tree; the pre-existing root PNG is retained.
