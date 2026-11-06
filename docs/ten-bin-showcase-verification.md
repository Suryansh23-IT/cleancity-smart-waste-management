# Ten-bin hybrid showcase — implementation and verification

**Final configuration supersedes the earlier two-zone prototype:** one city, one HEAD/depot, one collection zone and one capacity-3 truck; exactly BIN-001–BIN-010. BIN-001–004 map one-to-one to the four sensor channels; BIN-005–010 are VIRTUAL with low initial modeled fills. The road layout, coordinates and dimensions remain provisional. Historical observations below describe earlier versions. Existing saved prototype cities are preserved rather than silently migrated; open a fresh showcase copy to use the finalized configuration.

## Current software scope

Added an independent provisional city (10 access nodes, 22 directed road records, 10 bins, 1 HEAD/zone and 1 capacity-3 truck). Existing six templates, five ready cities and local receiver are unchanged. Open **Physical IoT Lab**, then scroll to **10-bin showcase dashboard → Open 10-bin showcase**. The dedicated snapshot controls live inside the existing Lab; map editing, dispatch, playback and Analytics use the existing municipal workspaces, not across municipal screens. Municipal workspaces retain only a concise provenance notice. A fresh unsaved copy uses the existing dirty-work confirmation.

Four channel identities map explicitly in `src/core/showcase.ts`: BIN-001 → municipal BIN-001, through BIN-004 → municipal BIN-004. Six other bins are VIRTUAL with initial fill15–24%, below collection threshold. Before capture physical placeholders are unknown, not measured zero; simulation is blocked until a snapshot exists.

## Workflow and provenance

1. Preview actual sensors requests the existing `/api/physical` contract. A disconnected/unavailable receiver, missing/duplicate channel, non-VALID observation, age>10s, future>5s, null distance/fill or invalid calibration rejects capture. Stored fill must agree with the captured calibration/distance. All four channels must pass.
2. Preview TEST fixtures is explicitly manual and visibly TEST-only. It does not run through the receiver, SQLite or Physical Lab. Its illustrative calibration is fixture data, not a claim of physical calibration.
3. Confirm snapshot revalidates age/values at confirmation time, freezes four readings/calibration parameters/receipt timestamps plus all ten input fills and capture time. Capture invalidates earlier plans. No polling changes active planning inputs.
4. Existing AutoZone, Dispatch, Animation and Analytics operate on numeric City v1 simulated planning values. The page banner and bin names distinguish TEST or physical-derived inputs from six virtual inputs. Collection remains modeled and never writes to physical telemetry.
5. Any active/completed run locks refresh until Reset. Physical-derived fill edits/randomization are rejected; refresh by explicit snapshot instead. Virtual demand remains editable outside runs. Reset/replay preserve original captured provenance.

Optional `showcase` and `showcaseSnapshot` fields extend existing City v1 without changing required fields or the `SIMULATED` bin-source contract. Existing local save/export/import retains these fields; provenance structure is validated on import. City snapshots contain four selected observations, not raw personal telemetry history. Imported/browser-local provenance is user-supplied, not authenticated server evidence; F2 must verify trust separately. Original `fills` stays fixed while simulated bin fills decrease during service. Forecast histories for captured physical bins are empty rather than invented.

## Earlier prototype verification (historical results)

- Full suite: 144 tests /14 files passed, including four new domain regressions. Final rerun follows imported-provenance checks; exact terminal results supplied in task report.
- TypeScript and production build passed. No new dependency or receiver change.
- Isolated actual headless Chrome journey passed on port5182: actual-receiver unavailable rejection, TEST preview/confirmation, save, ten identities/six virtuals, map, dispatch, playback, locked refresh, completion, Analytics, 390px no-overflow and save/reload provenance. No captured JavaScript exceptions. Browser script: `scripts/showcase-browser.cjs`, run with `CLEANCITY_TEST_URL=http://127.0.0.1:5182`.
- All-city preservation/strict partition invariants remain covered by prior and new automated tests.
- TEST result observed in browser:4 completed,0 unserved,1.60km,14.6 fleet minutes,22.8 summed vehicle minutes, modeled costINR66.80 (rounded67 in UI). These are fixture model outputs, not physical measurements.
- Screenshot review: source banner visible, faint zone ownership, real graph roads, mapped markers and complete results. Mobile panel wraps without page overflow. The provisional two-loop city is schematic, not geographic or final physical layout.
- Initial sandbox suite encountered loopback EACCES in existing API test; authorized rerun passed. Initial browser targeted an old preview; dedicated5182 preview resolved this harness issue.

