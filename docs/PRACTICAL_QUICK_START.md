# CleanCity practical — quick start

## Five-minute startup

1. Keep the previously checked sensor wiring unchanged. Power the ESP32 with its tested USB charger or power bank; enable the same phone hotspot used during setup. Do not rewire a powered circuit.
2. Open the [working Preview](https://cleancity-smart-waste-management-p9uc-git-729074-suryansh-12af.vercel.app/). If the site is slow, wait for the free service to wake and retry. The [readiness check](https://cleancity-preview-api.onrender.com/api/ready) should report `database: ready`.
3. Open **Cities → Municipal database**, then sign in with the secure Preview operator credentials stored locally in `.local/render-cli/preview-credentials.json`. Never display or share the file. Use **Resume operator session** after a browser refresh if needed.
4. Open **Physical IoT Lab**, select **Wi-Fi · cloud telemetry**, and confirm **4/4 fresh valid channels**, changing timestamps and plausible distances. Four percentages use the saved individual calibration; the 2 cm full reference is provisional. Adjust a bin only after measuring it.
5. To demonstrate planning, capture a physical snapshot in the ten-bin showcase and use the existing Dispatch, Simulation and Analytics flow. Explain that truck collection is simulated. The **Open demo simulator** button offers four sliders when physical readings are unavailable; its snapshot is labelled TEST.

## Emergency recovery

- **No or stale Wi-Fi readings:** Check charger power and that the configured hotspot is on. Wait for reconnect; refresh the Lab. The Lab marks readings stale after 45 seconds and offline after two minutes. Do not present old data as live.
- **Login or database unavailable:** Check the readiness link above, wait for the service to wake, then retry or resume the operator session. Keep local drafts; do not repeatedly enter a wrong password.
- **One invalid sensor:** Leave the powered wiring alone. Report the channel as invalid; ask Vishal to inspect with power disconnected. Never connect a 5 V Echo directly to an ESP32 GPIO.
- **Internet unavailable:** Run the explicitly labelled sensor-free demo and explain it is simulated. The separate local USB receiver is an alternative only with the previously demonstrated laptop setup and a user-connected board; a hosted page cannot directly read laptop USB.
- **Preview fails after a change:** Use the previously working Preview deployment; do not deploy, reflash, change credentials or network access during the practical without approval.

## Limits and evidence

The device sends one four-sensor batch about every 10 seconds; old cloud observations expire after seven days. The Preview database measured about 0.75 MB of data and indexes at the release check; monitor the full cluster separately. Render reported 2.12 of 750 monthly free instance hours and 0 MB of 5 GB included bandwidth at that time. These figures change. Closing inactive Lab tabs reduces traffic. No TEST or simulated value proves a physical pickup, and mounted calibration and repeatability remain physical acceptance work.
