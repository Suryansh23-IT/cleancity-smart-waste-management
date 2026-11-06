# F1-A frontend review checkpoint

## Six-city replacement — latest review checkpoint

The active curated collection is now six authored City-v1 fixtures from `src/core/curated.ts`, not six seeded variations of the old radial generator. Custom generation, legacy JSON/presets, the separate guided capacity-exception demo and existing saved user cities remain compatible. No localStorage migration/reset was performed.

| City | Junctions (includes heads) | Directed roads | Bins | Zones | Heads | Trucks | Design and operating purpose |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Cedar Market Town | 12 | 38 | 12 | 1 | 1 | 1 | Two market squares and short local links; beginner round |
| Meadowbrook Gardens | 30 | 86 | 36 | 3 | 3 | 3 | Connected residential blocks and central avenue |
| Willowbridge Riverside | 28 | 88 | 32 | 2 | 2 | Two irregular banks; exactly two two-way bridge crossings |
| Ironworks Estate | 24 | 60 | 30 | 2 | 2 | Logistics corridors, warehouse context, 1.8-unit industrial bins and larger vehicles |
| Amberfort Old Quarter | 36 | 60 | 45 | 2 | 2 | Irregular nested one-way circuits and connecting passages |
| Aster Metropolitan | 72 | 264 | 100 | 4 | 4 | 8 | Six orbital roads, twelve radial avenues and four outer depots |

Every fixture has deterministic identifiers/history, explicit road kilometres, legitimate access nodes, assigned zones/heads/trucks and nonzero pickup demand. Pixel spacing does not determine distance. Non-routing river and warehouse geometry renders below actual graph streets. Riverside tests prove that the only bank-to-bank edges are the two named bridges, each represented by two directed links. Context uses existing descriptive City metadata; no schema field or algorithm was added. Editing away the contextual phrase removes that optional decorative theme.

| City | Plan generated | Simulation finished | Completed pickups | Pending / reasons | Modeled distance km | Fleet completion min | Analytics |
| --- | --- | --- | ---: | --- | ---: | ---: | --- |
| Cedar | PASS | PASS | 8 | 0 / none | 3.76 | 42.28 | PASS |
| Meadowbrook | PASS | PASS | 23 | 0 / none | 9.64 | 47.52 | PASS |
| Willowbridge | PASS | PASS | 20 | 0 / none | 10.14 | 50.98 | PASS |
| Ironworks | PASS | PASS | 19 | 0 / none | 17.68 | 65.88 | PASS |
| Amberfort | PASS | PASS | 29 | 0 / none | 25.20 | 93.88 | PASS |
| Aster | PASS | PASS | 63 | 0 / none | 34.42 | 44.43 | PASS |

These are model-derived estimates, not geographic travel observations or optimality claims. Only bins meeting the pickup threshold are collected; other bins are not counted as missed/unserved. All six are intentionally feasible. The separate existing guided demo still covers the deliberate capacity exception.

### Per-city browser evidence

Run `scripts/f1-a-browser.cjs` with `CLEANCITY_TEST_URL=http://127.0.0.1:5178` and `CLEANCITY_SIX_CITIES=1` against the local preview. Final isolated installed-Chrome run passed **all six complete journeys** with no observed uncaught application exceptions. No existing user profile, desktop window or screen capture was used.

For EACH city, the runner:

- Opens Cities, chooses the named template, enters Studio and captures the actual map.
- Searches for a depot and inspects its HEAD property; inspects the zone from the operations workspace.
- Creates a bin, changes its name, deletes it with confirmation and undoes back to original demand.
- Creates/edits a junction, undoes it; creates two temporary junctions and a new directed-road pair, deletes a direction and recovers/undoes the exercise.
- Inspects/renames an existing road, undoes it; verifies original node/road/bin/zone counts were restored.
- Saves an independent working copy, downloads actual JSON, imports that file into another new identity, saves and reloads it.
- Opens fleet operations, plans collection, starts/pauses playback, advances one virtual minute, captures moving state, finishes the run and checks exact completed-stop count.
- Opens Analytics and checks the displayed planned distance against the original fixture plan.

Representative Riverside and Metro flows also use a 390px emulated mobile viewport, check page overflow and capture their map. All six use 1536×816 desktop viewports. These are automated browser interactions, not six full manual phone sessions. Free-form drag and every secondary setting remain outside this runner's coverage.

