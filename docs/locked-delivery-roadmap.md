# CleanCity locked delivery roadmap

Authority: final user decisions, 7 November 2026. Supersedes conflicting scope/status in older plans; preserve audit IDs as historical traceability.

Latest authorization: independent F3 software QA/preparation proceeded while real Atlas acceptance remains pending. See [F1–F3 audit and exact remaining gates](F1-F3-final-software-audit.md); this does not waive Atlas or physical/release acceptance.

**F1 COMPLETE → F2 BACKEND → F3 FINAL SOFTWARE QA → SOFTWARE DEPLOYMENT-READY → F4 PHYSICAL ACCEPTANCE → FINAL DEPLOYMENT**

| Phase | Status | Locked scope |
| --- | --- | --- |
| F1 frontend, algorithms and IoT showcase | COMPLETE | Seven screens, Dijkstra/AutoZone/capacity-aware dispatch/scheduling/playback, costs/savings/basic forecasts; ESP32 USB/Node/SQLite pipeline and Detect/Connect/Disconnect/Reconnect; four physical mappings, six virtual bins and frozen snapshots; approved shared 90 × 60 cm map, exactly ten bins/one zone/depot/truck and A1–A4. Checkpoint `73f1f8eb`, 150 tests. Preserve; do not rebuild. |
| F2 backend and persistent database | ACTIVE | Node/Express/TypeScript, MongoDB Atlas, secure operator sessions/protected APIs, City CRUD/revisions, safe localStorage migration, scenarios/snapshots/results, frontend integration and actual database/browser testing. |
| F3 final software refinement and deployment readiness | AFTER F2 | Verify existing algorithms, forecasts, analytics/savings, all eleven scenarios and showcase; fix genuine bugs; security/auth/database recovery, desktop/mobile/accessibility/performance, tests/build and deployment configuration/docs. No new advanced algorithms. Completion means entire software deployment-ready. |
| F4 final physical IoT acceptance | AFTER SOFTWARE READINESS | Mount four actual sensors; physically verify safe wiring/ESP32; measure empty distances and usable depths, calibrate; verify four simultaneous stable readings; genuine sensor-driven showcase → Dispatch → Simulation → Analytics. Fix integration defects only. Existing mapping/receiver/SQLite/Lab stays; six bins remain virtual and approved map unchanged. |
| Final deployment | LAST, SEPARATE APPROVAL | Municipal frontend/backend, production Atlas/secrets/APIs, production smoke/persistence/navigation/simulation/analytics checks, rollback/operations docs. Hosted site cannot directly open laptop USB; retain local hardware demo unless remote connectivity separately authorized. |

## Frozen scope

Remove road closure/traffic innovation, depot placement optimization and sensor placement planning from remaining delivery scope. Existing what-if remains as-is. U01–U18 and N01–N08 remain recorded; unfinished advanced items are deferred, not new F3 obligations. No new optimizer or incident engine is authorized.

## Evidence and controls

F1 software acceptance established; mounted/calibrated physical acceptance pending. Local SQLite telemetry stays separate from municipal MongoDB. TEST fixtures are never physical evidence. No push, hardware operation, F3/F4 execution or deployment is authorized now. See [F2 execution/status](f2-execution-status.md).
