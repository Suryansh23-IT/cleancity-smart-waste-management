# F2 municipal backend setup and acceptance

F1/local hardware remains independent. Municipal API uses Express/TypeScript and native MongoDB driver; the USB receiver still uses SQLite on port 8787. No serial connection is opened by the municipal backend.

## Required operator action: Atlas development access

No Atlas URI or server credentials were configured during implementation. The software does not create an Atlas account, cluster, database user or network rule for you.

1. In your own Atlas account, select a dedicated **development** cluster/project. Create a database user limited to the intended development database where practical; allow only the development computer's IP, not unrestricted public access. Follow Atlas's current connection instructions for your account/tier.
2. Put the driver connection string into an ignored root `.env` file as `MONGODB_URI`. Set `MONGODB_DATABASE=cleancity_development`. Do not paste the URI/password into chat, screenshots or Git. If `.env` already exists, edit it rather than overwriting existing settings.
3. Set `APP_ORIGIN` to the exact frontend origin you will open, for example `http://127.0.0.1:5182`; `localhost` is a different origin. Set `OPERATOR_USERNAME` and a server-only password hash. `WORKSPACE_ID` is server-controlled; do not accept workspace identity from browser requests.
4. Generate the hash using `npm run --silent auth:hash` with a 12–256-character password on stdin. For an explicitly local demo only, `npm run --silent auth:hash -- --local-demo` permits 8–256 characters; shorter-than-12 passwords receive a distinct `scrypt-local` hash which the API rejects for public origins and production. Hashing and session protection are unchanged. Never relabel a local hash as a production hash. The requested local operator is configured privately in ignored `.env`; Atlas database credentials remain separate. Do not pass plaintext in process arguments. PowerShell example, entered privately on your computer:

   ```powershell
   $operatorCredential = Get-Credential -UserName operator -Message 'Choose your CleanCity operator password'
   $operatorCredential.GetNetworkCredential().Password | npm run --silent auth:hash
   ```

   Copy only the resulting `scrypt:...` string into `OPERATOR_PASSWORD_HASH` in `.env`. Never commit the hash or plaintext. This creates no account with a third party.
5. Run `npm run api:dev` in one terminal and the existing `npm run dev -- --port 5182` in another. API binds to loopback port 3001. Vite proxies `/api` there, while `/api/physical` remains routed to the existing receiver. `MUNICIPAL_API_TARGET` can override the **development** proxy for isolated tests.

`GET /api/health` proves only process health. `GET /api/ready` must succeed against MongoDB before claiming database readiness. Failures return sanitized 503 errors, never memory fallback or false Saved feedback. Cookies are HttpOnly/SameSite Strict; production cookies require HTTPS (`NODE_ENV=production`). Production packaging is later F3/deployment work, not authorized here.

## Operator workflow

- Open **Cities → Municipal database · explicit operator saves** and sign in. Browser-local controls retain their existing meaning.
- Save a database copy and read it back, or open an existing database city as a local editable draft. Explicit Update uses its original revision. On 409 conflict, retain/export your draft, reload intentionally or save a separate copy. Selecting a refreshed row cannot silently rebase an already-bound stale draft.
- Archive/restore operates only on database copies; local inputs remain. City/snapshot/run lists use bounded 50-record cursor pages with Load more controls.
- Download a raw local backup, preview local entries, select valid cities and import. Invalid entries stay untouched. Imports are idempotent and read-back checked; no automatic localStorage deletion or migration of receiver history occurs. Keep the downloaded backup yourself.
- Save a labeled planning snapshot. With an active/completed simulation, this captures its original planning inputs, not partially emptied playback bins. Complete the existing simulation; return to Cities, resume the operator session, refresh history, select the matching snapshot and save the completed result.
- The server computes the canonical plan and replays terminal pickups before saving. Verification means **simulated computational consistency**, not GPS, physical collection or verified sensor calibration. No per-frame persistence.
- Snapshot/result JSON exports include server metadata; City JSON v1 imports/exports stay compatible. History is immutable and survives source edits/soft deletion. Retry keys bind to input hashes.

## Real database acceptance (still required)

After configuring development access, run sign-in → create/read/edit → API restart → fresh browser read; verify revision conflicts from two tabs, archive/restore, migration retry, snapshot/run reload, database outage/recovery and local draft preservation. Record actual results. TEST-memory API/browser checks are not substitutes.

An opt-in real-driver test exists: set **`CLEANCITY_TEST_MONGODB_URI`** in ignored `.env` to a development/test-only connection and run `npm run test:atlas`. It creates a fresh `cleancity_test_<random>` database and drops **only that newly generated namespace** afterward. The test account must allow creation/indexing/drop of that disposable namespace; never use a production connection. Without the explicit variable, the test is skipped, not passed. No Atlas test was run during implementation because no credentials were configured.

## API contracts

Health/readiness; session POST/GET/DELETE; cities GET/POST and city GET/PUT/DELETE/restore; import preview/commit; immutable scenarios GET/POST/detail; canonical plans POST; terminal runs GET/POST/detail. Mutations require exact Origin and session CSRF token. Updates require quoted numeric `If-Match`; absence returns 428, stale/deleted conflicts 409. Domain validation uses shared City JSON v1; bodies are capped at 2 MB. Database identifiers/metadata are outside City payloads. Query passthrough is prohibited. List pages use stable database-identity ordering and an `after` cursor, returning `meta.next`; refresh to see records inserted before the current cursor. No unbounded history reads.

Connection pooling follows the [MongoDB driver guidance](https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/); security controls follow [Express guidance](https://expressjs.com/en/advanced/best-practice-security/). These references do not establish Atlas connectivity or production acceptance.