Artifacts under ignored `build/f1-a-e2e/`:

- `city-1-desktop.png` through `city-6-desktop.png`: six full maps.
- For each index: `city-N-moving.png`, `city-N-complete.png`, `city-N-analytics.png`.
- `city-3-mobile.png`, `city-6-mobile.png`.
- `six-city-metrics.json` and `results.json`: inputs/counts/estimates and final pass records.

Screenshots were visually reviewed during execution, including Riverside's bridge barrier, industrial warehouses, historic asymmetry and Metro marker density. Screenshot framing was corrected to show the complete map panel. Intermediate automation failures were selector/label and asynchronous import-completion issues; the harness now handles SVG controls, the actual Plan collection button and import completion. They were not hidden as application passes. No engine bug was established by those failures.

### Regression and boundaries

Eight new curated tests cover deterministic creation, City schema, uniqueness/reference validation, finite directed head/bin round trips, fleet assignments, nonzero demand, expanded legal route edges, capacity, exact completed stops, cleared collected fills, distance reconciliation and explicit river crossings. Existing template workflow tests now target the replacement names/counts while still testing saved-city preservation.

Final completed suite: 96 tests passed across 11 files in 13.36 seconds. TypeScript, production build (1605 modules), and Git diff checks passed. Algorithms, storage contract, dependencies and user saved cities remain unchanged. Changes are uncommitted. No F2/F3, cloud, hardware, deployment, push or merge.

User review: refresh the local frontend → Cities → choose one of the six new names → inspect Studio → Continue to dispatch → Plan collection → Start collection → Finish run → Analytics. Saving a working copy never overwrites a template or deletes old saved cities. Visual acceptance remains the user's decision.

## A-to-Z stabilization — latest evidence, 6 November 2026

This section supersedes the earlier browser-blocked status below. Work remains uncommitted; no user acceptance is claimed.

### Browser blocker resolved

The sandbox denied localhost sockets. Installed Chrome could launch headlessly outside it, but could not reach the sandboxed Vite listener. Starting Vite and isolated Chrome on the same host-local network resolved the failure. This was a tooling/network boundary, not a proven frontend startup defect. No Playwright package/browser download or dependency installation was needed.

Reproducible runner: `scripts/f1-a-browser.cjs`; start Vite on port 5178 and set `CLEANCITY_TEST_URL=http://127.0.0.1:5178` before running `node scripts/f1-a-browser.cjs`. It launches installed Chrome headlessly through CDP with a fresh temporary profile, disables extensions, uses no existing user data/windows and closes its own browser. Generated artifacts stay in ignored `build/f1-a-e2e`. Cleanup checks the owned temporary-profile prefix. A free local debugging port 9337 is required. No native screen capture or desktop/window interaction occurred.

Final results: **11 headless journeys PASS**, zero observed uncaught application exceptions in those journeys; **88 Vitest tests PASS across 10 files**, 17.90 seconds; TypeScript PASS; production build PASS; Git diff whitespace checks PASS. Browser timings in `results.json` are test-step timings, not planning p95/rendering benchmarks. This is one installed Chromium engine, not cross-browser certification.

### Confirmed defects and fixes

1. **Major — misleading persistence with unapplied inspector fields.** Header Save city could save the old model while the visible form contained newer values. `App.tsx`/`Inspector.tsx` now track named buffered fields, block misleading saves, warn on navigation/map selection/inspector close, and clear the draft flag after successful property application. Immediate zone reassignment controls do not falsely mark a buffered draft. A new regression proves rejected header saving, cancelled navigation preserving fields and successful apply-then-save persistence.
2. **Usability — overlapping direct-form junctions.** Successive junctions started at identical map-center coordinates; screenshot review showed collapsed roads and extreme fitting. `StudioCreate.tsx` now spaces initial placements deterministically, retains drag positioning and changes no routing distances. A regression checks distinct placement. Tiny networks can still magnify on fit; this is not a large-city map defect.
3. The first headless object-list selector assumed textContent contained visual spacing. Corrected the harness to normalize rendered innerText; this was not counted as an application bug.

### Verification matrix

PASS below applies to the stated method and observed slice. No row claims every alternate field/gesture was browser-tested.

