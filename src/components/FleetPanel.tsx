import { City, uid } from "../core/model";
import { Plus, Truck } from "lucide-react";
export default function FleetPanel({
  city,
  change,
  locked,
  confirm,
}: {
  city: City;
  change: (c: City) => boolean;
  locked: boolean;
  confirm: (message: string, action: () => void) => void;
}) {
  return (
    <section
      className="panel fleet-manager"
      id="fleet-setup"
      tabIndex={-1}
      aria-label="Fleet configuration"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">ASSIGN COLLECTION RESOURCES</span>
          <h3>Fleet & zone assignments</h3>
        </div>
        <button
          disabled={locked}
          onClick={() =>
            change({
              ...city,
              trucks: [
                ...city.trucks,
                {
                  id: uid("truck"),
                  label: `Truck ${city.trucks.length + 1}`,
                  capacityBinUnits: 8,
                  speedGrade: 2,
                  available: true,
                },
              ],
            })
          }
        >
          <Plus size={16} /> Add truck
        </button>
      </div>
      <p>
        Available trucks can serve their assigned zone. “Any zone” permits
        cross-zone work when the directed roads allow it. Capacity uses modeled
        bin units.
      </p>
      {locked && (
        <p role="note">
          Reset the current collection run in Simulator before changing fleet
          settings.
        </p>
      )}
      {city.trucks.map((t) => (
        <details key={t.id} className="fleet-editor">
          <summary>
            <Truck size={18} />
            <span>
              <b>{t.label}</b>
              <small>
                {t.capacityBinUnits} units ·{" "}
                {city.settings.speeds[t.speedGrade]} km/h ·{" "}
                {city.zones.find((z) => z.id === t.zoneId)?.name ?? "Any zone"}
              </small>
            </span>
            <span className="pill">
              {t.available ? "AVAILABLE" : "UNAVAILABLE"}
            </span>
            <span>Edit</span>
          </summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              change({
                ...city,
                trucks: city.trucks.map((x) =>
                  x.id === t.id
                    ? {
                        ...x,
                        label: String(f.get("label")),
                        capacityBinUnits: Number(f.get("capacity")),
                        speedGrade: Number(f.get("speed")),
                        zoneId: String(f.get("zone")) || undefined,
                        available: f.has("available"),
                      }
                    : x,
                ),
              });
            }}
          >
            <fieldset disabled={locked}>
              <div className="settings-form">
                <label>
                  Truck label
                  <input
                    name="label"
                    defaultValue={t.label}
                    required
                    maxLength={160}
                  />
                </label>
                <label>
                  Capacity (units)
                  <input
                    name="capacity"
                    type="number"
                    min=".01"
                    step="any"
                    defaultValue={t.capacityBinUnits}
                    required
                  />
                </label>
                <label>
                  Truck speed
                  <select name="speed" defaultValue={t.speedGrade}>
                    {city.settings.speeds.map((s, i) => (
                      <option value={i} key={i}>
                        {s} km/h
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Zone assignment
                  <select name="zone" defaultValue={t.zoneId ?? ""}>
                    <option value="">Any zone</option>
                    {city.zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="check">
                  <input
                    name="available"
                    type="checkbox"
                    defaultChecked={t.available}
                  />
                  Available for collection
                </label>
              </div>
              <button className="primary">Save {t.label}</button>
              <button
                className="danger"
                type="button"
                onClick={() =>
                  confirm(`Delete ${t.label}?`, () =>
                    change({
                      ...city,
                      trucks: city.trucks.filter((x) => x.id !== t.id),
                    }),
                  )
                }
              >
                Delete truck
              </button>
            </fieldset>
          </form>
        </details>
      ))}
      {!city.trucks.length && (
        <p>
          No trucks configured. Add a truck, choose its capacity and make it
          available.
        </p>
      )}
    </section>
  );
}