Screenshots (ignored): `build/f1-a-e2e/showcase-dashboard.png`, `showcase-map-detail.png`, `showcase-dispatch.png`, `showcase-simulation-detail.png`, `showcase-analytics-detail.png`, `showcase-mobile.png`. New test profile only; no existing saved user data altered. No desktop capture or COM access.

## Physical dependencies and final map alignment

Still pending: compatible dustbins, safe reviewed mounts/circuit, measured empty/usable-depth calibration on each mounted channel, independent ruler/target/empty/partial/full/no-echo/stale/reconnect/restart repeatability. Only then authorize COM access and test four fresh calibrated readings → actual preview → physical capture → municipal model. This has NOT been physically validated during implementation.

When Suryakant supplies the drawing: move labeled nodes/markers in Studio or edit the dedicated factory coordinates; update explicit directed roads/weights, heads and channel-to-bin assignments if labels change. Preserve four stable sensor IDs. Regenerate zones, verify internal outward/return paths, reassign trucks and rerun tests/browser acceptance. Changing coordinates alone does not change road km. The original eleven cities need no modification. Final physical boundaries may require explicit topology changes; no architectural rewrite or hidden cross-partition shortcut is needed.

F2 can begin after review of this slice: reuse optional snapshot envelope/provenance fields behind protected municipal persistence, immutable scenario/run verification and migration. SQLite/USB stays separate. This is frontend-local integration readiness, not a claim of F2, physical acceptance or deployment completion. All changes remain uncommitted pending review.

## IoT Lab placement refinement

At user request, the showcase entry/snapshot panel moved below the four-channel Lab into a dedicated showcase section with Save showcase city, Edit showcase map and Continue to Dispatch. Existing municipal workspaces handle collection/playback/results; no second application or receiver was introduced. Relocated end-to-end isolated Chrome journey passed again, including TEST capture, downstream dispatch/playback/results and mobile/reload. TypeScript and production build passed after this placement change; full144-test result above is from the preceding integration validation. No commit/push or hardware access.
## Final live software check — 6 November 2026

User reports four calibrations completed. Read-only live checks found COM8 receiver connected, both receiver and Vite proxy HTTP200, all four VALID observations around one second old, and all four stored calibration configurations empty16cm/depth12cm. These dimensions were earlier described as trial values; their measured accuracy and mounting geometry are not independently established. Configuration presence is not an accuracy certificate.

An actual isolated browser used **Preview actual sensors → Confirm PHYSICAL snapshot → Save showcase city → Continue to Dispatch** with four genuine observations (no fixture substitution). PHYSICAL metadata, channel count and non-TEST identity checks passed. All captured fills were below80%, giving zero eligible pickups; the UI correctly reported no demand and no collection was forced. Real eligible-pickup playback remains a future controlled rehearsal. Prior explicitly TEST four-pickup simulation/Analytics coverage remains separate.

No firmware, circuit, calibration values or receiver source were changed by this check. No COM reopen was needed; the authorized receiver remained running. Screenshots/results are ignored local artifacts (`final-live-hybrid.png`; browser result log). Final physical map alignment, measured repeatability/accuracy, controlled failure/reconnect tests and eligible physical-derived collection rehearsal remain distinct pending acceptance gates. This check supports live telemetry-to-planning software integration, not a claim that all final hardware acceptance is complete.
Final verification result: the monolithic test invocation stalled after reporting all27 App tests passed; that owned runner was interrupted, without terminating the live receiver or unrelated services. The remaining13 files were rerun separately:117/117 tests passed. Thus144 tests reported passing across the two invocations; do not describe this as a clean single full-suite exit. TypeScript/build results are reported separately in the final task reply. No confirmed application failure was reproduced by the live browser acceptance.
