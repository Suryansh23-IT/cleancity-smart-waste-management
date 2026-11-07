# CleanCity working rules

- F3 software checks can proceed while Atlas acceptance is pending. Record software, Atlas and physical evidence separately in docs/final-deep-engineering-audit.md.

- Latest authority (7 November 2026): docs/locked-delivery-roadmap.md. F1 is complete; preserve React/Vite/TypeScript, all algorithms and the approved 90 × 60 cm single-zone showcase. F2 is Node/Express/TypeScript + MongoDB Atlas municipal persistence. Existing local ESP32 USB/Node/SQLite/Physical Lab stays separate. AWS/Supabase proposals are historical, not active requirements.
- Locked order: F1 complete → F2 backend → F3 final existing-software QA/deployment readiness → F4 focused mounted/calibrated physical acceptance → separately approved final deployment. Do not build closures/traffic, depot optimization or sensor placement planning; keep existing what-if as-is. No push, hardware access or deployment without permission.
- Suryansh and Codex own software. Vishal owns electronics and physical tests. Raj and Suryakant jointly own the flat model, four bins, roads, labels and mounts; Suryakant supplies map data and noncoding QA. Everyone assists integration; seniors document.
- Preserve existing work/history. Review named files before staging; never commit secrets. Firmware credentials belong in ignored files. Keep dependencies modest and implementations modular.
- Physical gates remain one -> two -> four. No GPIO/power mapping is approved until exact board/revision, labels, wiring and power path are reviewed. Disconnect power before rewiring; require a multimeter/lab-technician check before energizing a new circuit. Never apply 5V Echo directly to ESP32 GPIOs. Never flash or power hardware remotely.
- Ten reportedly 2k resistors are not assumed to be 2.2k/3.3k. Divider feasibility is not wiring approval. Preserve docs/purchase-and-review.md electrical guidance.
- Four-channel USB → Node → SQLite → Lab readings and connection controls were previously demonstrated with user-connected hardware. Mounted dustbin measurements/calibration/repeatability and final live showcase acceptance remain pending. Never turn TEST fixtures into physical evidence.
- No hardware work is authorized during F2. Preserve tested firmware and pins; do not upload, access COM ports, power or rewire hardware.
- Physical data and simulation stay distinguishable. Simulator events do not prove database writes or physical pickups. Cloud success requires a real device reading stored and displayed.
- Use directed graph distances, honest heuristic/forecast/cost claims, capacity limits and explicit infeasibility. Backend is authoritative for physical verification; simulator jobs remain local.
- Test meaningful behavior, run TypeScript/tests/build, review diffs and record software/browser/physical/cloud evidence separately. Keep a short progress checklist; avoid excessive documentation.
