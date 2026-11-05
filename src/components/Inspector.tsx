import { City, uid, removeNode } from "../core/model";
import { Selection } from "./CityCanvas";
import { reassignBin, relocateBin } from "../core/zoning";
export default function Inspector({
  city,
  selection,
  change,
  confirm,
  select,
  report,
  readOnly = false,
  edit,
}: {
  readOnly?: boolean;
  edit?: () => void;
  city: City;
  selection: Selection | null;
  change: (c: City, graph?: boolean) => boolean;
  confirm: (message: string, action: () => void) => void;
  select: (s: Selection | null) => void;
  report: (message: string) => void;
}) {
  if (!selection)
    return (
      <aside className="inspector">
        <span className="eyebrow">PROPERTY INSPECTOR</span>
        <h3>Make this city yours.</h3>
        <p>
          Select a bin, junction or road to inspect and edit its properties.
        </p>
        <div className="inspector-hint">
          Double-click the canvas to add a junction. Drag a bin to move its
          marker; change its road-access node in the inspector. Road weights,
          measured in kilometres, control routing.
        </div>
        <h4>Network at a glance</h4>
        <dl>
          <dt>Road nodes</dt>
          <dd>{city.nodes.length}</dd>
          <dt>Directed roads</dt>
          <dd>{city.roads.length}</dd>
          <dt>Smart bins</dt>
          <dd>{city.bins.length}</dd>
          <dt>Municipal heads</dt>
          <dd>{city.nodes.filter((n) => n.type === "HEAD").length}</dd>
        </dl>
      </aside>
    );
  const { kind, id } = selection,
    n = city.nodes.find((n) => n.id === id),
    b = city.bins.find((b) => b.id === id),
    r = city.roads.find((r) => r.id === id),
    z = city.zones.find((z) => z.id === id),
    t = city.trucks.find((t) => t.id === id);
  const opts = city.nodes.map((n) => (
    <option key={n.id} value={n.id}>
      {n.label} ({n.id})
    </option>
  ));
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (readOnly) return;
    const f = new FormData(e.currentTarget),
      str = (key: string) => String(f.get(key) ?? ""),
      num = (key: string) => Number(f.get(key));
    let next = city;
    if (kind === "node" && n)
      next = {
        ...city,
        nodes: city.nodes.map((x) =>
          x.id === id
            ? {
                ...n,
                label: str("label"),
                type: str("type") as typeof n.type,
                x: num("x"),
                y: num("y"),
              }
            : x,
        ),
        zones: city.zones,
      };
    if (kind === "bin" && b) {
      const moved = relocateBin(city, id, str("roadNodeId"));
      next = {
        ...moved,
        bins: moved.bins.map((x) =>
          x.id === id
            ? {
                ...x,
                name: str("name"),
                fillPercent: num("fill"),
                capacityBinUnits: num("capacity"),
                position:
                  str("markerX") === "" || str("markerY") === ""
                    ? b.position
                    : { x: num("markerX"), y: num("markerY") },
                history:
                  num("fill") === b.fillPercent
                    ? b.history
                    : [
                        ...b.history,
                        {
                          time:
                            Math.max(0, ...b.history.map((h) => h.time)) +
                            3600000,
                          fill: num("fill"),
                        },
                      ].slice(-5),
              }
            : x,
        ),
      };
    }
    if (kind === "road" && r)
      next = {
        ...city,
        roads: city.roads.map((x) =>
          x.id === id
            ? {
                ...r,
                fromNodeId: str("from"),
                toNodeId: str("to"),
                distanceKm: num("distance"),
                name: str("name"),
                roadClass: str("roadClass") as "ARTERIAL" | "LOCAL",
                speedGrade: str("speed") === "" ? undefined : num("speed"),
              }
            : x,
        ),
      };
    if (kind === "zone" && z)
      next = {
        ...city,
        zones: city.zones.map((x) =>
          x.id === id
            ? {
                ...z,
                name: str("name"),
                color: str("color"),
                headNodeId: str("head"),
                manual: true,
              }
            : x,
        ),
      };
    if (kind === "truck" && t)
      next = {
        ...city,
        trucks: city.trucks.map((x) =>
          x.id === id
            ? {
                ...t,
                label: str("name"),
                capacityBinUnits: num("capacity"),
                speedGrade: num("speed"),
                available: f.has("available"),
                zoneId: str("zone") || undefined,
              }
            : x,
        ),
      };
    change(next, kind === "node" || kind === "road");
  };
  const del = () =>
    confirm(
      `Delete this ${kind}? Associated plans will be invalidated.`,
      () => {
        let c = city;
        if (kind === "node") c = removeNode(city, id);
        if (kind === "road")
          c = { ...city, roads: city.roads.filter((x) => x.id !== id) };
        if (kind === "bin")
          c = {
            ...city,
            bins: city.bins.filter((x) => x.id !== id),
            zones: city.zones.map((z) => ({
              ...z,
              binIds: z.binIds.filter((x) => x !== id),
            })),
          };
        if (kind === "zone")
          c = {
            ...city,
            zones: city.zones.filter((x) => x.id !== id),
            trucks: city.trucks.map((t) => ({
              ...t,
              zoneId: t.zoneId === id ? undefined : t.zoneId,
            })),
          };
        if (kind === "truck")
          c = { ...city, trucks: city.trucks.filter((x) => x.id !== id) };
        if (change(c, kind === "node" || kind === "road")) select(null);
      },
    );
  return (
    <aside className="inspector">
      <div className="section-heading">
        <span className="eyebrow">{kind.toUpperCase()} PROPERTIES</span>
        <button onClick={() => select(null)} aria-label="Close inspector">
          ×
        </button>
      </div>
      <h3>
        {n?.label ??
          b?.name ??
          r?.name ??
          z?.name ??
          t?.label ??
          "Selection removed"}
      </h3>
      <code>{id}</code>
      {readOnly && (
        <p className="inspector-hint">
          Read-only map. Choose Edit map to change city properties.
        </p>
      )}
      {readOnly && edit && <button onClick={edit}>Edit selected object</button>}
      <form onSubmit={submit} key={JSON.stringify([selection, n, b, r, z, t])}>
        <fieldset disabled={readOnly}>
          {kind === "node" && n && (
            <>
              <label>
                Label
                <input name="label" defaultValue={n.label} required />
              </label>
              <label>
                Type
                <select name="type" defaultValue={n.type}>
                  <option>INTERSECTION</option>
                  <option>HEAD</option>
                  <option>OPTIONAL_UNLOADING_POINT</option>
                </select>
              </label>
              <div className="field-row">
                <label>
                  X
                  <input
                    name="x"
                    type="number"
                    min="0"
                    max={city.width}
                    defaultValue={n.x}
                    step="any"
                    required
                  />
                </label>
                <label>
                  Y
                  <input
                    name="y"
                    type="number"
                    min="0"
                    max={city.height}
                    defaultValue={n.y}
                    step="any"
                    required
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  const id = uid("bin");
                  const changed = change({
                    ...city,
                    bins: [
                      ...city.bins,
                      {
                        id,
                        name: `BIN-${city.bins.length + 1}`,
                        roadNodeId: n.id,
                        fillPercent: 0,
                        capacityBinUnits: 1,
                        source: "SIMULATED",
                        history: [],
                      },
                    ],
                  });
                  if (changed) select({ kind: "bin", id });
                }}
              >
                + Place bin here
              </button>
              <label>
                Connect to
                <select name="target">
                  {opts.filter((o) => o.key !== n.id)}
                </select>
              </label>
              <label>
                Distance (km)
                <input
                  name="newDistance"
                  type="number"
                  min=".001"
                  step="any"
                  defaultValue="0.5"
                />
              </label>
              <label className="check">
                <input type="checkbox" name="twoWay" defaultChecked /> Two-way
                road
              </label>
              <button
                type="button"
                onClick={(e) => {
                  const f = new FormData(e.currentTarget.form!);
                  const to = String(f.get("target") ?? "");
                  if (!to) {
                    report("Add another node first");
                    return;
                  }
                  const roads = [
                    {
                      id: uid("road"),
                      fromNodeId: n.id,
                      toNodeId: to,
                      distanceKm: Number(f.get("newDistance")),
                    },
                  ];
                  if (f.has("twoWay"))
                    roads.push({
                      ...roads[0],
                      id: uid("road"),
                      fromNodeId: to,
                      toNodeId: n.id,
                    });
                  change({ ...city, roads: [...city.roads, ...roads] }, true);
                }}
              >
                Connect road
              </button>
            </>
          )}
          {kind === "bin" && b && (
            <>
              <label>
                Name
                <input name="name" defaultValue={b.name} required />
              </label>
              <label>
                Road node
                <select name="roadNodeId" defaultValue={b.roadNodeId}>
                  {opts}
                </select>
              </label>
              <label>
                Fill (%)
                <input
                  name="fill"
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  defaultValue={b.fillPercent}
                  required
                />
              </label>
              <label>
                Bin capacity (units)
                <input
                  name="capacity"
                  type="number"
                  min=".01"
                  step="any"
                  defaultValue={b.capacityBinUnits}
                  required
                />
              </label>
              <p className="small">
                Source: SIMULATED · Changing association invalidates the
                collection plan.
              </p>
              <label>
                Reassign responsibility
                <select
                  value={
                    city.zones.find((z) => z.binIds.includes(b.id))?.id ?? ""
                  }
                  onChange={(e) => {
                    try {
                      change(reassignBin(city, b.id, e.target.value));
                    } catch (error) {
                      report(
                        error instanceof Error ? error.message : String(error),
                      );
                    }
                  }}
                >
                  <option value="" disabled>
                    Unassigned
                  </option>
                  {city.zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  const id = uid("bin");
                  if (
                    change({
                      ...city,
                      bins: [
                        ...city.bins,
                        {
                          ...b,
                          id,
                          name: b.name + " copy",
                          position: b.position
                            ? {
                                x: Math.min(city.width, b.position.x + 20),
                                y: b.position.y,
                              }
                            : undefined,
                        },
                      ],
                    })
                  )
                    select({ kind: "bin", id });
                }}
              >
                Duplicate bin
              </button>
              <button
                type="button"
                onClick={() =>
                  change({
                    ...city,
                    bins: city.bins.map((x) =>
                      x.id === b.id ? { ...x, position: undefined } : x,
                    ),
                  })
                }
              >
                Reset marker to access node
              </button>
              <p className="small">
                Marker position is visual only. Road node controls travel and
                zone feasibility.
              </p>
              <div className="field-row">
                <label>
                  Marker X
                  <input
                    name="markerX"
                    type="number"
                    min="0"
                    max={city.width}
                    step="any"
                    defaultValue={b.position?.x}
                  />
                </label>
                <label>
                  Marker Y
                  <input
                    name="markerY"
                    type="number"
                    min="0"
                    max={city.height}
                    step="any"
                    defaultValue={b.position?.y}
                  />
                </label>
              </div>
              <h4>Recent simulated history</h4>
              {b.history.map((h, i) => (
                <div className="history-row" key={i}>
                  <span>Virtual hour {(h.time / 3600000).toFixed(1)}</span>
                  <b>{h.fill.toFixed(0)}%</b>
                </div>
              ))}
            </>
          )}
          {kind === "road" && r && (
            <>
              <label>
                Name
                <input name="name" defaultValue={r.name ?? "Road"} />
              </label>
              <label>
                From
                <select name="from" defaultValue={r.fromNodeId}>
                  {opts}
                </select>
              </label>
              <label>
                To
                <select name="to" defaultValue={r.toNodeId}>
                  {opts}
                </select>
              </label>
              <label>
                Distance (km)
                <input
                  name="distance"
                  type="number"
                  min=".001"
                  step="any"
                  defaultValue={r.distanceKm}
                  required
                />
              </label>
              <label>
                Road hierarchy
                <select name="roadClass" defaultValue={r.roadClass ?? "LOCAL"}>
                  <option value="LOCAL">Local street</option>
                  <option value="ARTERIAL">District connector</option>
                </select>
              </label>
              <label>
                Road speed override
                <select name="speed" defaultValue={r.speedGrade ?? ""}>
                  <option value="">Use truck speed</option>
                  {city.settings.speeds.map((s, i) => (
                    <option key={i} value={i}>
                      {s} km/h
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() =>
                  change(
                    {
                      ...city,
                      roads: city.roads.map((x) =>
                        x.id === r.id
                          ? {
                              ...r,
                              fromNodeId: r.toNodeId,
                              toNodeId: r.fromNodeId,
                            }
                          : x,
                      ),
                    },
                    true,
                  )
                }
              >
                Reverse direction
              </button>
              <button
                type="button"
                onClick={() =>
                  change(
                    {
                      ...city,
                      roads: [
                        ...city.roads,
                        {
                          ...r,
                          id: uid("road"),
                          fromNodeId: r.toNodeId,
                          toNodeId: r.fromNodeId,
                        },
                      ],
                    },
                    true,
                  )
                }
              >
                Add reverse road
              </button>
            </>
          )}
          {kind === "zone" && z && (
            <>
              <label>
                Name
                <input name="name" defaultValue={z.name} required />
              </label>
              <label>
                Colour
                <input type="color" name="color" defaultValue={z.color} />
              </label>
              <label>
                Municipal head
                <select name="head" defaultValue={z.headNodeId}>
                  {city.nodes
                    .filter((n) => n.type === "HEAD")
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label}
                      </option>
                    ))}
                </select>
              </label>
              <p>
                {z.binIds.length} assigned bins ·{" "}
                {z.manual ? "Manually adjusted" : "Graph generated"}
              </p>
              <div className="bin-chips">
                {z.binIds.map((id) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => select({ kind: "bin", id })}
                  >
                    {city.bins.find((b) => b.id === id)?.name}
                  </button>
                ))}
              </div>
            </>
          )}
          {kind === "truck" && t && (
            <>
              <label>
                Label
                <input name="name" defaultValue={t.label} required />
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
                Speed
                <select name="speed" defaultValue={t.speedGrade}>
                  {city.settings.speeds.map((s, i) => (
                    <option key={i} value={i}>
                      {s} km/h
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Zone restriction
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
                />{" "}
                Available for dispatch
              </label>
            </>
          )}
          <button className="primary" type="submit">
            Save changes
          </button>
          <button className="danger" type="button" onClick={del}>
            Delete {kind}
          </button>
        </fieldset>
      </form>
    </aside>
  );
}
