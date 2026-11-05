import { useState } from "react";
import { City } from "../core/model";
import { batchBins, generateCity } from "../core/studio";
export default function StudioTools({
  city,
  change,
  load,
  confirm,
}: {
  city: City;
  confirm: (message: string, action: () => void) => void;
  change: (c: City) => boolean;
  load: (c: City) => void;
}) {
  const [error, setError] = useState("");
  return (
    <details className="panel studio-tools">
      <summary>
        City Studio tools · generator, batch placement & bulk fill
      </summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          change({
            ...city,
            name: String(new FormData(e.currentTarget).get("cityName")),
          });
        }}
      >
        <label>
          Rename current city
          <input
            name="cityName"
            key={city.id + city.name}
            defaultValue={city.name}
            required
            maxLength={160}
          />
        </label>
        <button>Rename city</button>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const f = new FormData(e.currentTarget),
              n = (s: string) => Number(f.get(s));
            load(
              generateCity({
                name: String(f.get("name")),
                junctions: n("junctions"),
                bins: n("bins"),
                districts: n("districts"),
                scale: n("scale"),
                density: n("density"),
                oneWay: n("oneWay"),
                seed: n("seed"),
              }),
            );
            setError("");
          } catch (e) {
            setError(String(e));
          }
        }}
      >
        <h3>Build an irregular municipal city</h3>
        <div className="settings-form">
          <label>
            City name
            <input name="name" defaultValue="New municipal city" required />
          </label>
          {[
            ["junctions", "Junctions", 24, 6, 160],
            ["bins", "Bins", 40, 1, 200],
            ["districts", "Districts / heads", 3, 1, 6],
            ["scale", "Approximate city span (km)", 8, 0.1, 100],
            ["density", "Additional local links (0–1)", 0.5, 0, 1],
            ["oneWay", "One-way local bias (0–1)", 0.4, 0, 1],
            ["seed", "Seed", 42, 0, 2147483647],
          ].map(([key, label, v, min, max]) => (
            <label key={key}>
              {label}
              <input
                name={String(key)}
                type="number"
                step={
                  key === "density" || key === "oneWay" || key === "scale"
                    ? "any"
                    : "1"
                }
                min={min}
                max={max}
                defaultValue={v}
                required
              />
            </label>
          ))}
          <button className="primary">Generate editable city</button>
        </div>
        <p>
          Directed backbone guarantees return paths. One-way bias applies to
          optional reverse links, not an exact edge percentage. Existing presets
          stay available.
        </p>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const f = new FormData(e.currentTarget);
            change(
              batchBins(city, Number(f.get("count")), Number(f.get("fill"))),
            );
            setError("");
          } catch (e) {
            setError(String(e));
          }
        }}
      >
        <h3>Batch placement across road nodes</h3>
        <div className="field-row">
          <label>
            Count
            <input
              name="count"
              type="number"
              min="1"
              max="200"
              defaultValue="10"
            />
          </label>
          <label>
            Initial fill (%)
            <input
              name="fill"
              type="number"
              min="0"
              max="100"
              defaultValue="80"
            />
          </label>
          <button>Add bin batch</button>
        </div>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget),
            fill = Number(f.get("fill")),
            filter = String(f.get("filter"));
          change({
            ...city,
            bins: city.bins.map((b) =>
              b.name.toLowerCase().includes(filter.toLowerCase())
                ? { ...b, fillPercent: fill, history: [] }
                : b,
            ),
          });
        }}
      >
        <h3>Bulk fill by bin name</h3>
        <div className="field-row">
          <label>
            Name contains (blank = all)
            <input name="filter" />
          </label>
          <label>
            Fill (%)
            <input
              name="fill"
              type="number"
              min="0"
              max="100"
              defaultValue="90"
              required
            />
          </label>
          <button>Apply bulk fill</button>
          <button
            type="button"
            className="danger"
            onClick={(e) => {
              const filter = String(
                  new FormData(e.currentTarget.form!).get("filter"),
                ).toLowerCase(),
                ids = new Set(
                  city.bins
                    .filter((b) => b.name.toLowerCase().includes(filter))
                    .map((b) => b.id),
                );
              confirm(
                `Delete ${ids.size} matching bins? One undo restores this batch.`,
                () =>
                  change({
                    ...city,
                    bins: city.bins.filter((b) => !ids.has(b.id)),
                    zones: city.zones.map((z) => ({
                      ...z,
                      binIds: z.binIds.filter((id) => !ids.has(id)),
                    })),
                  }),
              );
            }}
          >
            Delete matching bins
          </button>
        </div>
        <p>
          One undo restores the entire batch. Fill edits reset synthetic
          forecast history.
        </p>
      </form>
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
