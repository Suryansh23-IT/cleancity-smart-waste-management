# CleanCity

**Municipal collection planning, simulation and real local waste-level monitoring.**

CleanCity combines an interactive city editor, zone-based fleet operations and a separate Physical IoT Lab. The frontend is built with React, TypeScript and Vite; the working local sensor prototype uses an ESP32, four HC-SR04 channels, a Node.js USB receiver and SQLite.

## Current progress

| Area | Status |
| --- | --- |
| F1 frontend | Implemented: Dashboard, Cities, City Studio, Fleet & Dispatch, Simulation, Analytics and Physical IoT Lab |
| City library | Six curated templates plus five simulation-ready cities; custom city creation and browser-local saves |
| Routing and simulation | Directed graph paths, zone-contained truck routes, capacity-aware trips, depot returns/unloading and animated collection |
| Local IoT prototype | Real four-channel USB → Node → SQLite → Physical IoT Lab pipeline demonstrated with user-connected hardware |
| Final physical showcase | Pending: four dustbins, mounting, measured calibration and final repeatability/failure testing |
| Full-stack product | Pending: F2 Node/Express/MongoDB persistence, remaining F3 intelligence, F4 quality gates and deployment |

**Latest recorded validation:** 140 automated tests passed across 13 files; TypeScript and production build passed. Desktop/emulated-mobile browser workflows were verified during F1 development. These are checkpoint results, not a claim of complete physical or cloud acceptance. See the [verification record](docs/milestone-checkpoint-verification.md).

## What works today

- **Dashboard:** map-first municipal overview, actionable demand/exception inspection and navigation into collection planning.
- **Cities:** searchable library, previews, create/rename/duplicate/delete, browser-local save/reload and validated JSON import/export.
- **City Studio:** irregular city generation, roads/bins/junctions/heads, contextual editing, bulk tools, undo/redo, pan/zoom/fit/search/layers and distinct map modes.
- **Fleet & Dispatch:** zone/head setup, truck availability/capacity, pickup assignments, route legs and explicit unserved reasons.
- **Simulation:** identifiable trucks following actual directed road legs, per-truck progress/load, pause/step/resume/reset and collection completion.
- **Analytics:** modeled distance/time/cost, coverage, baseline comparisons, full-round versus threshold service-policy comparison and two forecast horizons.
- **Physical IoT Lab:** four independent channels, measured distance/history, validity/freshness/connection states and per-channel calibration controls.

The planner is a deterministic heuristic, not a globally optimal solver. Trucks stay inside their assigned partitions; infeasible demand remains visible rather than being routed through another zone. Arbitrary city edits can produce unserved pickups. Costs, forecasts and collection animation are modeled outputs, not measured municipal savings or physical collection evidence.

## Run locally

Use **Node.js 24.11.0** for the verified local IoT setup, including native SQLite and TypeScript execution.

```powershell
npm ci
npm run dev
```

Open the localhost URL printed by Vite. In a second terminal, optionally start the local Physical API:

```powershell
npm run iot:local
```

Without `--port`, this starts the loopback API on `127.0.0.1:8787` and SQLite **without opening a serial device**. Vite proxies `/api/physical` to it. Actual serial access requires the confirmed port, closed Serial Monitor and the hardware team's readiness; follow the [local IoT guide](docs/local-iot-demo.md).

```powershell
npm test
npm run typecheck
npm run build
npm run preview
```

Production preview does not automatically provide the development API proxy or a hosted backend. Municipal cities save only when explicitly saved in the browser; export JSON for a portable backup. Plans/results are not yet durable server history. Local physical measurements live in ignored `.local/` SQLite storage and must not be committed.

## Try a collection run

1. Open **Cities → Simulation-ready cities** and choose Briar Market Borough for a small demonstration.
2. Continue to Dispatch; inspect collection heads, zones, truck assignments and demand.
3. Plan collection, review routes and any pending reasons, then start simulation.
4. Watch truck movement; pause/step/resume or finish, then open Analytics.
5. Change the demand seed for a reproducible new scenario after resetting the run. Save/export your city to keep it.

Existing saved cities remain separate from templates. The five ready cities span 24–100 bins and two to four zones. Multiple trucks can share one zone, but a truck does not silently switch partitions during a dispatch.

## Physical status and next showcase

The initial real four-channel pipeline has worked; **the final physical demo is not complete**. The receiver was intentionally stopped after testing and genuine history was preserved locally. Electrical safety was user-reported, not independently inspected by software.

The planned showcase is one matching physical/digital **10-bin city: four real sensor-equipped bins and six clearly labeled virtual bins**, with two proposed zones and two trucks subject to feasibility. Mounting/calibration, the city layout and an explicit validated-telemetry planning-snapshot bridge remain pending. Live readings do not currently populate municipal simulation automatically.

Keep physical observations separate from simulated data. Review any changed wiring/power path with the hardware lead, disconnect power before rewiring and never connect 5V Echo directly to ESP32 GPIO. Do not flash or rewire based only on repository pin tables.

## Remaining roadmap

- **Showcase integration:** finalize the matching map, procure/mount four bins, calibrate/test each channel and implement provenance-preserving planning snapshots.
- **F2:** protected Node/Express/MongoDB Atlas backend, City CRUD/revisions, safe localStorage migration and immutable scenario/run history.
- **F3:** verified fleet balancing/objectives, fair comparisons, closures/traffic scenarios, depot/sensor planners and the remaining approved intelligence features.
- **F4:** integrated security, recovery, accessibility, performance, browser acceptance and deployment preparation.
- **Presentation:** final captioned walkthrough, highly visual 20–30-page report, PPT and integrated demonstration.

The [final remaining execution plan](docs/FINAL_REMAINING_EXECUTION_PLAN.md) preserves all ten innovations and all 26 upgrade recommendations, including explicit advanced deferrals. The [full-stack blueprint](docs/fullstack-product-rebuild-blueprint.md) defines the future architecture. Historical AWS/Supabase preparation is not the current municipal backend plan or proof of cloud connectivity.

**Deployment remains pending.** A deployed municipal website cannot directly reach the existing laptop USB receiver; remote physical monitoring needs a separately designed secured bridge. The reliable current hardware path is local.

## Team

- **Suryansh + Codex:** software, integration, testing, Git and technical documentation/video coordination.
- **Vishal:** electronics/protection, measurement testing, calibration and circuit verification.
- **Suryakant:** matching city-map design, roads/zones/head/bin locations, print coordination and noncoding QA.
- **Raj:** approved dustbin procurement, materials, mounting and physical assembly.
- **Two seniors:** PPT and presentation preparation.

Planned responsibilities are not claims of completed contributions. Earlier architecture notes remain in [project documentation](docs) and [history](docs/history) for provenance.
