# Municipal-platform checkpoint audit — 5 November 2026

This records the earlier `9d6b975` checkpoint. The subsequent light-theme municipal M1–M3 implementation and **56-test** verification are documented in [municipal acceptance](municipal-acceptance.md), which supersedes the municipal UI/forecast/progress gaps listed below. Physical/cloud limits still apply.

Branch: `codex/municipal-platform`. Existing uncommitted implementation and earlier firmware/document changes were inspected and preserved. No reset, push, merge, deployment, cloud resource change or hardware operation was performed.

## Verification evidence

| Boundary/check | Result | Evidence/limit |
| --- | --- | --- |
| Installed dependencies | Inspected | Pinned React 19.3.1, Vite 7.2.2, TypeScript 5.9.3, Vitest 4.0.8, Tailwind 4.1.17; Node 24.11.0. Added compatible dev-only jsdom 27.2.0. Lockfile retained. |
| Algorithm/state/API tests | PASS | `npm test`: 48 tests in four files; 30 core, 8 React DOM interactions, 8 mocked server tests, 2 physical-response tests. |
| TypeScript | PASS | `npm run typecheck`. |
| Production build | PASS | `npm run build`: Vite build successful, main JS 295.50 kB (93.29 kB gzip). Build size is not a laptop performance benchmark. |
| UI interaction flow | PASS in jsdom | 100-bin choose-heads -> zones -> randomize -> plan -> start/pause/step/reset -> save/reload; six sections; road edit/undo/redo; blank-city node/bin editing; blocked deletion; corrupt storage; physical offline and StrictMode polling. |
| Graphical desktop/mobile review | PASS for audited paths | Initial sandbox preview timed out; a host-visible production preview at port 4174 loaded successfully. Reviewed all six sections at desktop and narrow/mobile widths, completed 19/19 planned pickups, pause/step/reset, cost comparison, saved-scenario reload and actual bin drag/snap. Mobile document width equalled viewport width (no horizontal page overflow). No simulator console warnings/errors observed. A final build reload confirmed the improved physical offline message; console warning/error logs were empty. Broader file/keyboard/device QA remains pending. |
| API -> database -> UI | UNVERIFIED | API tests mock fetch; SQL bootstrap has not been executed in PostgreSQL/Supabase. No real writes, RLS execution or live physical history verified. |
| Local HTTP smoke | PASS | Host-visible preview HTML and built JavaScript returned HTTP 200. This serves the frontend, not Vercel Functions. |
| Deployment | NOT PERFORMED | No production URL. Account/team/project/branch/target must be checked before a later deployment. |
| Firmware/physical | UNVERIFIED/PAUSED | ESP32 operation is owner-reported. HC-SR04 circuit tests paused pending experienced assistance; no compilation/upload/power/wiring action in this audit. |

The first all-files run after adding DOM tests encountered a worker startup timeout during installation. Installation was completed with a Node-compatible jsdom version and the test command uses one worker for this laptop. The final 48-test run completed without that error.

## Confirmed defects fixed

- Multi-zone scheduling previously placed a reused truck at the next head without road travel. Trips now include directed transfers, distance/time/cost and animation origin; unreachable transfers remain pending.
- Collection sample timestamps and event ordering depended on playback steps. History now uses the actual service-completion offset from the original scenario clock; stepped and whole-run results agree.
- Imported optional road names could crash rendering; arbitrary preset references could trigger invalid/huge resets. Both are validated before import.
- Bin relocation through the inspector retained old responsibility; dragging even to the same node removed it. Actual relocation now unassigns the bin, while a no-op preserves assignment. Zone-head edits check assigned round trips.
- Inspector connection/reassignment/deletion failures now produce useful feedback. Failed edits keep their selection; corrupt storage cannot silently be overwritten through Save.
- Future/invalid physical timestamps are stale; malformed responses are rejected; retained values remain stale on failure. Polling is bounded, avoids overlaps and survives StrictMode cleanup.
- Browser testing found inspector content changed the SVG height during dragging. Canvas/inspector heights are now stable; an actual drag moved BIN-001 from n0 to n1 and updated the inspector association. Static preview HTML returned at the physical API path now produces a clear offline message instead of a raw JSON parser error.
- Mobile navigation and road selection have accessible names/keyboard paths. Completed runs cannot be resumed; reset marks restored state unsaved. Incomparable served sets suppress the numeric savings claim.
- README/roadmap now reflect four physical bins, independent municipal software, C0-C5 and Vercel/Supabase. Historical notes were preserved; inaccurate sensor-sketch pin/guard claims were corrected in the active status note.

## Master-plan gaps and next work

1. **Highest priority: finish the remaining municipal acceptance details.** The main 100-bin browser flow, layout, collection completion and bin snap have now been exercised. Complete node-drag/device-touch coverage, keyboard/modal focus, file download/upload and destructive CRUD confirmation regression checks before calling C1-C3 complete. Finish confirmed UX defects without changing architecture.
2. Finish remaining presentation/acceptance details: expose both pickup and urgent forecast horizons (currently the UI shows urgent only), clearer per-zone workload/feasibility summaries, running distance/remaining-stop summaries and a final demo/report walkthrough. Zone hulls are illustrative; manual vertex editing is optional. Zoning is a head-distance/workload heuristic, not guaranteed connected/balanced/optimal polygons. Per-road distances are always authoritative.
3. Finalize the physical telemetry contract (capture timestamps, boot/cycle/calibration identity and ordering) before live ingestion. The current server receipt timestamp is not physical pickup proof and retired-boot/delayed-batch behavior remains incomplete. Do not use the scaffold to claim fresh physical collection verification.
4. Execute/test the prepared SQL and RPCs in the intended CleanCity development database, including transactions/concurrency, invalid batches, device/bin allowlists, replay/dedup/rate limits and RLS. Prepare a proper migration after that verification. No unrelated project should be reused.
5. Implement and compile reviewed sequential calibrated firmware with verified TLS, clock sync and reconnect behavior; preserve the existing sketches. Upload/testing stays paused until requested with physical assistance.
6. Verify deployment identity/target, configure server secrets, deploy and perform production smoke tests when that work is authorized. Then collect actual ESP32 -> stored -> displayed evidence and prepare the compulsory report (no PPT required).

The simulator saves only on explicit Save and exports JSON; generated plans/playback are deliberately not persisted and must be recalculated after reload. A truck starts at its first assigned head; subsequent head transfers are costed. Initial truck deployment and industrial vehicle-routing optimality are not modeled. Forecasts use synthetic preset/randomized history and are estimates, not learned AI or measured real growth. The educational browser flow does not write virtual readings to Supabase.