| Workflow | Method / result | Observed evidence, fixes and remaining risk |
| --- | --- | --- |
| Dashboard initial state/map | Headless PASS | Municipal heading, interactive SVG objects, screenshot; KPI formula behavior also covered by core/DOM tests |
| Urgent/pending alert actions | DOM integration PASS | Actual exception filtering and capacity recovery regression; not all alerts independently clicked in headless runner |
| Beginner template journey | Headless PASS | Cities has six cards; Riverside opens as independent working city, saves 20 bins |
| Named empty city | Headless PASS | Create dialog, blank layout, Studio handoff |
| Seeded generation | DOM/unit PASS | Generator validation/reproducibility and curated seeded inputs; every wizard seed edge not browser-tested |
| Junction create/read | Headless + regression PASS | Two named places, distinct initial positions; edit/delete dependencies covered below |
| Road create/direction | Headless PASS | Two-way form persists two directed links with reversed endpoints; one-way/path legality also core-tested |
| Bin create/read/update | Headless PASS | Named bin, selected inspector, edited name persisted |
| Delete/recover bin | Headless PASS | Confirmation, delete, undo, redo and final restoration |
| Connected junction deletion | DOM/unit PASS | Refused until dependencies removed; model retained; not manually repeated in browser |
| Junction/road property editing | DOM integration PASS | Directed road edit, invalidation and undo regression; not every property combination independently exercised headlessly |
| Collection-head type | Unit/static PASS | Existing type selector/schema preserved; independent full browser CRUD NOT TESTED |
| Zones/truck assignments | DOM/unit PASS | Existing generation, fleet availability, workloads and assignments regressions; full browser per-field CRUD NOT TESTED |
| Library duplicate/rename/delete | DOM integration PASS | Independent identities, rename persistence, confirmed deletion and other-city retention; no library-delete undo advertised |
| Library search | Static review PASS; headless NOT TESTED | Name/description filter retained; all query edge cases not independently exercised |
| Save/reload/edit | Headless PASS | Saved asset counts and names read from isolated localStorage, reload restores city |
| Save & open | Headless + DOM PASS | Draft Square retained; prior Riverside save preserved; unapplied-field save now separately guarded |
| Cancel/discard protection | DOM integration PASS | Existing load/modal protection and new cancellation regression; all combinations not headlessly enumerated |
| Actual export/reimport | Headless PASS | JSON download contains 100 bins; file input reimport creates new saved identity |
| Invalid JSON | Headless PASS | Malformed file raises alert; saved-library count unchanged |
| Duplicate IDs/invalid graph/units | Unit PASS | Existing model and core validation retained; not all invalid payloads fed through browser file input |
| Corrupt localStorage | Headless PASS | Isolated malformed value survives Save unchanged; honest error shown |
| Storage count/quota limits | Static/unit boundary review; browser BLOCKED/NOT TESTED | 50-city guard exists; actual browser quota exhaustion NOT TESTED; no quota-success claim |
| Map fit/zoom, 100 bins | Headless PASS | Fit and zoom actions, saved 100-bin city and screenshot; no measured frame-rate target claim |
| Map search/layers/read-only | DOM/component PASS | Existing selection/search/declutter/mode regressions; every layer combination not headlessly enumerated |
| Drag/pan/touch gestures | NOT TESTED in latest headless suite | No claim of complete pointer/touch acceptance; direct-form creation avoids relying on dragging for initial placement |
| Tablet/mobile | Headless PASS | 768 and 390 CSS-pixel navigation, creation dialog, focused first input, screenshot and no page-level horizontal overflow at tested states |
| Keyboard/focus | DOM + limited headless PASS | Modal trap/Escape regression and actual initial input focus; full keyboard-only A–G journeys/screen-reader audit NOT TESTED |
| Downstream dispatch/simulation/Analytics | Headless PASS | Guided plan → Start → Pause → Step → Finish → completed heading → Analytics; detailed algorithm behavior also core-tested |
| Physical separation | Unit/DOM PASS | Existing physical failure/validation tests; no physical/cloud work or connectivity claim |

### Screenshot review and readiness

Fresh headless PNGs: `dashboard-desktop.png`, `cities-desktop.png`, `studio-desktop.png`, `studio-100.png`, `cities-768.png`, `cities-390.png`, `create-768.png`, `create-390.png`. `results.json` records checks and observed exceptions. These are application-viewport captures, not screenshots of the user's screen. Mobile creation and tablet library screenshots were visually inspected; desktop Studio inspection exposed the overlapping-junction defect.

