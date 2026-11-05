import { City } from "./model";
export interface Path {
  distance: number;
  nodes: string[];
  roads: string[];
}
export function pathFinder(c: Pick<City, "nodes" | "roads">) {
  const adjacency = new Map(
    c.nodes.map((n) => [
      n.id,
      c.roads
        .filter((r) => r.fromNodeId === n.id)
        .sort((a, b) => a.id.localeCompare(b.id)),
    ]),
  );
  const cache = new Map<string, Map<string, Path>>();
  return (start: string, end: string): Path => {
    if (!adjacency.has(start) || !adjacency.has(end))
      return { distance: Infinity, nodes: [], roads: [] };
    if (!cache.has(start)) {
      const dist = new Map<string, number>([[start, 0]]),
        prev = new Map<string, { node: string; road: string }>(),
        open = new Set(adjacency.keys());
      while (open.size) {
        const current = [...open].sort(
          (a, b) =>
            (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity) ||
            a.localeCompare(b),
        )[0];
        const d = dist.get(current) ?? Infinity;
        if (!Number.isFinite(d)) break;
        open.delete(current);
        for (const road of adjacency.get(current)!) {
          if (!Number.isFinite(road.distanceKm) || road.distanceKm <= 0)
            throw Error("Road distances must be positive");
          const next = d + road.distanceKm;
          if (
            open.has(road.toNodeId) &&
            next < (dist.get(road.toNodeId) ?? Infinity)
          ) {
            dist.set(road.toNodeId, next);
            prev.set(road.toNodeId, { node: current, road: road.id });
          }
        }
      }
      const all = new Map<string, Path>();
      for (const n of adjacency.keys()) {
        const nodes = [n],
          roads: string[] = [];
        let cursor = n;
        while (cursor !== start && prev.has(cursor)) {
          const p = prev.get(cursor)!;
          roads.unshift(p.road);
          nodes.unshift(p.node);
          cursor = p.node;
        }
        all.set(n, {
          distance: dist.get(n) ?? Infinity,
          nodes: cursor === start ? nodes : [],
          roads: cursor === start ? roads : [],
        });
      }
      cache.set(start, all);
    }
    return cache.get(start)!.get(end)!;
  };
}
