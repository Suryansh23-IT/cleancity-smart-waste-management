import { City, Zone, colors } from "./model";
import { pathFinder } from "./graph";
export function autoZone(
  c: City,
  heads: string[],
): { zones: Zone[]; warnings: string[] } {
  if (
    !Number.isInteger(c.settings.zoneCount) ||
    c.settings.zoneCount < 1 ||
    c.settings.zoneCount > 6 ||
    heads.length !== c.settings.zoneCount ||
    new Set(heads).size !== heads.length ||
    heads.some((h) => !c.nodes.some((n) => n.id === h && n.type === "HEAD"))
  )
    throw Error("Select K distinct HEAD nodes, one for every zone (K = 1–6).");
  // Head-seeded graph-distance assignment with a workload penalty, followed by directed checks.
  const weakRoads = c.roads.flatMap((r) => [
    r,
    {
      ...r,
      id: `reverse:${r.id}`,
      fromNodeId: r.toNodeId,
      toNodeId: r.fromNodeId,
    },
  ]);
  const weak = pathFinder({ ...c, roads: weakRoads }),
    directed = pathFinder(c);
  const zones: Zone[] = heads.map((head, i) => ({
    id: `zone-${i + 1}`,
    name: `Zone ${i + 1}`,
    color: colors[i],
    headNodeId: head,
    nodeIds: [],
    binIds: [],
    manual: false,
  }));
  const warnings: string[] = [];
  const distances = (node: string, i: number) => weak(heads[i], node).distance;
  // Increasing graph distance assigns nearby nodes first; small workload penalty balances boundaries.
  const order = [...c.nodes].sort(
    (a, b) =>
      Math.min(...heads.map((_, i) => distances(a.id, i))) -
        Math.min(...heads.map((_, i) => distances(b.id, i))) ||
      a.id.localeCompare(b.id),
  );
  for (const n of order) {
    const candidates = zones
      .map((z, i) => ({ z, i, d: distances(n.id, i) }))
      .filter(
        (x) =>
          Number.isFinite(x.d) &&
          Number.isFinite(directed(x.z.headNodeId, n.id).distance) &&
          Number.isFinite(directed(n.id, x.z.headNodeId).distance),
      );
    const ownHead = heads.indexOf(n.id);
    candidates.sort(
      (a, b) =>
        a.d + a.z.binIds.length * 0.035 - (b.d + b.z.binIds.length * 0.035) ||
        a.i - b.i,
    );
    const winner =
      ownHead >= 0 ? candidates.find((x) => x.i === ownHead) : candidates[0];
    if (!winner) {
      if (c.bins.some((b) => b.roadNodeId === n.id))
        warnings.push(`${n.label}: no head has a directed round trip`);
      continue;
    }
    winner.z.nodeIds.push(n.id);
    winner.z.binIds.push(
      ...c.bins.filter((b) => b.roadNodeId === n.id).map((b) => b.id),
    );
  }
  return { zones, warnings };
}
export function reassignBin(c: City, binId: string, zoneId: string): City {
  const bin = c.bins.find((b) => b.id === binId),
    zone = c.zones.find((z) => z.id === zoneId);
  if (!bin || !zone) throw Error("Select a valid bin and zone");
  const path = pathFinder(c);
  if (
    !Number.isFinite(path(zone.headNodeId, bin.roadNodeId).distance) ||
    !Number.isFinite(path(bin.roadNodeId, zone.headNodeId).distance)
  )
    throw Error(
      "This bin cannot make a directed round trip to the selected head",
    );
  return {
    ...c,
    zones: c.zones.map((z) => ({
      ...z,
      manual: true,
      binIds:
        z.id === zoneId
          ? [...z.binIds.filter((id) => id !== binId), binId]
          : z.binIds.filter((id) => id !== binId),
    })),
  };
}
export function relocateBin(c: City, binId: string, nodeId: string): City {
  if (!c.nodes.some((n) => n.id === nodeId))
    throw Error("Choose an existing road node");
  const bin = c.bins.find((b) => b.id === binId);
  if (!bin) throw Error("Choose an existing bin");
  if (bin.roadNodeId === nodeId) return c;
  return {
    ...c,
    bins: c.bins.map((b) =>
      b.id === binId ? { ...b, roadNodeId: nodeId } : b,
    ),
    zones: c.zones.map((z) => ({
      ...z,
      binIds: z.binIds.filter((id) => id !== binId),
    })),
  };
}
export function validateZoneTrips(c: City): void {
  const path = pathFinder(c);
  for (const zone of c.zones)
    for (const bin of c.bins.filter((b) => zone.binIds.includes(b.id))) {
      if (
        !Number.isFinite(path(zone.headNodeId, bin.roadNodeId).distance) ||
        !Number.isFinite(path(bin.roadNodeId, zone.headNodeId).distance)
      )
        throw Error(
          `${zone.name}: ${bin.name} has no directed round trip. Reassign the bin or regenerate zones.`,
        );
    }
}
