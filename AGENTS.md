# CleanCity working rules

- Approved architecture (5 November 2026): independent React/Vite/TypeScript municipal simulator; Vercel HTTPS Functions + Supabase for physical telemetry. AWS is on hold. The revised approved master brief supersedes historical M0-only software restrictions.
- Completion checkpoints: C0 readiness; C1 City Studio; C2 algorithms; C3 municipal simulation; C4 physical cloud system; C5 production quality. Work autonomously within approved scope; ask before paid services, destructive changes or architecture departures.
- Suryansh and Codex own software. Vishal owns electronics and physical tests. Raj and Suryakant jointly own the flat model, four bins, roads, labels and mounts; Suryakant supplies map data and noncoding QA. Everyone assists integration; seniors document.
- Preserve existing work/history. Review named files before staging; never commit secrets. Firmware credentials belong in ignored files. Keep dependencies modest and implementations modular.
- Physical gates remain one -> two -> four. No GPIO/power mapping is approved until exact board/revision, labels, wiring and power path are reviewed. Disconnect power before rewiring; require a multimeter/lab-technician check before energizing a new circuit. Never apply 5V Echo directly to ESP32 GPIOs. Never flash or power hardware remotely.
- Ten reportedly 2k resistors are not assumed to be 2.2k/3.3k. Divider feasibility is not wiring approval. Preserve docs/purchase-and-review.md electrical guidance.
- ESP32 detection/upload/serial verification are user-reported in the revised brief; HC-SR04 operation remains unverified. Never invent physical evidence.
- Hardware debugging is paused pending experienced assistance. Continue software independently; do not upload, power or rewire hardware. Preserve the existing Wokwi-labelled sensor sketch without treating its hardcoded pins as approved.
- Physical data and simulation stay distinguishable. Simulator events do not prove database writes or physical pickups. Cloud success requires a real device reading stored and displayed.
- Use directed graph distances, honest heuristic/forecast/cost claims, capacity limits and explicit infeasibility. Backend is authoritative for physical verification; simulator jobs remain local.
- Test meaningful behavior, run TypeScript/tests/build, review diffs and record software/browser/physical/cloud evidence separately. Keep a short progress checklist; avoid excessive documentation.
