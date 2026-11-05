# Upgrade A — City Studio and map verification

Implemented from `ca8893b` on `codex/municipal-platform`, 5 November 2026, under the separate Upgrade A implementation brief. The original audit and all 26 recommendations remain preserved. This record supplements the planning-only roadmap; it does not authorize B or C.

## Delivered scope

- **U01/U02/U03:** Larger light map workspace with collapsible authoring tools, non-routing neighborhood/park/block context, arterial/local road casing, head symbols, status markers, selected-object outlines and restrained illustrative zone hulls. View hides junction handles and directions; Engineering exposes them and bin/access-node links; Simulation defaults to one truck's routes and permits vehicle selection. Completed and unscheduled pickups have separate rings.
- **U04:** SVG camera with wheel zoom (page scroll prevented over the map), drag-to-pan, fit/reset, bounded zoom buttons, keyboard arrow panning/Home, search across nodes/heads/roads/bins, focus/selection and context/zone/bin/route switches. Inverse screen transforms handle hit coordinates; panning uses the actual rendered SVG scale, including letterboxing.
- **U05/U12:** Seeded irregular district generator (6–160 junctions, 1–200 bins, 1–6 districts/heads), configurable name, scale, optional-link density and one-way bias. A connected bidirectional local backbone and directed head cycle preserve return paths. Geometry, weights, IDs and fills are deterministic; the UI gives each generated scenario a fresh storage ID to protect previous saves. Existing 10/20/50/100-bin presets remain unchanged.
- **U12/U17:** City rename, existing new/duplicate/save/delete/import/export library flows, batch bin placement, name-filtered bulk fill/deletion with confirmation, bin duplication, independent marker dragging and numeric X/Y editing, reset marker to access node, reversible edits, explicit road hierarchy and duplicate-edge prevention. Existing node-to-target connection form supports one/two-way roads; road reverse/add-reverse controls remain available.
- **U17/relevant U13:** Harmless node/road naming, visual-coordinate and hierarchy edits preserve zones, truck restrictions and valid plans. Demand/operational changes invalidate plans; graph/weight/speed changes require zone regeneration. View inspectors are disabled, mutation handlers reject View/Simulation edits, and inspectors provide an explicit transition into City Studio. Unavailable vehicles are labelled UNAVAILABLE in progress summaries before and during runs.

Existing local-storage validation, corrupt-data preservation, quota-error feedback, export recovery, dirty-change confirmations, modal keyboard handling and physical/simulated data separation remain in place. No scheduler redesign, new runtime dependency, cloud connection, hardware operation or deployment was introduced.

## Actual browser evaluation

Used the local production preview and the in-app graphical browser. These are UI operations, separate from automated DOM tests.

| Scenario | Observed result |
| --- | --- |
| Irregular custom city | Generated 40 bins / 24 junctions / three heads through the form; mixed fill levels and directed roads. Generated three zones, zero feasibility warnings. |
| Fleet and persistence | Added five trucks through the UI; restricted two to Zone 1, two to Zone 2 and one to Zone 3. Saved and reloaded: 40 bins, three zones and five trucks retained. Renamed a head; zones and restrictions survived. |
| Collection | Eight eligible pickups, three trips, zero pending. Stepped playback to completion: 8 collected, 0 remaining, 6.67 / 6.67 km and 24.3 / 24.3 virtual minutes. Reset restored the dispatch inputs. Two excess trucks stayed idle under the existing scheduler; same-zone time balancing belongs to B. |
| 100 bins | Generated 100 bins / 60 junctions. All 100 markers rendered. Search selected BIN-100, toggling bins removed/restored the layer, fit/reset and zoom worked. Also generated a fresh 100-bin city after refining optional local links. |
| Camera and dragging | Keyboard pan and actual background drag changed the viewBox. Wheel-up reduced the viewBox extent. At 180% zoom, dragged BIN-100: marker X/Y changed while road access remained j39. Undo/redo, save and reload worked. |
| Import/export | Downloaded the 100-bin JSON and imported it through the actual file chooser. The loaded copy retained 100 bins; saved separately. Download/scenarios are local QA data, excluded from Git. |
| Responsive | Inspected desktop at 1440×1000 and mobile viewport at 390×844. Mobile document width was 375 at viewport width 390 (no horizontal overflow). Search and numeric marker-position editing worked; inspector stacks below the map. This is responsive emulation, not physical touchscreen testing. |

Screenshots were saved outside the repository in the session visualization directory as `upgrade-a-mobile.png` and `upgrade-a-desktop.png`. Final browser console and automated gate results are recorded below after verification.

## Limits and deliberate choices

- Context blocks, parks and zone hulls are illustrations, not cadastral boundaries. Graph node/edge and explicit bin responsibility data remain authoritative. Visual crossings do not create connectivity.
- Generator scale initializes explicit kilometre weights; subsequent visual dragging never recomputes them. One-way bias governs optional reverse links, not an exact requested percentage of all roads. The safe backbone is retained at all bias settings. Density similarly controls additional local-link attempts.
- This is a synthetic district generator, not an arbitrary polygon-boundary or real-road GIS importer. No real traffic/GPS/map API is implied. Exact city geography, drag-to-draw streets and full multi-select gestures are not provided; node connection forms and name-filtered bulk operations supply the approved equivalent workflows.
- At 100 bins, labels are selective; use search/zoom for close neighbors. There is no marker clustering, minimap or pinch-zoom gesture. Mouse/touch pointer drag and keyboard/numeric alternatives exist; physical touch behavior remains unverified.
- Graph/road-cost edits conservatively clear zones and truck restrictions with a warning and undo recovery. Metadata and marker/layout edits preserve them. Incremental zoning after genuine topology changes remains a later optimization.
- B retains dispatch objectives, stronger workload sharing, streams, depot/unloading redesign and algorithm comparisons. C retains immutable scenario/result snapshots, comparative experiments, reporting, richer forecasts, uncertainty and advanced incidents. The existing roadmap keeps all U01–U18/N01–N08 mappings.

## Automated gates

The test command excludes ignored `build/**` audit experiments so results count maintained project tests rather than temporary audit artifacts. No tests or runtime dependencies were removed. The 100-bin end-to-end DOM test has a 20-second allowance after one observed five-second timeout on a slow run; its assertions remain intact.

Final results on the checkpoint source:

- `npm test`: **69 passed**, seven maintained test files (30.40 seconds). Includes existing 56 tests plus 13 additional cases for generation, shared-zone fleet compatibility, edit classification, batch operations, position/JSON validation, unavailable vehicles, View/edit regressions, undo/redo, search/layers and camera transforms.
- `npm run typecheck`: passed.
- `npm run build`: passed; 1,596 transformed modules, JS 320.24 kB / 100.64 kB gzip, CSS 32.61 kB / 7.70 kB gzip.
- Final production browser check: no captured warning/error console entries. Confirmed operations inspectors disable mutation until **Edit selected object**, retained Zone 1 truck restriction, and selecting Truck 5 switches the Simulation route legend to that vehicle.
- Final desktop/mobile screenshots captured from the production build; temporary viewport override reset. No physical touch, hardware, cloud or deployment verification claimed.
- `git diff --check`: passed before staging. Source, tests and documentation only; generated builds, downloads, screenshots and local scenarios are excluded from the checkpoint.
