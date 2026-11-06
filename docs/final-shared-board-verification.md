# Shared physical/digital showcase board verification

Verified 7 November 2026. The user approved the map and authorized a local checkpoint after a visible ChatGPT-browser demonstration.

## Approved map lock and complete demonstration

The user approved this layout on 7 November 2026 for the Physical IoT Lab. No redesign or application feature changes were made during the final demo verification.

The exported City JSON's nodes, directed roads, bins, zones and truck were compared with the current digital factory and matched. The exported SVG exactly matched the renderer invoked on that JSON. The existing PNG print preview and actual application screenshots were visually reviewed against this layout.

A fresh isolated Chrome run opened Physical IoT Lab, opened the showcase, previewed unavailable physical inputs, explicitly captured TEST fixtures, saved the snapshot, planned dispatch, started playback, paused, finished and inspected Analytics. Physical API requests were intercepted as unavailable, so neither hardware nor user calibration/history was accessed. An additional browser assertion confirmed the truck's SVG position changed over time; completion assertions confirmed its graph position was depot → depot. Snapshot controls were disabled during the active run. Mobile layout and saved-input reload passed without uncaught application exceptions.

The four channels map one-to-one to BIN-001–004. Virtual BIN-005–010 retain 19–24% fill, below the 80% pickup threshold. Exactly BIN-001–004 were eligible and completed; no virtual pickup was forced. Directed-edge legality and depot return were checked for every trip, with loads bounded by the truck's three-unit capacity. Two trips completed, including unloading. Frozen TEST provenance remained unchanged.

Analytics and engine results agreed: 6.133333 modeled km, 36.4 virtual minutes, 36.4 vehicle labor minutes, INR 171.066667 at INR 18/km plus INR 100/vehicle-hour; four completed, zero remaining and zero pending. Same-demand fixed-order and heuristic costs were equal (zero savings). The distinct all-ten-bin policy comparison showed approximately INR 317 versus INR 171, or INR 146 estimated savings (46.1%); this defers six low-fill bins and does not claim equal-coverage routing improvement.

Fresh full regression: 149/149 tests passed across 16 files; TypeScript, production build and Git diff whitespace checks passed. No blocking defect was found. Application-only screenshots and text evidence are in ignored `build/f1-a-e2e/`, including `showcase-map-detail.png`, `showcase-dispatch.png`, `showcase-simulation-detail.png`, `showcase-analytics-detail.png`, `showcase-mobile.png`, `demo-completed.txt`, `demo-analytics.txt` and `final-demo-engine.json`. No commit, hardware operation or deployment was performed. Existing untracked root preview PNG was preserved.

## Shared layout

`src/core/showcaseLayout.ts` supplies the digital background, graph, bin positions and printable SVG. The dedicated showcase has a 900 × 600 unit board (one unit = 1 mm), ten bins, one zone, one depot and one capacity-aware truck. Its reference-inspired loop network has 112 graph nodes and 246 directed roads. All geometric road meetings are actual junctions; the depot has one access connection. Other eleven scenarios remain intact.

Four red mounting pads carry BIN-001–004; six green virtual bins begin at low modeled fill. A1/A3 identify Central West Street access, A2 Central East Street and A4 South Street. Dashed red guides associate mounting locations with access nodes; they are not truck routes. The print has no collection-route overlay.

## Outputs

Run `node scripts/export-showcase-board.cjs` for shared SVG, City JSON, placement CSV and print HTML in `build/output/pdf/cleancity-board/`. The supplied PDF was printed as vector artwork using isolated Chrome, normalized to exactly 90 × 60 cm using pypdf, and rendered for inspection. Preview PNG is approximately 5400 × 3600 pixels. Generated artifacts remain ignored by Git.

## Verification

- New layout regressions check return reachability, alternative paths, single depot access, mounting-pad clearance and shared exported geometry.
- TEST snapshot: four eligible physical-derived fixture bins, six low-fill virtual bins skipped, two capacity-aware trips, no pending pickups. Modeled totals: 6.133333 km and 36.4 minutes. Road weights are illustrative municipal model distances, not measured physical or geographic distances.
- Isolated Chrome journey passed: unavailable sensor feedback, explicitly labeled TEST preview/capture, saved snapshot, City Studio, dispatch, animated playback, active-run snapshot lock, completed analytics, mobile overflow check and reload persistence. Physical API was intercepted; no COM port was opened.
- Reviewed rendered browser map and print preview. Red roadside pads, access labels, loop roads, parks and depot are visible. Engineering/edit mode retains actual graph controls.
- Full regression: 149 tests passed in 16 files. TypeScript and production build passed; Git whitespace check passed. Sandbox initially blocked two loopback API tests with EACCES; both passed in the complete rerun with local networking permitted.

## Physical acceptance still required

The four reserved pads are 6 × 5.5 cm, assuming bin footprints no larger than 5 × 4.5 cm. Actual dimensions, wire routing/slack, mounting and vehicle turning space require confirmation by the physical team before printing or construction. Placement CSV uses centimeters from the top-left. No wiring, firmware, calibration or physical accuracy was verified in this task. Existing telemetry and calibration behavior is preserved; simulated collection never alters physical readings.

## Visible ChatGPT-browser acceptance and checkpoint

The app was opened visibly at localhost:5182 in the ChatGPT browser. Its old two-zone saved prototype was preserved. Opening a fresh showcase loaded the approved 112-node/246-road, one-zone map. A TEST preview older than ten seconds was rejected; a fresh preview/capture succeeded. Dispatch, Start collection and automatic completion were observed, followed by Analytics showing four completed pickups, zero remaining, 6.13 km, 36.4 minutes and INR 171. The truck completion table showed depot → depot and zero load. The results tab was left open for the user. Screenshot: ignored `build/f1-a-e2e/chatgpt-browser-final.png`.

The visible run exposed a compatibility issue: legacy showcase saves could display the new board context. A minimal guard now limits the board renderer/source-color legend to graphs containing the board's depot/access identities; old saved graphs and their source data are unchanged. A regression covers this distinction. Final checkpoint validation: 150 tests across 16 files, TypeScript and production build (results confirmed before commit). Only reviewed source, tests, exporter and this report belong in the commit; the untracked root PNG and generated outputs are excluded. No push or merge is authorized.
