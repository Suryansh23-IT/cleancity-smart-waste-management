import { useEffect, useRef, useState } from "react";
import { screenToWorld, panCamera } from "../core/camera";
import { City, status } from "../core/model";
import { Plan } from "../core/routing";
import { Simulation, tripState, currentTrip } from "../core/simulation";
export interface Selection {
  kind: "node" | "road" | "bin" | "zone" | "truck";
  id: string;
}
type Point = { x: number; y: number };
function hull(points: Point[]): Point[] {
  const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cross = (o: Point, a: Point, b: Point) =>
      (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x),
    lower: Point[] = [],
    upper: Point[] = [];
  for (const pt of p) {
    while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, pt) <= 0)
      lower.pop();
    lower.push(pt);
  }
  for (const pt of p.reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, pt) <= 0)
      upper.pop();
    upper.push(pt);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
export default function CityCanvas({
  city,
  plan,
  simulation,
  selection,
  onSelect,
  onMove,
  onCreate,
  editing,
  simulationView = false,
}: {
  simulationView?: boolean;
  city: City;
  plan: Plan | null;
  simulation: Simulation | null;
  selection: Selection | null;
  onSelect: (s: Selection | null) => void;
  onMove: (kind: "node" | "bin", id: string, p: Point) => void;
  onCreate: (p: Point) => void;
  editing: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null),
    [drag, setDrag] = useState<{
      kind: "node" | "bin";
      id: string;
      start: Point;
      point: Point;
    } | null>(null),
    [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }),
    [pan, setPan] = useState<{
      x: number;
      y: number;
      ox: number;
      oy: number;
      scale: number;
    } | null>(null),
    [query, setQuery] = useState(""),
    [layers, setLayers] = useState({
      context: true,
      zones: true,
      bins: true,
      routes: true,
    });
  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };
  const fit = () => {
    const pts = [
      ...city.nodes,
      ...city.bins.flatMap((b) => (b.position ? [b.position] : [])),
    ];
    if (!pts.length) {
      reset();
      return;
    }
    const xs = pts.map((p) => p.x),
      ys = pts.map((p) => p.y),
      left = Math.min(...xs) - 65,
      right = Math.max(...xs) + 65,
      top = Math.min(...ys) - 80,
      bottom = Math.max(...ys) + 65;
    setZoom(
      Math.max(
        0.3,
        Math.min(5, city.width / (right - left), city.height / (bottom - top)),
      ),
    );
    setOffset({
      x: (left + right - city.width) / 2,
      y: (top + bottom - city.height) / 2,
    });
  };
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) =>
        Math.max(0.3, Math.min(5, z * (e.deltaY > 0 ? 0.9 : 1.1))),
      );
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => svg.removeEventListener("wheel", wheel);
  }, []);
  const results = [
    ...city.nodes.map((n) => ({
      kind: "node" as const,
      id: n.id,
      label: n.label,
      x: n.x,
      y: n.y,
    })),
    ...city.bins.map((b) => {
      const n = city.nodes.find((n) => n.id === b.roadNodeId)!;
      return {
        kind: "bin" as const,
        id: b.id,
        label: b.name,
        x: b.position?.x ?? n.x,
        y: b.position?.y ?? n.y,
      };
    }),
    ...city.roads.map((r) => {
      const n = city.nodes.find((n) => n.id === r.fromNodeId)!;
      const end = city.nodes.find((n) => n.id === r.toNodeId)!;
      return {
        kind: "road" as const,
        id: r.id,
        label: r.name ?? r.id,
        x: (n.x + end.x) / 2,
        y: (n.y + end.y) / 2,
      };
    }),
  ]
    .filter(
      (r) =>
        query &&
        `${r.label} ${r.id}`.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 12);
  const position = (e: React.MouseEvent): Point =>
    screenToWorld(
      { x: e.clientX, y: e.clientY },
      ref.current!.getScreenCTM()!.inverse(),
      city,
    );
  const nodes = new Map(city.nodes.map((n) => [n.id, n]));
  const point = (id: string) =>
    drag?.kind === "node" && drag.id === id ? drag.point : nodes.get(id)!;
  return (
    <div className="canvas-wrap">
      <div className="canvas-label">
        <span className="live-dot" /> {city.name}{" "}
        <span className="pill">SIMULATED</span>
      </div>
      <div className="zoom">
        <input
          aria-label="Search map objects"
          placeholder="Search bins, streets, heads…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={fit}>Fit city</button>
        <button onClick={reset} aria-label="Reset camera">
          ⌂
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
        >
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(5, z + 0.2))}
        >
          +
        </button>
      </div>
      {query && (
        <div className="map-search-results">
          {results.map((r) => (
            <button
              key={`${r.kind}-${r.id}`}
              onClick={() => {
                onSelect({ kind: r.kind, id: r.id });
                if (r.kind === "bin") setLayers((l) => ({ ...l, bins: true }));
                setZoom(1.8);
                setOffset({
                  x: r.x - city.width / 2,
                  y: r.y - city.height / 2,
                });
                setQuery("");
              }}
            >
              {r.kind} · {r.label}
            </button>
          ))}
          {!results.length && <p>No matching objects</p>}
        </div>
      )}
      <details className="map-layers">
        <summary>Layers</summary>
        {(Object.keys(layers) as (keyof typeof layers)[]).map((k) => (
          <label key={k}>
            <input
              type="checkbox"
              checked={layers[k]}
              onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })}
            />
            {k}
          </label>
        ))}
      </details>
      <svg
        ref={ref}
        role="group"
        aria-label="Interactive directed city road network"
        tabIndex={0}
        viewBox={`${(city.width * (1 - 1 / zoom)) / 2 + offset.x} ${(city.height * (1 - 1 / zoom)) / 2 + offset.y} ${city.width / zoom} ${city.height / zoom}`}
        onKeyDown={(e) => {
          if (e.target !== ref.current) return;
          if (e.key === "Home") fit();
          if (e.key.startsWith("Arrow")) {
            e.preventDefault();
            setOffset((o) => ({
              x:
                o.x +
                (e.key === "ArrowRight"
                  ? 40
                  : e.key === "ArrowLeft"
                    ? -40
                    : 0) /
                  zoom,
              y:
                o.y +
                (e.key === "ArrowDown" ? 40 : e.key === "ArrowUp" ? -40 : 0) /
                  zoom,
            }));
          }
        }}
        onPointerDown={(e) => {
          if (e.target === ref.current) {
            e.currentTarget.setPointerCapture(e.pointerId);
            setPan({
              x: e.clientX,
              y: e.clientY,
              ox: offset.x,
              oy: offset.y,
              scale: Math.hypot(
                e.currentTarget.getScreenCTM()!.a,
                e.currentTarget.getScreenCTM()!.b,
              ),
            });
          }
        }}
        onDoubleClick={(e) => {
          if (editing && e.target === ref.current) onCreate(position(e));
        }}
        onPointerMove={(e) => {
          if (pan)
            setOffset(
              panCamera(
                { x: pan.ox, y: pan.oy },
                pan,
                { x: e.clientX, y: e.clientY },
                pan.scale,
              ),
            );
          if (drag) setDrag({ ...drag, point: position(e) });
        }}
        onPointerUp={(e) => {
          setPan(null);
          if (drag) {
            const p = position(e);
            if (Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > 4)
              onMove(drag.kind, drag.id, p);
            setDrag(null);
          }
        }}
        onPointerCancel={() => {
          setDrag(null);
          setPan(null);
        }}
      >
        <defs>
          <pattern
            id="grid"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r=".8" fill="#cbd5df" />
          </pattern>
          <marker
            id="arrow"
            markerUnits="userSpaceOnUse"
            markerWidth="7"
            markerHeight="7"
            refX="7"
            refY="3.5"
            orient="auto"
          >
            <path d="M0,0 L7,3.5 L0,7" fill="#778799" />
          </marker>
        </defs>
        <rect
          width={city.width}
          height={city.height}
          fill="url(#grid)"
          pointerEvents="none"
        />
        {layers.context &&
          city.nodes
            .filter((n) => n.type === "HEAD")
            .map((n, i) => (
              <g key={`district-${n.id}`} pointerEvents="none">
                <rect
                  x={n.x - 105}
                  y={n.y + 25}
                  width="70"
                  height="38"
                  rx="14"
                  fill="#c9ddc1"
                  opacity=".6"
                />
                <path
                  d={`M${n.x + 45},${n.y - 45} l40,12 l-9,25 l-40,-12 Z`}
                  fill="#dfe5e2"
                />
                <ellipse
                  cx={n.x}
                  cy={n.y}
                  rx="130"
                  ry="90"
                  fill={i % 2 ? "#e7eee3" : "#e5eef0"}
                  opacity=".45"
                />
                <text x={n.x - 85} y={n.y - 60} fill="#597264" fontSize="13">
                  {n.label} · district context
                </text>
              </g>
            ))}
        {layers.zones &&
          city.zones.map((z) => {
            const points = hull(
              z.nodeIds.map((id) => nodes.get(id)).filter(Boolean) as Point[],
            );
            return points.length >= 3 ? (
              <polygon
                key={z.id}
                points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill={z.color}
                fillOpacity=".055"
                stroke={z.color}
                strokeOpacity=".25"
                strokeWidth="2"
                strokeDasharray="7 7"
                pointerEvents="none"
              />
            ) : null;
          })}
        {city.roads.map((r) => {
          const a = point(r.fromNodeId),
            b = point(r.toNodeId);
          if (!a || !b) return null;
          const dx = b.x - a.x,
            dy = b.y - a.y,
            len = Math.hypot(dx, dy) || 1,
            off = 4,
            startRadius =
              nodes.get(r.fromNodeId)?.type === "HEAD" ? 15 : editing ? 7 : 0,
            endRadius =
              nodes.get(r.toNodeId)?.type === "HEAD" ? 15 : editing ? 7 : 0;
          const x1 = a.x - (dy / len) * off + (dx / len) * startRadius,
            y1 = a.y + (dx / len) * off + (dy / len) * startRadius,
            x2 = b.x - (dy / len) * off - (dx / len) * endRadius,
            y2 = b.y + (dx / len) * off - (dy / len) * endRadius;
          return (
            <g
              key={r.id}
              onClick={() => onSelect({ kind: "road", id: r.id })}
              className="road"
              tabIndex={0}
              role="button"
              aria-label={`Road ${r.fromNodeId} to ${r.toNodeId}, ${r.distanceKm} km`}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSelect({ kind: "road", id: r.id });
              }}
            >
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#fff"
                strokeWidth={r.roadClass === "ARTERIAL" ? 11 : 7}
                pointerEvents="none"
              />
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="transparent"
                strokeWidth="16"
              />
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={selection?.id === r.id ? "#047857" : "#a4b1bc"}
                strokeWidth={
                  selection?.id === r.id
                    ? 4
                    : r.roadClass === "ARTERIAL"
                      ? 5
                      : 2.5
                }
                markerEnd={editing ? "url(#arrow)" : undefined}
              />
              {editing && selection?.id === r.id && (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 10}
                  fontSize="12"
                  fill="#1648b3"
                >
                  {r.distanceKm} km →
                </text>
              )}
              <title>
                {r.name}: {r.fromNodeId} → {r.toNodeId} · {r.distanceKm} km
              </title>
            </g>
          );
        })}
        {layers.routes &&
          plan?.trips
            .filter(
              (t) =>
                !simulationView ||
                t.truckId ===
                  (selection?.kind === "truck"
                    ? selection.id
                    : plan.trips[0]?.truckId),
            )
            .map((trip, i) => (
              <polyline
                key={trip.id}
                points={trip.nodes
                  .map((id) => point(id))
                  .filter(Boolean)
                  .map((p) => `${p.x},${p.y}`)
                  .join(" ")}
                fill="none"
                stroke={
                  city.zones.find((z) => z.id === trip.zoneId)?.color ??
                  "#047857"
                }
                strokeWidth="3"
                strokeOpacity=".65"
                strokeDasharray={`${8 + (i % 3)} 6`}
                pointerEvents="none"
              />
            ))}
        {city.nodes
          .filter(
            (n) =>
              editing ||
              n.type === "HEAD" ||
              (selection?.kind === "node" && selection.id === n.id),
          )
          .map((n) => {
            const p = point(n.id);
            return (
              <g
                key={n.id}
                transform={`translate(${p.x},${p.y})`}
                className="map-node"
                tabIndex={0}
                role="button"
                aria-label={`${n.label} ${n.type}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelect({ kind: "node", id: n.id });
                }}
                onPointerDown={(e) => {
                  onSelect({ kind: "node", id: n.id });
                  if (editing) {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    const p = position(e);
                    setDrag({ kind: "node", id: n.id, start: p, point: p });
                  }
                }}
              >
                <circle
                  r={n.type === "HEAD" ? 15 : 7}
                  fill={n.type === "HEAD" ? "#e3f1e9" : "#ffffff"}
                  stroke={
                    selection?.id === n.id
                      ? "#223c35"
                      : n.type === "HEAD"
                        ? "#047857"
                        : "#718393"
                  }
                  strokeWidth="2"
                />
                {n.type === "HEAD" && (
                  <text textAnchor="middle" y="4" fill="#047857" fontSize="11">
                    ▣
                  </text>
                )}
                <title>
                  {n.label} · {n.id}
                </title>
              </g>
            );
          })}
        {layers.bins &&
          city.bins.map((b, i) => {
            const n = point(b.roadNodeId);
            if (!n) return null;
            const stack = city.bins
              .filter((x) => x.roadNodeId === b.roadNodeId)
              .findIndex((x) => x.id === b.id);
            const p =
              drag?.kind === "bin" && drag.id === b.id
                ? drag.point
                : (b.position ?? {
                    x: Math.min(city.width - 15, n.x + 18 + (stack % 4) * 19),
                    y: Math.max(15, n.y - 21 - Math.floor(stack / 4) * 25),
                  });
            const completed = simulation?.completed.includes(b.id),
              pending = plan?.pending.some((p) => p.binId === b.id);
            const s = status(b.fillPercent, city.settings),
              color =
                s === "URGENT"
                  ? "#c43c42"
                  : s === "COLLECTION_NEEDED"
                    ? "#b16c0d"
                    : "#047857";
            return (
              <g
                key={b.id}
                transform={`translate(${p.x},${p.y})`}
                className="map-bin"
                tabIndex={0}
                role="button"
                aria-label={`${b.name} ${b.fillPercent}%`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelect({ kind: "bin", id: b.id });
                }}
                onPointerDown={(e) => {
                  onSelect({ kind: "bin", id: b.id });
                  if (editing) {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    const p = position(e);
                    setDrag({ kind: "bin", id: b.id, start: p, point: p });
                  }
                }}
              >
                {editing && (
                  <line
                    x1={n.x - p.x}
                    y1={n.y - p.y}
                    x2="0"
                    y2="0"
                    stroke="#627c89"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    pointerEvents="none"
                  />
                )}
                {city.zones.length > 0 &&
                  !city.zones.some((z) => z.binIds.includes(b.id)) && (
                    <circle
                      r="13"
                      fill="none"
                      stroke="#875bb2"
                      strokeDasharray="2 2"
                    >
                      <title>Unassigned bin</title>
                    </circle>
                  )}
                {completed && (
                  <circle r="14" fill="#e3f1e9" stroke="#047857">
                    <title>Pickup completed</title>
                  </circle>
                )}
                {pending && (
                  <circle
                    r="14"
                    fill="none"
                    stroke="#c43c42"
                    strokeDasharray="3 2"
                  >
                    <title>Pending: not scheduled</title>
                  </circle>
                )}
                <rect
                  x="-7"
                  y="-8"
                  width="14"
                  height="17"
                  rx="3"
                  fill="#ffffff"
                  stroke={selection?.id === b.id ? "#1648b3" : color}
                  strokeWidth="1.8"
                />
                <path
                  d="M-9,-10 H9 M-3,-13 H3"
                  stroke={color}
                  strokeWidth="2"
                />
                {(city.bins.length <= 20 || selection?.id === b.id) && (
                  <text y="25" fill={color} fontSize="10" textAnchor="middle">
                    {b.fillPercent}%
                  </text>
                )}
                <title>
                  {b.name}: {b.fillPercent}% · {s} · node {b.roadNodeId} (drag
                  to move marker only)
                </title>
              </g>
            );
          })}
        {simulation &&
          city.trucks.map((t, index) => {
            const trips = simulation.plan.trips.filter(
                (p) => p.truckId === t.id,
              ),
              trip = currentTrip(trips, simulation.time);
            if (!trip) return null;
            const state = tripState(trip, simulation.time),
              a = point(state.from),
              b = point(state.to);
            if (!a || !b) return null;
            const x = a.x + (b.x - a.x) * state.fraction,
              y = a.y + (b.y - a.y) * state.fraction;
            return (
              <g
                key={t.id}
                transform={`translate(${x + index * 5},${y - index * 5})`}
                role="button"
                tabIndex={0}
                aria-label={`Select ${t.label}`}
                onClick={() => onSelect({ kind: "truck", id: t.id })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect({ kind: "truck", id: t.id });
                  }
                }}
              >
                <rect
                  x="-13"
                  y="-9"
                  width="26"
                  height="18"
                  fill="#223c35"
                  stroke="#0e1823"
                  strokeWidth="3"
                  rx="4"
                />
                <text fill="#ffffff" fontSize="10" y="4" textAnchor="middle">
                  {index + 1}
                </text>
                <title>
                  {t.label} · {state.state}
                </title>
              </g>
            );
          })}
      </svg>
      {!city.nodes.length && (
        <div className="canvas-empty">
          <h3>Every city starts with a connection.</h3>
          <p>
            {editing
              ? "Double-click the canvas or choose + Node. Open Studio tools to generate a complete city."
              : "Choose Edit map to build a city."}
          </p>
        </div>
      )}
      <div className="map-legend">
        <span>
          <i style={{ background: "#047857" }} /> Normal
        </span>
        <span>
          <i style={{ background: "#b16c0d" }} /> Collection needed
        </span>
        <span>
          <i style={{ background: "#c43c42" }} /> Urgent
        </span>
        <span>▣ · Collection head</span>
        <span>Dashed boundary · illustrative zone extent</span>
        {simulationView && (
          <span>
            Route:{" "}
            {city.trucks.find(
              (t) =>
                t.id ===
                (selection?.kind === "truck"
                  ? selection.id
                  : plan?.trips[0]?.truckId),
            )?.label ?? "Plan collection first"}{" "}
            · select a truck to inspect
          </span>
        )}
      </div>
    </div>
  );
}