CRUD foundations are supported by real Chrome plus regression evidence. Source/code and saved-data compatibility remain intact. Human usability is improved by named creation, explicit save layers and recoverable editor actions; property application versus whole-city saving still takes two deliberate steps. Advanced zone/fleet editing remains on its existing screen. No 9/10 rating or exhaustive manual verification is claimed.

Recommendation: ready for a **targeted user visual/usability review**, not unconditional final sign-off. Remaining checks are complete keyboard-only navigation, drag/pan/touch interaction, true quota exhaustion, and independently exercising every head/zone/truck property and secondary control. No known failing tested journey remains; untested paths are explicitly listed. No commit, push, merge, backend, cloud or deployment action.

## F1-A FINAL POLISH — subsequent uncommitted refinement

The new polish brief authorizes source/terminal work only. **No desktop, browser, window or capture tools were used for this refinement. Previous screenshots below are historical and do not verify the final-polish appearance. Fresh browser access requires explicit permission.**

Source audit found indirect bin/road creation through junction selection, duplicate city actions, exposed technical details, ambiguous property-save versus city-save language, and a switch-city confirmation that required cancelling to save first.

Implemented a named Add to city form for junctions, bins and roads, with readable place selectors, required defaults, road-direction guidance, inline errors and empty-network prerequisites. Two-way roads still create two directed links; graph validation, edit invalidation and algorithms are unchanged. Successful additions select the created object and use existing undo history. Existing contextual creation and bulk tools remain available.

Switching cities now offers Cancel, Save & open and Discard & open. The save path validates/persists before changing the active city, leaves the confirmation open if saving fails, and never clears existing storage. Existing saved copies and run-history limitations remain explicit.

Inspector technical references, exact map coordinates and marker/history details are progressively disclosed. Common properties, duplication and deletion stay available. Property application has its own feedback; the header says Save city for browser persistence. Deletion explains linked-junction restrictions, per-direction road removal and zone/truck implications, with undo described only for successful editor operations. The Cities screen removes the duplicate global save/demo controls, labels copy/export/delete actions, and explains examples versus working copies. Dashboard KPI labels use ordinary operational language.

Terminal evidence: **87 tests passed across 10 files**; TypeScript passed; production build passed (1604 modules). New regressions create two named junctions, a two-way road and a bin using the beginner forms, verify persistence/directions, undo the bin addition, and save a draft before opening another city. Existing CRUD, invalid input/import, dependency-safe deletion, corrupt storage, read-only maps, bulk edits, 100-bin and downstream simulation/analytics regressions remain passing. An intermediate JSX grouping error was corrected before the passing run.

CRUD boundary: city lifecycle, junction/road/bin creation and property/deletion guidance improved; existing zone and truck editors are preserved, with Studio's direct dispatch navigation retained. No new zone/fleet engine work or remaining-F1 screen rebuild was performed. Browser-library deletion remains permanent for that saved copy; no new library-delete undo is claimed.

Awaiting permission: manual desktop/mobile A–G journeys, keyboard/focus behavior in an actual browser, final layout/spacing review and fresh screenshots. DOM tests are not visual acceptance. User review should start with Cities → Create city → empty canvas → Add junctions/road/bin → Save city → reload, then edit/delete/undo and proceed to Dispatch. Keep all changes uncommitted until visual approval.

Subsequent authorization allowed the ChatGPT in-app browser and its screenshots only. A temporary Vite preview on port 5176 started successfully. The in-app browser's localhost navigation returned `net::ERR_CONNECTION_TIMED_OUT`; its network-address attempt timed out on `Page.navigate`. No successful app rendering or fresh screenshot resulted. No native desktop/window/capture fallback was used. The temporary listener was stopped. Final-polish visual acceptance remains blocked by preview connectivity; a local user review or another explicitly authorized browser method is needed.

6 November 2026. Base: `137858af58fa2068af76a2b17272c39738ae1aa4`, branch `codex/municipal-platform`. **Uncommitted for visual approval.** No backend, MongoDB, cloud, hardware, deployment, push or merge.

## Implemented

