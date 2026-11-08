import { City, Truck } from "./model.js";
import { pathFinder } from "./graph.js";
export type Phase =
  | "DISPATCHED"
  | "TRAVELLING"
  | "COLLECTING"
  | "UNLOADING"
  | "RETURNING";
export interface Segment {
  kind: Phase;
  from: string;
  to: string;
  duration: number;
  distance: number;
  binId?: string;
  amount?: number;
}
export interface Trip {
  id: string;
  zoneId: string;
  truckId: string;
  head: string;
  origin: string;
  binIds: string[];
  load: number;
  nodes: string[];
  segments: Segment[];
  start: number;
  end: number;
  distance: number;
}
export interface Plan {
  trips: Trip[];
  pending: { binId: string; reason: string }[];
  eligible: string[];
  distance: number;
  laborMinutes: number;
  duration: number;
  cost: number;
  baseline: boolean;
}
export function comparablePlans(a: Plan, b: Plan): boolean {
  const same = (x: string[], y: string[]) =>
    JSON.stringify([...x].sort()) === JSON.stringify([...y].sort());
  return (
    same(a.eligible, b.eligible) &&
    same(
      a.pending.map((p) => p.binId),
      b.pending.map((p) => p.binId),
    )
  );
}
export function truckZoneAssignments(c:City){
 const available=c.trucks.filter(t=>t.available);
 const bindings=new Map(c.trucks.filter(t=>t.zoneId).map(t=>[t.id,t.zoneId!]));
 for(const truck of available.filter(t=>!t.zoneId)){
  const zone=[...c.zones].sort((a,b)=>available.filter(t=>bindings.get(t.id)===a.id).length-available.filter(t=>bindings.get(t.id)===b.id).length||a.id.localeCompare(b.id))[0];
  if(zone)bindings.set(truck.id,zone.id);
 }
 return bindings;
}
export function planCollection(c: City, baseline = false, collectAllBins = false): Plan {
  const eligible = c.bins.filter(
      (b) => collectAllBins || b.fillPercent >= c.settings.pickupThreshold,
    ),
    pending: Plan["pending"] = [],
    trips: Trip[] = [];
  const assigned = new Set<string>(),
    available = c.trucks.filter((t) => t.available),
    times = new Map(available.map((t) => [t.id, 0]));
  const zonePaths = new Map(c.zones.map(z=>{
    const ids=new Set([...z.nodeIds,z.headNodeId]);
    return [z.id,pathFinder({nodes:c.nodes.filter(n=>ids.has(n.id)),roads:c.roads.filter(r=>ids.has(r.fromNodeId)&&ids.has(r.toNodeId))})] as const;
  }));
  // A shared/unassigned vehicle is bound to one zone for this dispatch, never
  // silently transferred into another partition later in the same run.
  const bindings=truckZoneAssignments(c);
  // Every trip starts and ends at this truck's bound partition head.
  const locations = new Map<string, string>();
  const canReachHead = (truck: Truck, head: string) =>
    !locations.has(truck.id) ||
    locations.get(truck.id) === head;
  const makeTrip = (
    truck: Truck,
    zone: City["zones"][number],
    pool: City["bins"],
  ): Trip => {
    const path=zonePaths.get(zone.id)!;
    const origin = locations.get(truck.id) ?? zone.headNodeId;
    const trip: Trip = {
      id: `trip-${trips.length + 1}`,
      zoneId: zone.id,
      truckId: truck.id,
      head: zone.headNodeId,
      origin,
      binIds: [],
      load: 0,
      nodes: [origin],
      segments: [],
      start: times.get(truck.id) ?? 0,
      end: 0,
      distance: 0,
    };
    let node = origin;
    const travel = (destination: string, returning = false) => {
      const p = path(node, destination);
      p.roads.forEach((roadId) => {
        const road = c.roads.find((r) => r.id === roadId)!;
        trip.segments.push({
          kind: returning ? "RETURNING" : "TRAVELLING",
          from: road.fromNodeId,
          to: road.toNodeId,
          distance: road.distanceKm,
          duration:
            (road.distanceKm /
              c.settings.speeds[road.speedGrade ?? truck.speedGrade]) *
            60,
        });
        trip.nodes.push(road.toNodeId);
        trip.distance += road.distanceKm;
      });
      node = destination;
    };
    travel(zone.headNodeId);
    while (true) {
      const options = pool.filter(
        (b) =>
          !assigned.has(b.id) &&
          trip.load + (b.capacityBinUnits * b.fillPercent) / 100 <=
            truck.capacityBinUnits + 1e-9 &&
          Number.isFinite(path(node, b.roadNodeId).distance) &&
          Number.isFinite(path(b.roadNodeId, zone.headNodeId).distance),
      );
      options.sort((a, b) =>
        baseline
          ? a.id.localeCompare(b.id)
          : Number(b.fillPercent >= c.settings.urgentThreshold) -
              Number(a.fillPercent >= c.settings.urgentThreshold) ||
            path(node, a.roadNodeId).distance -
              path(node, b.roadNodeId).distance ||
            a.id.localeCompare(b.id),
      );
      const b = options[0];
      if (!b) break;
      travel(b.roadNodeId);
      const amount = (b.capacityBinUnits * b.fillPercent) / 100;
      trip.load += amount;
      trip.binIds.push(b.id);
      assigned.add(b.id);
      trip.segments.push({
        kind: "COLLECTING",
        from: node,
        to: node,
        duration: c.settings.serviceMinutes,
        distance: 0,
        binId: b.id,
        amount,
      });
    }
    travel(zone.headNodeId, true);
    trip.segments.push({
      kind: "UNLOADING",
      from: node,
      to: node,
      duration: c.settings.unloadingMinutes,
      distance: 0,
    });
    trip.end = trip.start + trip.segments.reduce((a, s) => a + s.duration, 0);
    return trip;
  };
  for (const zone of c.zones) {
    const path=zonePaths.get(zone.id)!;
    const invalidPartition=!zone.nodeIds.includes(zone.headNodeId)||zone.nodeIds.some(id=>c.zones.some(z=>z.id!==zone.id&&z.nodeIds.includes(id)));
    const pool = eligible.filter((b) => zone.binIds.includes(b.id));
    for (const bin of pool) {
      const trucks = available.filter((t) => bindings.get(t.id) === zone.id);
      const reachable = trucks.filter((t) => canReachHead(t, zone.headNodeId));
      const reason =
        invalidPartition ? 'Invalid partition: head must belong to its zone and junctions cannot belong to multiple zones' :
        !Number.isFinite(path(zone.headNodeId, bin.roadNodeId).distance) ||
        !Number.isFinite(path(bin.roadNodeId, zone.headNodeId).distance)
          ? "No directed round trip inside assigned zone"
          : !trucks.length
            ? "No available truck for zone"
            : !reachable.length
              ? "No available truck can reach this zone head"
              : reachable.every(
                    (t) =>
                      t.capacityBinUnits + 1e-9 <
                      (bin.capacityBinUnits * bin.fillPercent) / 100,
                  )
                ? "Bin load exceeds every available truck capacity"
                : null;
      if (reason) {
        pending.push({ binId: bin.id, reason });
        assigned.add(bin.id);
      }
    }
    while (pool.some((b) => !assigned.has(b.id))) {
      const truck = available
        .filter(
          (t) =>
            (bindings.get(t.id) === zone.id) &&
            canReachHead(t, zone.headNodeId) &&
            pool.some(
              (b) =>
                !assigned.has(b.id) &&
                (b.capacityBinUnits * b.fillPercent) / 100 <=
                  t.capacityBinUnits + 1e-9,
            ),
        )
        .sort(
          (a, b) =>
            times.get(a.id)! - times.get(b.id)! || a.id.localeCompare(b.id),
        )[0];
      if (!truck) break;
      const trip = makeTrip(truck, zone, pool);
      if (!trip.binIds.length) break;
      trips.push(trip);
      times.set(truck.id, trip.end);
      locations.set(truck.id, zone.headNodeId);
    }
  }
  eligible
    .filter((b) => !assigned.has(b.id))
    .forEach((b) =>
      pending.push({ binId: b.id, reason: "Unassigned to a feasible zone" }),
    );
  const distance = trips.reduce((a, t) => a + t.distance, 0),
    laborMinutes = trips.reduce((a, t) => a + t.end - t.start, 0),
    duration = Math.max(0, ...trips.map((t) => t.end));
  return {
    trips,
    pending,
    eligible: eligible.map((b) => b.id),
    distance,
    laborMinutes,
    duration,
    cost:
      distance * c.settings.costPerKmINR +
      (laborMinutes / 60) * c.settings.costPerHourINR,
    baseline,
  };
}
