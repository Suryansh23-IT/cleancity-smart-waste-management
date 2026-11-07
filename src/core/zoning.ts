import { City, Zone, colors } from "./model";
import { pathFinder } from "./graph";
// Keep fleet responsibility attached to its depot, even if zone IDs reorder.
export function regenerateZones(c: City, heads: string[]) {
  const result = autoZone(c, heads);
  const trucks = c.trucks.map(t => {
    if (!t.zoneId) return t; // Explicitly shared vehicles remain shared.
    const old = c.zones.find(z => z.id === t.zoneId);
    const next = result.zones.find(z => z.headNodeId === old?.headNodeId);
    if (!next) throw Error(`Reassign ${t.label} before removing its collection head. Zone generation was cancelled; fleet assignments were preserved.`);
    return {...t, zoneId: next.id};
  });
  return {...result, trucks};
}
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
  // Head-seeded assignment. Internal directed feasibility is checked below.
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
  // Increasing weak-graph distance assigns nearby nodes first.
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
        a.d - b.d ||
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
  // Remove disconnected pockets: a citywide round trip is not permission to
  // pass through another partition. Never publish a zone owning such nodes.
  const unassigned: string[]=[];
  for(const z of zones){
    const ids=new Set(z.nodeIds),local=pathFinder({nodes:c.nodes.filter(n=>ids.has(n.id)),roads:c.roads.filter(r=>ids.has(r.fromNodeId)&&ids.has(r.toNodeId))});
    const valid=z.nodeIds.filter(id=>Number.isFinite(local(z.headNodeId,id).distance)&&Number.isFinite(local(id,z.headNodeId).distance));
    unassigned.push(...z.nodeIds.filter(id=>!valid.includes(id)));z.nodeIds=valid;
  }
  // Attach a disconnected pocket only when both its outward and return paths
  // can be built using unowned nodes and this region, never another region.
  const remaining=new Set(unassigned);
  let progress=true;
  while(progress&&remaining.size){progress=false;
    for(const id of [...remaining].sort()){
      const choices=zones.map(z=>{const ids=new Set([...z.nodeIds,...remaining]);const local=pathFinder({nodes:c.nodes.filter(n=>ids.has(n.id)),roads:c.roads.filter(r=>ids.has(r.fromNodeId)&&ids.has(r.toNodeId))});const out=local(z.headNodeId,id),back=local(id,z.headNodeId);return {z,out,back,d:out.distance+back.distance};}).filter(x=>Number.isFinite(x.d)).sort((a,b)=>a.d-b.d||a.z.id.localeCompare(b.z.id));
      const winner=choices[0];if(!winner)continue;
      for(const node of [...winner.out.nodes,...winner.back.nodes])if(remaining.delete(node)){winner.z.nodeIds.push(node);progress=true;}
    }
  }
  for(const z of zones)z.binIds=c.bins.filter(b=>z.nodeIds.includes(b.roadNodeId)).map(b=>b.id);
  for(const id of remaining)warnings.push(`${c.nodes.find(n=>n.id===id)?.label??id}: no round trip inside a single partition; left unassigned`);
  return { zones, warnings };
}
export function reassignBin(c: City, binId: string, zoneId: string): City {
  const bin = c.bins.find((b) => b.id === binId),
    zone = c.zones.find((z) => z.id === zoneId);
  if (!bin || !zone) throw Error("Select a valid bin and zone");
  if(!zone.nodeIds.includes(bin.roadNodeId))throw Error('Move the road access point into this partition before reassigning its bin.');
  const ids=new Set(zone.nodeIds);
  const path = pathFinder({nodes:c.nodes.filter(n=>ids.has(n.id)),roads:c.roads.filter(r=>ids.has(r.fromNodeId)&&ids.has(r.toNodeId))});
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
  for (const zone of c.zones) {
    const ids=new Set([...zone.nodeIds,zone.headNodeId]);
    const path=pathFinder({nodes:c.nodes.filter(n=>ids.has(n.id)),roads:c.roads.filter(r=>ids.has(r.fromNodeId)&&ids.has(r.toNodeId))});
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
}
