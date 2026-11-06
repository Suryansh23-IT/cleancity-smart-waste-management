import { City, uid } from "../core/model";
import {truckZoneAssignments} from '../core/routing';
import { Plus, Truck } from "lucide-react";
import { useState } from 'react';
export default function FleetPanel({
  city,
  change,
  locked,
  confirm,
  onDraftChange,
}: {
  onDraftChange?: (dirty:boolean)=>void;
  city: City;
  change: (c: City) => boolean;
  locked: boolean;
  confirm: (message: string, action: () => void) => void;
}) {
  const [messages,setMessages]=useState<Record<string,string>>({});
  const bindings=truckZoneAssignments(city);
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
      <p className="small"><b>Zone-contained routing is always enforced.</b> Each truck stays in one partition and returns to its head. Missing internal roads are reported as unserved work.</p>
      <p>
        Zone and road permissions follow the policy above. Strict automatic assignment
        binds an unassigned truck to one zone for the whole run. Capacity uses modeled
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
                {city.zones.find((z) => z.id === bindings.get(t.id))?.name ?? "No zone assigned"}{!t.zoneId&&bindings.has(t.id)?' (auto)':''}
              </small>
            </span>
            <span className="pill">
              {t.available ? "AVAILABLE" : "UNAVAILABLE"}
            </span>
            <span>Edit</span>
          </summary>
          <form
            key={JSON.stringify(t)}
            onChange={()=>onDraftChange?.(true)}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const label=String(f.get('label')).trim(),capacity=Number(f.get('capacity'));
              if(!label||!Number.isFinite(capacity)||capacity<=0){setMessages({...messages,[t.id]:'Enter a truck name and a capacity greater than zero.'});return;}
              const ok=change({
                ...city,
                trucks: city.trucks.map((x) =>
                  x.id === t.id
                    ? {
                        ...x,
                        label,
                        capacityBinUnits: capacity,
                        speedGrade: Number(f.get("speed")),
                        zoneId: String(f.get("zone")) || undefined,
                        available: f.has("available"),
                      }
                    : x,
                ),
              });
              setMessages({...messages,[t.id]:ok?'Truck updated. Rebuild the plan to use these settings; Save city keeps them in this browser.':'Truck was not changed. Review the workspace error and correct the values.'});
              if(ok)onDraftChange?.(false);
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
                    <option value="">Automatic zone · one per run</option>
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
              {messages[t.id]&&<p role="status">{messages[t.id]}</p>}
              <button
                className="danger"
                type="button"
                onClick={() =>
                  confirm(`Delete ${t.label}? Its planned work will need replanning. The open city is not saved automatically.`, () => {
                    if(change({
                      ...city,
                      trucks: city.trucks.filter((x) => x.id !== t.id),
                    }))onDraftChange?.(false);
                  })
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
