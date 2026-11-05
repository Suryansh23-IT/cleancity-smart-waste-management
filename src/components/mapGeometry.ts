import { City, Road } from "../core/model";
export interface Point {
  x: number;
  y: number;
}
export interface Street {
  id: string;
  a: Point;
  b: Point;
  roads: Road[];
  major: boolean;
  path: string;
  length: number;
}
export function hull(points: Point[]): Point[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross = (o: Point, a: Point, b: Point) =>
      (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x),
    lower: Point[] = [],
    upper: Point[] = [];
  for (const p of pts) {
    while (lower.length > 1 && cross(lower.at(-2)!, lower.at(-1)!, p) <= 0)
      lower.pop();
    lower.push(p);
  }
  for (const p of pts.reverse()) {
    while (upper.length > 1 && cross(upper.at(-2)!, upper.at(-1)!, p) <= 0)
      upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
export const polygon = (p: Point[]) => p.map((p) => `${p.x},${p.y}`).join(" ");
export function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = Math.max(
      0,
      Math.min(
        1,
        ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
      ),
    );
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
// Only unpositioned markers are decluttered. Explicit user coordinates are exact.
export function binLayout(city: City, point: (id: string) => Point) {
  const result = new Map<string, Point>(),
    occupied = city.bins.flatMap((b) => (b.position ? [b.position] : [])),
    counts = new Map<string, number>();
  for (const b of city.bins) {
    if (b.position) {
      result.set(b.id, b.position);
      continue;
    }
    const node = point(b.roadNodeId),
      stack = counts.get(b.roadNodeId) ?? 0;
    counts.set(b.roadNodeId, stack + 1);
    const preferred = {
      x: node.x + 22 + (stack % 3) * 27,
      y: node.y - 25 - Math.floor(stack / 3) * 28,
    };
    let chosen = preferred;
    outer: for (const radius of [0, 20, 40, 60, 80, 100])
      for (let i = 0; i < (radius ? 12 : 1); i++) {
        const angle = (i * Math.PI) / 6,
          candidate = {
            x: preferred.x + Math.cos(angle) * radius,
            y: preferred.y + Math.sin(angle) * radius,
          };
        if (
          candidate.x < 15 ||
          candidate.x > city.width - 15 ||
          candidate.y < 15 ||
          candidate.y > city.height - 15
        )
          continue;
        if (
          occupied.some(
            (p) => Math.hypot(p.x - candidate.x, p.y - candidate.y) < 27,
          ) ||
          city.nodes.some(
            (n) =>
              n.type === "HEAD" &&
              Math.hypot(n.x - candidate.x, n.y - candidate.y) < 34,
          )
        )
          continue;
        chosen = candidate;
        break outer;
      }
    result.set(b.id, chosen);
    occupied.push(chosen);
  }
  return result;
}
// A crossing is NOT a junction unless the graph shares a node ID.
export function crossing(a: Point, b: Point, c: Point, d: Point) {
  const rx = b.x - a.x,
    ry = b.y - a.y,
    sx = d.x - c.x,
    sy = d.y - c.y,
    den = rx * sy - ry * sx;
  if (Math.abs(den) < 0.00001) return null;
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den,
    u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99 ? t : null;
}
export function streetsFor(city: City, point: (id: string) => Point): Street[] {
  const groups = new Map<string, Road[]>();
  for (const r of city.roads) {
    const id = JSON.stringify([r.fromNodeId, r.toNodeId].sort());
    groups.set(id, [...(groups.get(id) ?? []), r]);
  }
  const streets = [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, roads]) => {
      const [from, to] = [roads[0].fromNodeId, roads[0].toNodeId].sort(),
        a = point(from),
        b = point(to);
      return {
        id,
        a,
        b,
        roads,
        major: roads.some((r) => r.roadClass === "ARTERIAL"),
        path: "",
        length: Math.hypot(b.x - a.x, b.y - a.y),
      };
    });
  for (let i = 0; i < streets.length; i++) {
    const s = streets[i],
      gaps: [number, number][] = [];
    for (let j = i + 1; j < streets.length; j++) {
      const other = streets[j];
      if (
        [s.roads[0].fromNodeId, s.roads[0].toNodeId].some(
          (id) =>
            id === other.roads[0].fromNodeId || id === other.roads[0].toNodeId,
        )
      )
        continue;
      const t = crossing(s.a, s.b, other.a, other.b);
      if (t !== null) {
        const half = (other.major ? 13 : 10) / Math.max(1, s.length);
        gaps.push([Math.max(0, t - half), Math.min(1, t + half)]);
      }
    }
    const ranges: [number, number][] = [];
    for (const g of gaps.sort((a, b) => a[0] - b[0])) {
      const last = ranges.at(-1);
      if (last && g[0] <= last[1]) last[1] = Math.max(last[1], g[1]);
      else ranges.push([...g]);
    }
    const at = (t: number) =>
      `${s.a.x + (s.b.x - s.a.x) * t},${s.a.y + (s.b.y - s.a.y) * t}`;
    let cursor = 0,
      path = "";
    for (const [start, end] of [...ranges, [1, 1] as [number, number]]) {
      if (start > cursor) path += `M${at(cursor)} L${at(start)} `;
      cursor = end;
    }
    s.path = path;
  }
  return streets;
}
function clip(poly: Point[], a: number, b: number, c: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i],
      q = poly[(i + 1) % poly.length],
      v = a * p.x + b * p.y - c,
      w = a * q.x + b * q.y - c;
    if (v <= 0) out.push(p);
    if ((v < 0 && w > 0) || (v > 0 && w < 0)) {
      const t = v / (v - w);
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  return out;
}
export function landParcels(city: City) {
  const outline = hull(
    city.nodes.flatMap((n) => [
      { x: n.x - 55, y: n.y - 55 },
      { x: n.x + 55, y: n.y - 55 },
      { x: n.x + 55, y: n.y + 55 },
      { x: n.x - 55, y: n.y + 55 },
    ]),
  );
  const sites = city.nodes.filter(
    (_, i) => i % Math.max(1, Math.ceil(city.nodes.length / 90)) === 0,
  );
  return sites
    .map((site, i) => {
      let cell = outline;
      for (const other of sites) {
        if (other === site) continue;
        cell = clip(
          cell,
          2 * (other.x - site.x),
          2 * (other.y - site.y),
          other.x ** 2 + other.y ** 2 - site.x ** 2 - site.y ** 2,
        );
        if (!cell.length) break;
      }
      return { id: site.id, points: cell, park: i % 7 === 3, shade: i % 3 };
    })
    .filter((p) => p.points.length > 2);
}
export function footprints(city: City, streets: Street[]) {
  const result: { id: string; points: Point[] }[] = [];
  for (const s of streets) {
    if (s.length < 65) continue;
    const dx = (s.b.x - s.a.x) / s.length,
      dy = (s.b.y - s.a.y) / s.length;
    for (const t of [0.28, 0.55, 0.76])
      for (const side of [-1, 1]) {
        const p = {
          x: s.a.x + (s.b.x - s.a.x) * t - dy * side * 24,
          y: s.a.y + (s.b.y - s.a.y) * t + dx * side * 24,
        };
        if (
          streets.some(
            (other) => distanceToSegment(p, other.a, other.b) < 19,
          ) ||
          city.nodes.some((n) => Math.hypot(n.x - p.x, n.y - p.y) < 28) ||
          result.some(
            (r) => Math.hypot(r.points[0].x - p.x, r.points[0].y - p.y) < 23,
          )
        )
          continue;
        const corners = [
          [-10, -6],
          [10, -6],
          [10, 6],
          [-10, 6],
        ].map(([x, y]) => ({
          x: p.x + x * dx - y * dy,
          y: p.y + x * dy + y * dx,
        }));
        result.push({ id: `${s.id}-${t}-${side}`, points: corners });
      }
  }
  return result.slice(0, 220);
}
