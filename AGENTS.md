# CleanCity working rules

- Stay within the active milestone: M0 preparation until actual first-sensor evidence exists. Do not implement M1-M3 prematurely.
- Four milestones only: M0 foundation/first sensor; M1 six local sensors; M2 AWS/live dashboard; M3 collection/routes/demo.
- Suryansh owns coding. Vishal performs electronics and physical tests; Raj builds the model; Suryakant supplies map data and noncoding QA; seniors document.
- Explain the next manageable hardware action. Never assert remote physical verification or power/flash hardware without the team's physical intervention.
- No GPIO or power mapping is approved until the exact board, revision, pin labels and power path are reviewed. Never apply 5V Echo directly to ESP32 GPIOs.
- Preserve one -> three -> six sensor gates. Disconnect power before rewiring. Require a multimeter/lab-technician check before energizing a new circuit.
- Do not commit secrets. Keep local firmware credentials in ignored files. Review staged files explicitly; never use a broad add without checking the file list.
- Test meaningful behavior, distinguish software/simulation/physical/cloud checks, and record unverified work honestly.
- Use small changes and Git checkpoints. Do not mark milestones passed without evidence. Ask before moving to the next milestone, major architecture changes, paid cloud deployment or destructive actions.
- Keep AWS primary, simulation separate, and routing claims honest. Backend is authoritative for collection jobs and sensor verification.
- Avoid unnecessary dependencies, elaborate authentication systems and excessive documentation. Follow the concrete reliability rules in docs/purchase-and-review.md.
