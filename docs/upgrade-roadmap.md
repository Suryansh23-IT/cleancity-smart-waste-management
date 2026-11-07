> **Superseded scope/status (7 November 2026):** Follow [the locked F1–F4 roadmap](locked-delivery-roadmap.md). F1 complete; F2 backend persistence; F3 existing-software QA/deployment readiness; F4 focused physical acceptance. Road closure/traffic innovation, depot optimization and sensor placement planning are removed. Audit IDs below remain historical traceability, not authorization to build removed/deferred features.

# Approved upgrade planning checkpoint

Approved direction: professional, feature-rich NIT final-year municipal intelligence platform. Baseline application: `f1a8d28`, branch `codex/municipal-platform`. **This checkpoint authorizes documentation only. Each of Upgrade A, B and C requires its own subsequent implementation prompt.** No feature implementation, dependency installation, cloud/hardware work, deployment, push or merge is authorized here.

Preserve [the original audit](product-quality-audit.md), its evidence and all U01–U18 recommendations. N01–N08 are recorded below. Mapping recommendations to a stage does not claim they are implemented or verified.

## Upgrade A — City Studio 2.0 & Premium Map

Core: fix destructive metadata edits, make View read-only, improve validation/recovery and keyboard interaction; create an intuitive city manager, powerful CRUD and bulk authoring; generate customizable irregular, non-rectangular cities with neighborhoods and context. Provide pan/zoom/fit/search/layers and true City/Engineering/Simulation map modes. Show heads, responsibility and selected objects clearly. Preserve manually defined directed weighted graph semantics; visual context never invents connectivity or pixel-derived road costs.

Mapping: **U01, U02, U03, U04, U05, U12, U17**. U13 fleet roster foundations may be prepared here; operational behavior belongs to B.

Acceptance: a new operator can create/save/reload an irregular 30–45-bin city with three heads, mixed-direction roads and bulk edits; harmless rename/layout edits preserve valid zones/fleet restrictions; topology edits invalidate/revalidate affected plans safely; View cannot mutate; all objects remain reachable through camera/search; desktop/mobile and keyboard workflows remain usable at 100 bins. Context and zone outlines are explicitly distinguished from authoritative graph responsibility.

## Upgrade B — Advanced Fleet & Simulation Engine

Depends on A's edit-impact contracts, selection and map modes. Core: time-first versus distance-first objectives, genuine same-zone multi-truck coordination, truck-specific routes/load/progress, route inspection, zone balancing diagnostics, explicit head/depot/unloading operations, waste-stream compatibility, collection commitments and dispatch explanations. Include strong independent algorithm verification.

Mapping: **U06, U07, U08, U13; N01, N03, N07, N08**. U16 initial-location/unloading foundations belong here; its advanced constraints are deferred below.

Acceptance: compare one/two/three trucks under identical inputs; no duplicate pickup, overload, illegal edge or invented return path; explain unserved work and vehicle eligibility; test heterogeneous vehicles, excess fleet, oversized jobs and disconnected graphs. Reproduce and improve the audited idle-truck counterexample under the time-first objective, while honestly reporting any distance/cost increase. Reset/replay restores exact inputs; service completion controls collection events; tiny exact/reference fixtures and invariants independently check the heuristic.

## Upgrade C — Municipal Intelligence & Advanced Operations

Depends on stable A/B contracts and reproducible dispatch results. Core: scenario library with immutable input/result snapshots, comparable experiments, fair operator-defined baselines, explicit distance/time/labor/cost breakdowns, practical exception scenarios and reporting, exportable operational reports, richer seeded forecasting, sustainability accounting, seeded uncertainty trials, measured performance and final refinement.

Mapping: **U09, U10, U11, U14, U15, U16, U18; N02, N04, N05, N06**. U09/U16 and N02/N04 include advanced optional extensions; their placement preserves the recommendations without promising all complexity in the first C release.

