import { useEffect, useMemo, useRef, useState } from "react";
import { screenToWorld, panCamera } from "../core/camera";
import { City, status } from "../core/model";
import { Plan } from "../core/routing";
import { Simulation, tripState, currentTrip, truckSnapshot, routeProgress } from "../core/simulation";
import MapSurface from "./MapSurface";
import {isBoardShowcase} from '../core/showcaseLayout';
import { zoneCells, streetsFor, binLayout } from "./mapGeometry";
export interface Selection {
  kind: "node" | "road" | "bin" | "zone" | "truck";
  id: string;
}
type Point = { x: number; y: number };
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
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const initiallyFitted = useRef(false);
  const worldWidth = viewport.height
    ? (city.height * viewport.width) / viewport.height
    : city.width;
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setViewport({ width, height });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
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
      ...binLayout(city, (id) => city.nodes.find((n) => n.id === id)!).values(),
    ];
    if (!pts.length) {
      reset();
      return;
    }
    const xs = pts.map((p) => p.x),
      ys = pts.map((p) => p.y),
      left = Math.min(...xs) - 28,
      right = Math.max(...xs) + 50,
      top = Math.min(...ys) - 30,
      bottom = Math.max(...ys) + 38;
    const w = viewport.width || 1100,
      h = viewport.height || 720;
    const wrap = ref.current?.parentElement,
      svgTop = ref.current?.getBoundingClientRect().top ?? 0;
    const controls = wrap
      ?.querySelector(".map-layers summary")
      ?.getBoundingClientRect();
    const legend = wrap?.querySelector(".map-legend")?.getBoundingClientRect();
    const topSpace = Math.max(
      120,
      controls ? controls.bottom - svgTop + 15 : 120,
    );
    const bottomSpace = Math.max(
      w < 500 ? 110 : 55,
      (legend?.height ?? 30) + 26,
    );
    const nextZoom = Math.max(
      0.3,
      Math.min(
        5,
        (worldWidth * Math.max(0.5, (w - 64) / w)) / (right - left),
        (city.height * Math.max(0.15, (h - topSpace - bottomSpace) / h)) /
          (bottom - top),
      ),
    );
    setZoom(nextZoom);
    setOffset({
      x: (left + right - city.width) / 2,
      y:
        (top + bottom - city.height) / 2 -
        (((topSpace - bottomSpace) / 2) * city.height) / nextZoom / h,
    });
  };
  useEffect(() => {
    if (viewport.width && !initiallyFitted.current) {
      fit();
      initiallyFitted.current = true;
    }
  }, [viewport.width, viewport.height]);
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
  const streets = useMemo(
    () => streetsFor(city, point),
    [city.nodes, city.roads, drag?.kind === "node" ? drag : null],
  );
  const binPositions = useMemo(
    () => binLayout(city, point),
    [city.nodes, city.bins, drag?.kind === "node" ? drag : null],
  );
  return (
    <div
      className={`canvas-wrap urban-map ${editing ? "engineering-map" : simulationView ? "simulation-map" : "city-view-map"}`}
    >
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
        viewBox={`${city.width / 2 + offset.x - worldWidth / zoom / 2} ${(city.height * (1 - 1 / zoom)) / 2 + offset.y} ${worldWidth / zoom} ${city.height / zoom}`}
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
        <MapSurface city={city} streets={streets} context={layers.context} />
        {layers.zones && zoneCells(city).map(cell=><polygon key={cell.id} data-zone-id={cell.zoneId} points={cell.points.map(p=>`${p.x},${p.y}`).join(" ")} fill={cell.color} fillOpacity=".14" stroke="none" pointerEvents="none"/>)}
        <g className="road-inspection">
          {city.roads.map((r) => {
            const a = point(r.fromNodeId),
              b = point(r.toNodeId),
              dx = b.x - a.x,
              dy = b.y - a.y,
              len = Math.hypot(dx, dy) || 1,
              off = editing ? 3 : 0,
              x1 = a.x - (dy / len) * off,
              y1 = a.y + (dx / len) * off,
              x2 = b.x - (dy / len) * off,
              y2 = b.y + (dx / len) * off,
              selected = selection?.kind === "road" && selection.id === r.id;
            const street = streets.find((s) =>
              s.roads.some((edge) => edge.id === r.id),
            );
            return (
              <g
                key={r.id}
                className="road"
                role="button"
                tabIndex={0}
                aria-label={`Road ${r.fromNodeId} to ${r.toNodeId}, ${r.distanceKm} km`}
                onClick={() => onSelect({ kind: "road", id: r.id })}
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
                  strokeWidth={editing ? 7 : 18}
                />
                {selected && (
                  <path
                    className="selected-road"
                    d={street?.path}
                    fill="none"
                    stroke="#1f8071"
                    strokeWidth="5"
                    strokeOpacity=".8"
                    strokeLinecap="round"
                    pointerEvents="none"
                  />
                )}
                {editing && (
                  <g
                    className="direction-chevron"
                    transform={`translate(${x1 + (x2 - x1) * 0.62},${y1 + (y2 - y1) * 0.62}) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI})`}
                    pointerEvents="none"
                  >
                    <path
                      d="M-3,-2.5 L0,0 L-3,2.5"
                      fill="none"
                      stroke="#6c8274"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </g>
                )}
                {editing && selected && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 13}
                    className="map-road-label"
                  >
                    {r.distanceKm} km →
                  </text>
                )}
                <title>
                  {`${r.name ?? "Road"}: ${r.fromNodeId} → ${r.toNodeId} · ${r.distanceKm} km`}
                </title>
              </g>
            );
          })}
        </g>
        {layers.routes &&
          plan?.trips
            .filter(
              (t) =>
                (simulationView || (selection?.kind === "truck" && t.truckId === selection.id)) && (!simulation || currentTrip(plan.trips.filter(p=>p.truckId===t.truckId),simulation.time)?.id===t.id),
            )
            .map((trip) => {
              const color=["#246b59", "#355d91", "#8554a0", "#a46224", "#237e88", "#a43c64", "#687623", "#5b4bb7"][Math.max(0,city.trucks.findIndex(t=>t.id===trip.truckId))%8];
              const parts=routeProgress(trip,simulation?.time??-1);
              const pathFor=(completed:boolean)=>parts.filter(p=>p.segment.distance>0&&(p.phase==='completed')===completed).map(p=>{const a=point(p.segment.from),b=point(p.segment.to);return a&&b?`M${a.x},${a.y} L${b.x},${b.y}`:'';}).join(' ');
              return <g key={trip.id} pointerEvents="none"><path className="route-completed" d={pathFor(true)} fill="none" stroke={color} strokeWidth="3" strokeOpacity=".22"/><path className="route-highlight" data-truck-id={trip.truckId} d={pathFor(false)} fill="none" stroke={color} strokeDasharray="8 4" strokeWidth={selection?.kind==='truck'&&selection.id===trip.truckId?6:4} strokeOpacity={selection?.kind==='truck'&&selection.id!==trip.truckId ? .25 : .75}/></g>;
            })}
        {simulationView && layers.routes && simulation && city.trucks.map((truck,index)=>{
          const state=truckSnapshot(city,simulation.plan,simulation.time,truck.id),a=point(state.from??''),b=point(state.to??'');if(!a||!b)return null;
          const color=["#246b59", "#355d91", "#8554a0", "#a46224", "#237e88", "#a43c64", "#687623", "#5b4bb7"][index%8];
          const x=a.x+(b.x-a.x)*state.fraction,y=a.y+(b.y-a.y)*state.fraction,angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
          return <g key={truck.id} className="active-road" data-truck-id={truck.id} pointerEvents="none">{state.from!==state.to?<><path d={`M${a.x},${a.y} L${x},${y}`} stroke={color} strokeWidth="7" fill="none"/><path d="M0,-5 L10,0 L0,5 Z" transform={`translate(${x},${y}) rotate(${angle})`} fill={color} stroke="white" strokeWidth="1"/></>:<circle cx={a.x} cy={a.y} r="20" stroke={color} strokeWidth="2" fill="none"/>}</g>;
        })}
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
                  r={n.type === "HEAD" ? 17 : 4}
                  fill={n.type === "HEAD" ? "#22705b" : "#ffffff"}
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
                  <path
                    d="M-8,-3 L0,-9 L8,-3 V8 H-8 Z M-3,8 V1 H3 V8"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                )}
                {n.type === "HEAD" && (
                  <text className="depot-label" textAnchor="middle" y="33">
                    {n.label}
                  </text>
                )}
                <title>{`${n.label} · ${n.id}`}</title>
              </g>
            );
          })}
        {layers.bins &&
          city.bins.map((b, i) => {
            const n = point(b.roadNodeId);
            if (!n) return null;
            const p =
              drag?.kind === "bin" && drag.id === b.id
                ? drag.point
                : binPositions.get(b.id)!;
            const completed = simulation?.completed.includes(b.id),
              pending = plan?.pending.some((p) => p.binId === b.id);
            const s = status(b.fillPercent, city.settings),
              color =
                isBoardShowcase(city) ? (/^BIN-00[1-4]$/.test(b.id)?'#d64b3f':'#338c52') : s === "URGENT"
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
                aria-label={`${b.name} ${isBoardShowcase(city) ? b.id : `${b.fillPercent}%`}`}
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
                <circle
                  vectorEffect="non-scaling-stroke"
                  r="12"
                  fill="#ffffff"
                  stroke={selection?.id === b.id ? "#1960b1" : color}
                  strokeWidth={selection?.id === b.id ? 3 : 1.5}
                />
                <rect
                  x="-5"
                  y="-5"
                  width="10"
                  height="11"
                  rx="2"
                  fill={color}
                  stroke={selection?.id === b.id ? "#1648b3" : color}
                  strokeWidth="1.8"
                />
                <path d="M-6,-7 H6 M-2,-9 H2" stroke={color} strokeWidth="2" />
                {(city.bins.length <= 20 || selection?.id === b.id) && (
                  <text y="25" fill={color} fontSize="10" textAnchor="middle">
                    {b.fillPercent}%
                  </text>
                )}
                <title>
                  {`${b.name}: ${b.fillPercent}% · ${s} · node ${b.roadNodeId} (drag to move marker only)`}
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
            const state = truckSnapshot(city,simulation.plan,simulation.time,t.id),
              a = point(state.from??''),
              b = point(state.to??'');
            if (!a || !b) return null;
            const x = a.x + (b.x - a.x) * state.fraction,
              y = a.y + (b.y - a.y) * state.fraction;
            return (
              <g
                key={t.id}
                transform={`translate(${x},${y})`}
                className="map-truck"
                data-truck-id={t.id}
                data-from={state.from}
                data-to={state.to}
                data-phase={state.state}
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
                <g transform={`rotate(${state.from!==state.to?Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI:0})`}><rect
                  x="-17"
                  y="-11"
                  width="31"
                  height="22"
                  fill={
                    ["#246b59", "#355d91", "#8554a0", "#a46224", "#237e88", "#a43c64", "#687623", "#5b4bb7"][
                      index % 8
                    ]
                  }
                  stroke="#fff"
                  strokeWidth={
                    selection?.kind === "truck" && selection.id === t.id ? 4 : 2
                  }
                  rx="4"
                />
                <path
                  d="M5,-10 V10 M6,-6 H11 V-2 H6 M-12,12 H-8 M7,12 H11"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                </g>
                <text
                  fill="#ffffff"
                  fontSize="11"
                  x="-6"
                  y="4"
                  textAnchor="middle"
                >
                  {index + 1}
                </text>
                <title>{`${t.label} · ${state.state} · ${city.nodes.find(n=>n.id===state.from)?.label??"No depot assigned"} → ${city.nodes.find(n=>n.id===state.to)?.label??"—"} · Next pickup: ${city.bins.find(b=>b.id===state.nextBinId)?.name??"None"}`}</title>
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
        {isBoardShowcase(city) ? <><span><i style={{background:'#d64b3f'}}/> REAL physical-derived bin</span><span><i style={{background:'#338c52'}}/> VIRTUAL bin</span><span>A1–A4 · dashed guides = road access, not truck routes</span></> : <><span><i style={{background:'#047857'}}/> Normal</span><span><i style={{background:'#b16c0d'}}/> Collection needed</span><span><i style={{background:'#c43c42'}}/> Urgent</span></>}
        <span>▣ · Collection head</span>
        <span>Faint cells = junction ownership</span>
        <span>Crossing gaps · no junction</span>
        {simulationView && city.trucks.filter(t=>plan?.trips.some(p=>p.truckId===t.id)).map(t=><span key={t.id}><i style={{background:["#246b59", "#355d91", "#8554a0", "#a46224", "#237e88", "#a43c64", "#687623", "#5b4bb7"][city.trucks.indexOf(t)%8]}}/>{t.label} route</span>)}
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
            · faint = completed · dashed = remaining current trip
          </span>
        )}
      </div>
    </div>
  );
}