- Dashboard: compact operational summaries; desktop map and next-step panel together instead of a large introductory banner above the map; real urgent/pending actions, workflow navigation and existing bin inspection retained.
- Cities: dedicated navigation/workspace; six seeded irregular scenarios with actual-network previews and counts; template working copies; searchable library; named blank/generated creation; current-city save/export; import validation; view/edit/duplicate/export; saved-city rename and confirmed delete. Templates do not overwrite browser saves.
- Studio: map precedes bulk tools; contextual searchable bins/places/roads list; selected-object forms preserved; file/preset actions disclosed separately; fill/settings menu; explicit browser save state; direct library/dispatch navigation. Existing graph authoring, undo/redo, road/bin controls and bulk operations remain.
- Shared white/green product surfaces, consistent controls and responsive layouts. Small screens use a navigation drawer instead of a permanent narrow rail; inspector follows map on mobile.

## Automated evidence

`npm test`: **85 passed, 10 files**, final completed run 30.19 seconds. Added three integration cases covering independent curated copies/existing-save preservation, named creation/rename/delete and Studio object inspection without graph changes. Existing directed-road, capacity recovery, plan/simulation/results, import/JSON, corrupt-storage, 100-bin, forecasting and physical-source separation regressions remain passing.

`npm run typecheck`: passed. `npm run build`: passed (TypeScript and Vite, 1603 modules). `git diff --check`: passed after removing trailing blank lines. UI integration timeout allows 15 seconds for large accessible SVG/jsdom workflows; no assertions were disabled. A stale marketing-copy assertion was updated to the new operational description.

Sandboxed Vitest attempts stalled after individual files; a threads attempt also reported a runner startup timeout. Those attempts are not counted as passing suites. The standard full command completed successfully outside the sandbox. No dependency or test-runner configuration file was changed.

## Actual browser evidence

Used native Google Chrome after the in-app browser could not reach localhost. Frontend was inspected before implementation and again after changes. Existing local Vite at port 5174 served the same workspace; an additional development listener at 5175 was started during diagnosis. No deployment occurred.

Desktop capture: 1536 × 816 browser window. Mobile inspection: Chrome responsive device emulation at 390 CSS pixels, not a physical phone.

- Navigated Dashboard → Cities → selected Metro District → Dashboard → Studio; inspected the actual 100-bin road network and markers.
- Saved Metro District, reloaded the browser and observed `Saved city loaded`, 100 bins, with the same city identity/name. Run history was not claimed persisted.
- Opened the mobile create dialog, entered `F1-A Browser Review`, created a 40-bin city and observed its independent unsaved Studio workspace.
- Scrolled the mobile map and selected BIN-034; contextual properties showed its actual 49% fill. Camera zoom changed during map inspection, confirming wheel interaction remained active.
- Observed desktop/mobile hierarchy, map controls, drawer entry, creation form, wrapping toolbars, library and inspector. Inspection prompted compact fill/settings controls and removal of the permanent mobile navigation rail.
- Saved the browser-created review city; Studio displayed `Saved in this browser`. Opened the guided demo, observed its one-unserved-pickup action, started simulation and observed completion at 48.6 virtual minutes with 24 completed stops. Continued to Analytics for results verification.

Automated DOM tests cover more CRUD and downstream simulation paths than were manually exercised. Do not interpret the screenshot set as manual verification of every control, file download or every mobile gesture.

Screenshots are review artifacts outside the repository, under:

the local review artifact directory (not committed)

- `dashboard-desktop.jpg`, `cities-desktop.jpg`, `studio-desktop.jpg`
- `dashboard-mobile.jpg`, `cities-mobile.jpg`, `studio-mobile.jpg`, `studio-mobile-map.jpg`

Captures include browser chrome; mobile captures include the device-tools panel. They show different stages of the review, including the 100-bin city and a newly created 40-bin draft. An initial capture targeted the foreground Codex window incorrectly; it was removed and replaced with a verified Chrome capture.

## Limits and review gate

Chrome displayed `Unchecked runtime.lastError: The message port closed before a response was received` without an application stack. Application source has no chrome.runtime usage; the warning was not established as an application defect. Do not claim an entirely clean browser console. No other browser engine or physical mobile device was tested.

Persistence is browser-local and origin-specific. JSON backups remain necessary; no shared accounts, database saving, immutable run persistence or cloud connectivity is claimed. The six frontend scenarios are demonstration inputs, not F3 incident/optimization implementations. Existing algorithms, City JSON format, dependencies and saved-city storage contract are unchanged.

Visual quality remains subject to the user's review. Do not commit until visual approval. F1-B/F2/F3 and deployment require their own authorization.
