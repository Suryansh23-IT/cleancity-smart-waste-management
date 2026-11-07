# Production preparation — no deployment performed

7 November 2026. F3 may proceed without Atlas per the latest user authorization, but real Atlas acceptance remains mandatory before release. No cloud provisioning, commit/push or deployment is authorized now.

## Prepared target

Existing Vite frontend and same-origin municipal API on Vercel; `api/[...path].ts` delegates to the shared Express app without opening a listener. Existing physical API files retain separate paths. `/api/physical` production is not a bridge to laptop USB. Missing configuration returns sanitized 503; local-demo hashes are rejected by hosted initialization. Mongo connection pooling is reused per warm function. Browser bundles must contain no credentials, Mongo URI or password hashes. Static CSP, no-sniff and referrer headers are in `vercel.json`; `.vercelignore` excludes local readings, credentials, screenshots and test-only adapters.

Required server-only variables: `MONGODB_URI`, `MONGODB_DATABASE`, `APP_ORIGIN` (exact public HTTPS origin), `OPERATOR_USERNAME`, `OPERATOR_PASSWORD_HASH` (strong `scrypt` hash; minimum 12-character source password), `WORKSPACE_ID`, `NODE_ENV=production`. No `VITE_` secret variables. Production database credentials/account/network rules must be configured separately from development. The requested eight-character demo password is never suitable for hosted initialization.

## Release gates

Latest local evidence is in the [final engineering audit](final-deep-engineering-audit.md). The suite passed 179 tests with the real Atlas test skipped. Independent directed leg checks, showcase exact-tour comparison, production preview playback, TypeScript, production build and local API bundling are complete. The 4-unit showcase TEST run schedules four pickups and skips six below threshold.

1. Real Atlas development persistence/restart/read-back, concurrent revision saves, migration, immutable result history and outage/recovery acceptance. Current TEST-memory evidence cannot satisfy this.
2. Validate this adapter's routing, cookie/Origin/CSRF behavior, static headers/CSP, body/response limits, Atlas networking and concurrency on the selected hosting runtime. Local bundling and HTTP unit tests do not prove platform packaging. Do not run a preview deployment until approved.
3. Configure a hosting-level login/request rate limit: the existing per-process login limiter is useful locally, but is not a shared distributed limiter across independent serverless instances. Confirm account/session scope and operational audit/monitoring requirements. Do not claim a completed production security audit.
4. Perform actual cross-engine browser/touch-device acceptance if required: current evidence is Chromium and emulated mobile. Keyboard/accessible-name spot checks are not full WCAG certification; measure playback frame/memory behavior under the actual release runtime.
5. Complete physical F4 using the existing approved map and local pipeline. No remote USB/ESP32 connectivity is implied or authorized.
6. Only then, with explicit approval: select exact project/team/commit, provision production variables and least-privilege DB access, verify production smoke/persistence/navigation/simulation/analytics and backup/restore procedures.

## Rollback and data safety

Record the deployed commit, engine version, variable names (not values), previous deployment and database backup/restore point. Roll back application deployment to that recorded version if smoke tests fail; do not roll back/delete MongoDB or SQLite automatically. Immutable history records retain engine versions; unsupported historical replays must remain readable, never silently recalculated. Revoked sessions should be invalidated through the existing session store, not by deleting operator cities. A bad database migration requires a separate reviewed recovery plan and verified backup; localStorage/City JSON backups remain independent recovery inputs.

The hosted adapter follows the documented [Node function runtime](https://vercel.com/docs/functions/runtimes/node-js). Exact project build/routing compatibility still requires the authorized platform acceptance gate above. **Status: production preparation implemented; release blocked, not deployment-certified.**
