# CleanCity

Latest municipal update: professional light UI, running collection/fleet metrics, zone workload summaries, both forecast horizons and expanded baseline analytics. See [M1–M3 acceptance and verification](docs/municipal-acceptance.md) (56 tests passed; desktop/mobile, file and keyboard checks executed).

Smart waste monitoring and municipal collection simulation in one React + Vite + TypeScript website. The approved **Final Master Execution Prompt v1.0** supersedes the earlier AWS-first/M0-only plan: **four physical bins**, independent **10/20/50/100-bin virtual cities**, **Vercel + Supabase**. AWS is on hold. No login screens or separate Express server.

## Run locally

Use Node.js 22.12+ (the audit uses Node 24.11.0). From this repository:

```powershell
npm ci
npm run dev
```

Open the Local URL printed by Vite. Check the implementation with:

```powershell
npm test
npm run typecheck
npm run build
npm run preview
```

Vite dev/preview serves the simulator only; it does not execute Vercel Functions. The Physical IoT Lab will show no verified data when `/api/physical` is unavailable. Simulator data stays in memory until **Save scenario** writes the versioned browser library; JSON export is a portable backup. Neither virtual telemetry nor simulator edits write to Supabase.

## Current implementation

- Six dashboard sections, responsive CSS, SVG city canvas, selectable nodes/roads/bins, node dragging and bin snapping.
- Blank cities, two preset layout families, four preset sizes and an infeasible test case; city rename, duplication, local save/load/delete, reset and validated JSON import/export.
- Node/road/bin/zone/truck editing, guarded deletion, undo/redo, explicit graph/collection plan invalidation and feasible manual bin reassignment.
- Directed Dijkstra; deterministic head-seeded graph-distance zoning; greedy urgency/nearest routing; capacity-aware multi-truck trips, head returns and inter-zone transfers.
- Seeded fill randomization, configurable thresholds/speeds/costs, fixed-order baseline, rule-based forecasts, animated virtual collection with pause/step/reset and bounded event history.
- Separate physical four-bin dashboard with response validation, stale/offline handling, bounded polling and history display.
- Prepared authenticated Vercel ingestion/read handlers and Supabase SQL bootstrap. **Not deployed or database-verified.**

These are working implementation modules, not a claim that all master-plan acceptance criteria are complete. See [verification and remaining work](docs/verification.md) and the [checkpoint roadmap](docs/roadmap.md).

## Demo sequence

1. Choose the 100-bin preset. If switching away from unsaved work, save/export first.
2. Set K = 3, choose three distinct municipal HEAD nodes, then Generate zones.
3. Randomize fill levels (the same seed repeats the values); inspect normal/collection/urgent counts.
4. Configure trucks in their property inspector and Optimize all zones.
5. Start collection; pause, step, resume and inspect actual directed trips, loads and completed/pending bins.
6. Reset the run before editing a road or bin. Graph changes require zone regeneration; fill changes require route recalculation.
7. Compare baseline/heuristic estimates under the same assumptions. Negative savings are possible. Save/export the scenario.
8. Switch to Physical IoT Lab: it must show OFFLINE/NO VERIFIED DATA until actual physical telemetry is configured and received.

## Physical and cloud status

The owner reports that ESP32 detection, upload and serial operation work. **HC-SR04 circuit operation remains unverified; hardware debugging is paused pending experienced assistance.** This does not block simulator work. No remote upload, power-on or physical test has been performed in this audit.

Keep the one -> two -> four sensor gates, exact-board/power-path review, level-shifted Echo, power-off rewiring and technician/multimeter checks. See [hardware safety review](docs/purchase-and-review.md) and [first-sensor status](docs/first-sensor-test.md). The existing `hc_sr04_test` sketch is preserved as received; its hardcoded pins are not approved and it lacks a review guard. Do not treat it as upload-ready.

For cloud setup, see [cloud preparation](docs/cloud-setup.md). Privileged Supabase keys remain server-only; `.env*` and firmware secrets are ignored. Never use `VITE_` for privileged credentials. No actual cloud connectivity or verified physical pickup is claimed.

## Project ownership and history

Suryansh and Codex own software. Vishal owns electronics and physical tests. Raj and Suryakant jointly own the flat model, four bins, roads, labels and mounts; Suryakant also supplies map data and noncoding QA. Seniors document and everyone assists integration.

Earlier working-tree README, roadmap and sensor-preparation notes are retained in [docs/history](docs/history) for provenance; they are superseded, not current execution instructions. The Git checkpoint preserves earlier firmware/doc changes. Do not push, merge or change other branches without authorization.
