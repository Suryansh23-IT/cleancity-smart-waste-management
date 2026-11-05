# UX rescue verification — 6 November 2026

Closure of the work begun at 569437b on codex/municipal-platform. Previous uncommitted implementation preserved; no additional redesign during closure.

## Delivered

Task-specific Dashboard, City Studio, Zone & Fleet, Simulator, Analytics and separate Physical IoT workspaces. Dashboard provides actionable inventory/urgent/coverage/fleet metrics, readiness and prerequisite explanations, filtered bin inspection, actual exceptions and result previews. Fleet settings edit in place. Analytics omits unrelated map/configuration content. Guided irregular demo uses 40 bins, three zones and five trucks with one deliberate oversized pickup; opening it preserves saved cities and confirms discarding unsaved changes. Save status and session-only run history are explicit. Error notifications use alert semantics. Existing engine, refined map and JSON format remain intact.

## Initial audit findings

The preceding browser audit found an unconfigured 100-bin grid on first run, jargon-heavy help, repeated map/setup modules on Analytics and no clear next step. Workspace settings also conflicted with read-only Dashboard editing. These were usability/control-flow defects rather than demonstrated routing failures.

## Closure evidence

- npm test: 82 passed, ten files, 27.78 seconds. Existing behavioral tests adapted to the new navigation and explicit 100-bin fixtures; coverage includes demo safety, capacity recovery, fleet invalidation, result consistency and reload.
- npm run typecheck: passed.
- npm run build: passed, JS 348.25 kB / 108.71 kB gzip; CSS 45.33 kB / 10.22 kB gzip.
- Actual production browser: launched demo, reviewed 15 urgent bins, inspected the capacity exception, ran collection and opened results. Completed 24 pickups, zero scheduled remaining, one unserved; 22.18 km and 48.6 virtual minutes. Saved and reloaded the 40-bin city.
- Reopened a fresh demo without deleting the saved scenario, changed BIN-001 capacity from 8 to 1 through its inspector, and replanned: 12 trips, zero pending bins.
- Desktop and mobile navigation exercised. Mobile drawer opened and navigated to Dashboard; at 390 px viewport document width was 375 px with no horizontal overflow. A 100-bin preset rendered all 100 markers. Final captured browser warning/error log was empty.
- Existing saved-city preservation and unsaved-change cancellation are additionally covered by automated integration tests. No browser storage was wiped during closure.
- Screenshot: session visualization directory, ux-rescue-final.png. Earlier audit screenshot: ux-rescue-before.png. Images and local QA scenarios are excluded from Git.

## Limits

City inputs/current fills persist locally; plans and run history remain session-only and are not silently reconstructed as historical results after reload. Physical touchscreen behavior is unverified; mobile checks used a viewport override. No claim of exhaustive testing of every possible control/input combination. No cloud, hardware, backend, MongoDB, deployment or Upgrade B/C implementation occurred. Routing/scheduling heuristics and their previously documented limits are unchanged.