Acceptance: compare identical service demand/constraints before claiming savings; retain zero/negative outcomes; reports reconcile jobs, edges, distance, elapsed fleet time and summed vehicle time. Seeded scenarios/uncertainty trials reproduce results; forecast history quality and assumptions remain visible; emissions are modeled, not measured. Record repeated planning/rendering measurements at 10/20/50/100 bins. Exceptions cannot erase completed jobs or teleport vehicles. Advanced dynamic incidents proceed only after state/version/load preservation is demonstrably reliable.

## Additional recommendations N01–N08

| ID | Capability and practical purpose | Interaction and engineering requirement | Complexity / impact | Stage / status |
| --- | --- | --- | --- | --- |
| N01 | Waste-stream compatibility: prevent unsuitable collections | Bin stream and truck capability controls; hard compatibility filter before routing/capacity; single compartment first | Medium / High | B core; multi-compartment optimization deferred |
| N02 | Turn restrictions and vehicle access classes | Junction incoming→outgoing prohibitions and road access classes; incoming-edge path state plus vehicle filtering | Medium–Large / High technical value | C advanced optional; preserve for later authorization |
| N03 | Collection commitments: distinguish due/overdue from full | Virtual service interval, last collection, priority/window controls; deadline, waiting and lateness calculations | Medium / High | B core due/overdue commitments; complex recurring windows advanced |
| N04 | Crew/handling feasibility | Crew size/equipment and job requirement controls; compatibility checks and explicit service durations | Small–Medium / Medium–High | C advanced optional; assumptions are not staffing-law claims |
| N05 | Uncertainty-aware planning | Declared ranges/reserve and seeded trial controls; bounded repeated planning with coverage/time/capacity summaries | Medium / High analytical value | C core bounded experiments; outcomes are model frequencies, not calibrated probabilities |
| N06 | Energy/emissions accounting | Editable illustrative factors; separate travel and idle/service contributions derived from states | Small–Medium / Medium | C core simple model; no measured environmental-savings claim |
| N07 | Algorithm verification laboratory | Tiny known graphs, independent path reference, exact tiny stop-order oracle and invariant results | Medium / Very high academic value | B core; tiny oracle is not a large-city optimality proof |
| N08 | Explainable dispatch | Job decision panel; structured reasons for eligibility, reachability, capacity exclusion, priorities and tie-breaks | Medium / High | B core; explain actual decisions rather than imply optimality |

## Completeness and scope controls

- All **26 recommendations** remain mapped: A U01–U05/U12/U17; B U06–U08/U13 and N01/N03/N07/N08; C U09–U11/U14–U16/U18 and N02/N04–N06. Cross-stage foundations above are dependencies, not duplicate features.
- Advanced optional: mid-route closures/breakdowns/emergency reassignment (U09), complex unloading queues/shift constraints (U16), detailed turn/access rules (N02), crew/equipment constraints (N04), recurring service windows (N03), and multi-compartment collection (N01). Do not silently drop them; review after the core foundations and retain explicit deferred status.
- Implement each stage in verified vertical slices, preserving existing data, source history and simulator/physical separation. Do not replace the graph engine merely for visual polish. No Google Maps APIs, paid map dependencies, fake AI or unsupported real-world savings claims.
- Scope additions or optional promotions require a later explicit decision. Cloud and physical integration remain separate; these three prompts do not authorize their configuration or deployment.

Next action: stop after the documentation commit and await the **Upgrade A implementation prompt**.

## Upgrade A execution record — 5 November 2026

A separate implementation prompt authorized Upgrade A after this planning checkpoint. City Studio authoring, irregular generation, layered map navigation and editing/status corrections are now implemented. See [the Upgrade A verification record](upgrade-a-verification.md) for exact coverage, real browser evidence, automated gates and deliberate limitations. The audit and U01–U18/N01–N08 mappings above remain preserved. Upgrade B and C implementation has not started; each still requires its own authorization.
