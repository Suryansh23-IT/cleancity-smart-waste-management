# Four milestones and five focused days

Dates start when parts and the team are available. Target: five focused working days within approximately ten calendar days including contingency, not a guarantee. Keep M0-M3 unchanged.

| Milestone | Target | Evidence required before completion |
| --- | --- | --- |
| M0 foundation and first sensor | Day 1 | Correct board identified; circuit checked; actual ruler/empty/partial/full/no-echo tests produce plausible repeatable local readings |
| M1 complete local sensors | Day 2 | One -> three -> six; correct identities; sequential five-sample median cycles; calibration; invalid handling; stable thresholds |
| M2 AWS and live dashboard | Days 3-4 | Actual physical fill change reaches IoT -> Lambda -> DynamoDB -> API -> dashboard; reconnect/offline behavior tested |
| M3 collection, routes and demo | Day 5 | Two-truck routes, pickup pending -> fresh empty verification, separate simulation, full physical/cloud rehearsal |

## Daily assignments

| Day | Suryansh (all coding) | Vishal | Raj | Suryakant | Senior 1 / Senior 2 |
| --- | --- | --- | --- | --- | --- |
| 1 | Repo, toolchain, board identification, serial/first-sensor sketch | Buy/check parts, borrow meter, technician review, one-sensor ruler tests | Trial bin/support and removable wire paths; delay final mounting | Draft six-bin graph, stable IDs, coordinates and units | Outline report / architecture and photo evidence checklist |
| 2 | Six-sensor firmware, calibration, filtering, invalid states and thresholds | Expand 1 -> 3 -> 6; label and calibrate each | Mount validated bins, secure cables and maintain board access | Check graph connectivity and stop locations; prepare seeded simulation data | Record measured calibration / draft hardware section and limitations |
| 3 | Review account/prices; after deployment approval, implement secure IoT ingestion and current state | Assist Wi-Fi/reboot/disconnect tests; preserve known-good wiring | Finish roads/depot without disturbing electronics | Fixed route examples and reproducible simulation inputs | Cloud evidence / pipeline diagram and failure notes |
| 4 | APIs, dashboard, protected writes, real telemetry and collection state integration | Actual fill-change and sensor-failure evidence | Labels, trucks and accessible collection positions | Check UI IDs, map units, route outputs and baseline definition | Demo script / report screenshots and results |
| 5 | Routes, pickup verification, simulation and end-to-end fixes | Rehearse fill/empty/disconnect; spare sensor available | Truck movement and model setup | Verify identical route comparisons and modeled assumptions | Presentation rehearsal / viva and final evidence |

Prepare collection-state design on Day 3 and integrate it on Day 4, so Day 5 is not the first integration attempt. This stays within M2/M3 and requires no early implementation now.

If delayed, preserve safe hardware -> six local readings -> AWS telemetry -> dashboard -> one verified pickup. Simplify simulation and polish first. Simulated tests never pass a physical gate.

## Evidence log

Pre-M0: Git/GitHub foundation setup complete. User confirmed Arduino IDE 2.3.10 and official esp32 by Espressif Systems v3.3.12 installed successfully with no installation errors. This records user-reported installation evidence, not an independently observed compile or hardware test.

AWS signup progress, user-confirmed 3 November 2026: account created; Free Plan active; $100 credit balance; console showed 183 days remaining, expiry 3 May 2027. Hyderabad (ap-south-2) activation initiated only. Root MFA, billing alerts and final region availability remain unconfirmed. No application resources deployed; Agent Toolkit skipped. Account details were reported by the user, not independently inspected. Do not store payment details or account secrets in Git.

AWS cost constraint: less than $10 total project usage cost before credits. Aim for $5 or less, with a manual stop/review at $5 to leave billing-delay headroom. Before M2 deployment, confirm root MFA and configure email-only cost alerts at $1, $3 and $5, excluding credits from the usage-cost view where supported. Check credit balance and gross usage daily during implementation; ordinary budget alerts are delayed notifications, not hard caps. Keep frontend and 60-bin simulation local initially, run telemetry only during testing, and use throttles, bounded retries and short log retention. Re-estimate the actual regional deployment before creating resources. No paid upgrade without explicit user approval.

Region decision remains pending: verify all required services, especially IoT Core, in the selected region before deployment. Initiating Hyderabad activation does not approve the full pipeline there. If necessary, review Mumbai (ap-south-1) with the user without changing the architecture or deploying anything.

M0: NOT COMPLETE. Procurement is the next priority. Exact board selection, driver assessment, GPIO mapping, meter review, compilation, first upload and actual measurements remain pending. Preserve one -> three -> six sensor gates after purchase.

After every meaningful check record: date, board/core/sketch version, test input, expected/actual result, pass/fail/unverified and next action. Store no secrets in logs/photos. Save a preparation checkpoint separately from the verified M0 checkpoint.
