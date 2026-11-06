# Default partition and truck operation contract

2026-11-06. This supersedes the earlier optional/legacy strict-routing descriptions in `final-f1-map-simulation-verification.md`. Uncommitted for user review. Scope: partitioning, fleet responsibility, road routing and playback consistency only.

## Rules applied to every city

- K distinct selected collection heads produce K partitions, each containing its own head. A bin belongs to its road access junction's partition; junction ownership cannot overlap.
- Zoning starts from head distance, removes pockets lacking an internal directed round trip, and attempts to attach those pockets using only unowned nodes and the receiving partition. Unresolvable nodes stay unassigned with warnings. No missing road or reverse direction is invented.
- Every truck binds to exactly one partition for the dispatch. Explicit assignments remain explicit; automatic trucks are deterministically distributed to the least staffed partitions. Fewer trucks than partitions means unserved work, not cross-partition sharing. Depot identity survives zone regeneration.
- Every route search uses only its partition's junctions and roads. No citywide path fallback or inter-partition transfer exists. Trips start/return/unload at that partition's head, respect capacity and cannot duplicate pickups.
- Existing `strictZoneRouting: false` JSON values cannot disable these rules. The optional field is accepted for JSON compatibility but no longer selects a policy. The UI toggle and Any zone wording were removed; automatic assignment shows the actual effective zone in Fleet and Dashboard counts use the same binding function.
- Starting simulation validates dispatch continuity, zone ownership, roads, availability, duplicate pickups, capacity, depot unloading/return and trip totals. Stale crossing plans must be replanned.

## One state for movement and explanation

`truckSnapshot` supplies the map and progress table: current trip, phase, from/to junction, fractional road progress, load and next pickup. There is no truck-index coordinate offset. Moving truck bodies follow road direction while IDs stay upright. Unscheduled assigned trucks appear at their head.

The map draws the current trip per truck, rather than overlaying every future trip at once. Completed legs are faint; remaining legs are dashed; active movement is highlighted with direction. Later trips start from the same depot after unloading. Co-located trucks may overlap truthfully; the fleet/progress table distinguishes their identities and next stops.

Faint partition cells use actual junction ownership and do not form overlapping convex hulls. These are a schematic ownership visualization, not legal geographic boundaries. Road connectivity remains the graph's responsibility. Truck paths and pickups use road access points, not displaced decorative bin-marker centers.

## Verification

- 130 automated tests across 12 files pass; TypeScript production build and `git diff --check` pass.
- New contract tests cover all six templates plus all five ready cities: unique ownership, head membership, internal directed reachability, automatic binding, every road segment, trip continuity, capacity, unloading and exact timeline snapshots. Tests explicitly set the old strict flag false to ensure it cannot bypass the default.
- A stale crossing plan is rejected before playback; idle vehicles remain at their depot; one truck cannot service several partitions even when a connecting road exists.
- Five ready-city real-browser workflows passed after zone regeneration: CRUD/undo, export/import, save/reload, planning, actual clock advancement/truck motion, pause/step, completion, Analytics agreement and mobile captures. Paused DOM marker coordinates/from/to IDs are compared against independently reconstructed plan snapshots to 0.001 canvas units. Captured runtime exceptions: none. Evidence: `build/f1-a-e2e/results-default-partitions.json` and `default-partition-metrics.json`.
- All six retained-template browser journeys also passed under the default, including Amberfort's honestly partial service. Evidence: `build/f1-a-e2e/results-default-templates.json`. Completion assertions distinguish scheduled pickups from pending/unserved demand.
- Visually inspected Rivergate's faint partitions, separate current routes and on-road trucks. Screenshot: `build/final-f1/default-rivergate-routes.png`. Also observed Rivergate progressing to completed pickups in the visible ChatGPT browser. Some in-app automation Pause/Replay attempts timed out; successful headless input checks are distinct from those failures and no successful in-app Pause claim is made.
- An initial Juniper headless reload remained blank past the former readiness timeout, without a captured JavaScript exception. The complete five-city run passed with the longer rendered-content timeout. This is not claimed as a product defect fix.

## Infeasible networks and changed test expectations

Universal partition isolation is stricter than the old shared-road policy. Old directed presets can now have unserved bins. In particular, Amberfort's one-way circuits cannot serve all bins within the generated disjoint partitions; it reports unassigned work instead of crossing another partition. Its roads are preserved because map redesign is locked. The five ready-city baseline inputs all complete their eligible work.

Tests that previously required one truck to serve every zone were replaced with explicit shortage/no-transfer expectations. Progress tests account for completed plus unserved work instead of requiring impossible service. These are intentional operational contract changes, not claims that the former all-service results still hold.

## Review and preservation

Reload the preview to avoid retaining a pre-change in-memory run. Open a fresh ready-city copy, regenerate zones, inspect effective Fleet assignments, plan and simulate at 1×. Review the next-pickup table alongside map movement. Existing saved cities are not overwritten; old saved regions may need explicit regeneration. No hardware/cloud/dependency/deployment work or Git commit/push/merge.
