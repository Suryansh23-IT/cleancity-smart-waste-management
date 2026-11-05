# Cloud preparation (not deployed)

Approved path: ESP32 -> HTTPS `POST /api/ingest` -> Supabase -> `GET /api/physical` -> Physical IoT Lab. The municipal simulator has no dependency on this path.

1. Confirm the intended Vercel account/team/project, feature branch, deployment target and repository root. Do not overwrite unrelated deployments or provision paid resources.
2. Select a dedicated CleanCity Supabase development project. Inspect its existing tables first. `supabase/schema.sql` is a **prepared, one-time bootstrap**, not a verified/applied migration; do not run it against an unrelated project. Execute/test it there, inspect advisors/RLS, then generate a proper migration using the Supabase CLI workflow.
3. Register the real device with a cryptographically random secret (at least 32 characters); store only its SHA-256 hex digest in `devices.token_hash`. The token belongs in ignored local firmware credentials, not in frontend code, Git, screenshots or logs. Devices default disabled.
4. Register only the reviewed physical bin IDs `BIN-001` through `BIN-004` with their device and **measured** `empty_cm`/`full_cm`. Do not invent calibration values or enable the device before review.
5. Configure `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as server environment variables, following `.env.example`. No `VITE_` prefix for secrets. `PUBLIC_PHYSICAL_DEMO=true` intentionally enables the read-only public monitoring endpoint; otherwise it returns 503. The browser receives physical measurements only, never privileged keys or device tokens.
6. Run function/API integration tests in a development deployment before live device testing. Ordinary `npm run dev`/`preview` serves the frontend only. Vercel Functions must be executed separately by Vercel tooling or a reviewed preview deployment. No production deployment has been made here.

Current ingestion body (prepared contract):

```json
{"deviceId":"device-lab","bootId":"unique-boot-session","seq":1,"readings":[{"binId":"BIN-001","distanceCm":null}]}
```

Send `Content-Type: application/json` and `Authorization: Bearer <device-secret>`. Limit: 8192 bytes, 1–4 distinct configured bins, null or 2–400 cm distances, nonnegative safe-integer sequence. Server/database calculate fill from registered calibration; invalid distances remain unknown. SQL transactions lock each device row and perform atomic batch writes, duplicate handling and a two-second minimum ingestion interval. These properties have been reviewed in source but **not tested against PostgreSQL**. API unit tests use mocks, not real storage.

Tables have RLS enabled, no anon/authenticated grants or write policies, and RPC execution is restricted to the server role. Public reads are mediated by the explicitly enabled server endpoint. These access controls still require verification in the intended database.

## Blockers before live physical integration

- Finalize versioned capture timestamps, uptime, calibration identity and boot/session ordering; the current minimal contract uses server receipt times and must not be used as physical pickup proof. A delayed batch or retired boot can still be accepted in some cases. Do not claim replay-proof freshness.
- Compile and test safe sequential calibrated firmware with reconnect/backoff, clock synchronization and certificate-verified HTTPS. Existing sensor sketches do not implement this cloud path. Never disable TLS verification or flash automatically.
- Verify database schema/RPCs, auth failures, device/bin ownership, duplicates, concurrent/out-of-order requests, invalid batches, rate limiting and latest/history retrieval in development.
- Review retention/log/rate-limit settings before public deployment. No unrestricted write endpoint or client-side service key.
- Resume actual one -> two -> four sensor tests only with physical assistance. Live success requires an actual ESP32 reading received, stored and displayed with truthful timestamps.
