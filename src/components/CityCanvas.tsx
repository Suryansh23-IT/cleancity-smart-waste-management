import { useRef, useState } from "react";
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
}: {
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
  const position = (e: React.MouseEvent): Point => {
    const svg = ref.current!,
      p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
        svg.getScreenCTM()!.inverse(),
      );
    return {
      x: Math.max(0, Math.min(city.width, p.x)),
      y: Math.max(0, Math.min(city.height, p.y)),
    };
  };
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
        <button
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
        >
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
        >
          +
        </button>
      </div>
      <svg
        ref={ref}
        role="group"
        aria-label="Interactive directed city road network"
        viewBox={`${(city.width * (1 - 1 / zoom)) / 2} ${(city.height * (1 - 1 / zoom)) / 2} ${city.width / zoom} ${city.height / zoom}`}
        onDoubleClick={(e) => {
          if (editing && e.target === ref.current) onCreate(position(e));
        }}
        onPointerMove={(e) => {
          if (drag) setDrag({ ...drag, point: position(e) });
        }}
        onPointerUp={(e) => {
          if (drag) {
            const p = position(e);
            if (Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > 4)
              onMove(drag.kind, drag.id, p);
            setDrag(null);
          }
        }}
        onPointerCancel={() => setDrag(null)}
      >
        <defs>
          <pattern
            id="grid"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r=".8" fill="#34404f" />
          </pattern>
          <marker
            id="arrow"
            markerWidth="7"
            markerHeight="7"
            refX="7"
            refY="3.5"
            orient="auto"
          >
            <path d="M0,0 L7,3.5 L0,7" fill="#69778c" />
          </marker>
        </defs>
        <rect
          width={city.width}
          height={city.height}
          fill="url(#grid)"
          pointerEvents="none"
        />
        {city.zones.map((z) => {
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
            off = 4;
          const x1 = a.x - (dy / len) * off + (dx / len) * 15,
            y1 = a.y + (dx / len) * off + (dy / len) * 15,
            x2 = b.x - (dy / len) * off - (dx / len) * 18,
            y2 = b.y + (dx / len) * off - (dy / len) * 18;
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
                stroke="transparent"
                strokeWidth="16"
              />
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={selection?.id === r.id ? "#62d7af" : "#3e4a5a"}
                strokeWidth={selection?.id === r.id ? 4 : 2}
                markerEnd="url(#arrow)"
              />
              <title>
                {r.name}: {r.fromNodeId} → {r.toNodeId} · {r.distanceKm} km
              </title>
            </g>
          );
        })}
        {plan?.trips.map((trip, i) => (
          <polyline
            key={trip.id}
            points={trip.nodes
              .map((id) => point(id))
              .filter(Boolean)
              .map((p) => `${p.x},${p.y}`)
              .join(" ")}
            fill="none"
            stroke={
              city.zones.find((z) => z.id === trip.zoneId)?.color ?? "#62d7af"
            }
            strokeWidth="3"
            strokeOpacity=".65"
            strokeDasharray={`${8 + (i % 3)} 6`}
            pointerEvents="none"
          />
        ))}
        {city.nodes.map((n) => {
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
                fill={n.type === "HEAD" ? "#182f2c" : "#172231"}
                stroke={
                  selection?.id === n.id
                    ? "#fff"
                    : n.type === "HEAD"
                      ? "#62d7af"
                      : "#5b687b"
                }
                strokeWidth="2"
              />
              {n.type === "HEAD" && (
                <text textAnchor="middle" y="4" fill="#62d7af" fontSize="11">
                  H
                </text>
              )}
              <title>
                {n.label} · {n.id}
              </title>
            </g>
          );
        })}
        {city.bins.map((b, i) => {
          const n = point(b.roadNodeId);
          if (!n) return null;
          const stack = city.bins
            .filter((x) => x.roadNodeId === b.roadNodeId)
            .findIndex((x) => x.id === b.id);
          const p =
            drag?.kind === "bin" && drag.id === b.id
              ? drag.point
              : { x: n.x + 18 + stack * 19, y: n.y - 21 };
          const s = status(b.fillPercent, city.settings),
            color =
              s === "URGENT"
                ? "#f78484"
                : s === "COLLECTION_NEEDED"
                  ? "#ffbc70"
                  : "#62d7af";
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
              <rect
                x="-7"
                y="-8"
                width="14"
                height="17"
                rx="3"
                fill="#15232b"
                stroke={selection?.id === b.id ? "white" : color}
                strokeWidth="1.8"
              />
              <path d="M-9,-10 H9 M-3,-13 H3" stroke={color} strokeWidth="2" />
              {(city.bins.length <= 20 || selection?.id === b.id) && (
                <text y="25" fill={color} fontSize="10" textAnchor="middle">
                  {b.fillPercent}%
                </text>
              )}
              <title>
                {b.name}: {b.fillPercent}% · {s} · node {b.roadNodeId} (drag to
                snap)
              </title>
            </g>
          );
        })}
        {simulation &&
          city.trucks.map((t) => {
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
              <g key={t.id} transform={`translate(${x},${y})`}>
                <rect
                  x="-13"
                  y="-9"
                  width="26"
                  height="18"
                  fill="#fff"
                  stroke="#0e1823"
                  strokeWidth="3"
                  rx="4"
                />
                <text fill="#112320" fontSize="10" y="4" textAnchor="middle">
                  T
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
          <p>Double-click the canvas to place a road node.</p>
        </div>
      )}
      <div className="map-legend">
        <span>
          <i style={{ background: "#62d7af" }} /> Normal
        </span>
        <span>
          <i style={{ background: "#ffbc70" }} /> Collection needed
        </span>
        <span>
          <i style={{ background: "#f78484" }} /> Urgent
        </span>
        <span>H · Municipal head</span>
      </div>
    </div>
  );
}
