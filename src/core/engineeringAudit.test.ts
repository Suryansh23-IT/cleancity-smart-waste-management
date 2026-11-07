import { expect, it } from "vitest";
import { createCuratedCities } from "./curated";
import { pathFinder } from "./graph";
import type { City } from "./model";
import { createReadyCities } from "./readyCities";
import { planCollection, type Plan, type Trip } from "./routing";
import { captureSnapshot, showcaseCity, testReadings } from "./showcase";
import { advance, routeProgress, startSimulation, truckSnapshot } from "./simulation";

type Graph = Pick<City, "nodes" | "roads">;

function distanceOracle(graph: Graph) {
  const index = new Map(graph.nodes.map(({ id }, i) => [id, i]));
  const distances = graph.nodes.map((_, i) =>
    graph.nodes.map((_, j) => i === j ? 0 : Infinity),
  );
  for (const road of graph.roads) {
    const from = index.get(road.fromNodeId)!;
    const to = index.get(road.toNodeId)!;
    distances[from][to] = Math.min(distances[from][to], road.distanceKm);
  }
  for (let via = 0; via < distances.length; via++)
    for (const row of distances)
      for (let to = 0; to < row.length; to++)
        row[to] = Math.min(row[to], row[via] + distances[via][to]);

  return (from: string, to: string) =>
    distances[index.get(from)!]?.[index.get(to)!] ?? Infinity;
}

function auditPaths(graph: Graph, origins: string[], destinations: string[]) {
  const oracle = distanceOracle(graph);
  const find = pathFinder(graph);
  const roads = new Map(graph.roads.map((road) => [road.id, road]));
  for (const from of origins) {
    for (const to of destinations) {
      const expected = oracle(from, to);
      const path = find(from, to);
      if (expected === Infinity) {
        expect(path).toEqual({ distance: Infinity, nodes: [], roads: [] });
        continue;
      }
      expect(path.nodes[0]).toBe(from);
      expect(path.nodes.at(-1)).toBe(to);
      expect(path.roads).toHaveLength(path.nodes.length - 1);
      const reconstructed = path.roads.reduce((distance, id, i) => {
        const road = roads.get(id)!;
        expect([road.fromNodeId, road.toNodeId]).toEqual(path.nodes.slice(i, i + 2));
        return distance + road.distanceKm;
      }, 0);
      expect(path.distance).toBeCloseTo(expected, 9);
      expect(reconstructed).toBeCloseTo(expected, 9);
    }
  }
}

it("matches an independent directed oracle with parallel roads, ties and unreachable nodes", () => {
  const nodes: Graph["nodes"] = ["a", "b", "c", "d", "isolated"].map((id, x) =>
    ({ id, label: id, x, y: 0, type: "INTERSECTION" }),
  );
  const edges = [
    ["a", "b", 1], ["a", "b", 1], ["a", "b", 8], ["a", "c", 2],
    ["b", "c", 1], ["c", "b", 3], ["b", "d", 1], ["c", "d", 1],
  ] as const;
  const roads = edges.map(([fromNodeId, toNodeId, distanceKm], i) =>
    ({ id: `edge-${i}`, fromNodeId, toNodeId, distanceKm }),
  );
  const ids = [...nodes.map((node) => node.id), "missing"];
  auditPaths({ nodes, roads }, ids, ids);
  expect(pathFinder({ nodes, roads: [...roads].reverse() })("a", "b").roads).toEqual(["edge-0"]);
  for (const distanceKm of [0, -1, Infinity, NaN]) {
    const invalid = { ...roads[0], distanceKm };
    expect(() => pathFinder({ nodes, roads: [invalid] })("a", "b")).toThrow(/positive/);
  }
});

it("reconstructs independent shortest paths at every bin and depot across the retained library", () => {
  const cities = [...createCuratedCities(), ...createReadyCities(), showcaseCity()];
  expect(cities).toHaveLength(12);
  for (const city of cities) {
    const stops = [...new Set([
      ...city.bins.map((bin) => bin.roadNodeId),
      ...city.zones.map((zone) => zone.headNodeId),
    ])];
    auditPaths(city, stops, stops);
  }
});

function auditDispatchLegs(city: City, plan: Plan) {
  for (const zone of city.zones) {
    const allowed = new Set(zone.nodeIds);
    const roads = city.roads.filter((road) =>
      allowed.has(road.fromNodeId) && allowed.has(road.toNodeId));
    const oracle = distanceOracle({ nodes: city.nodes.filter((n) => allowed.has(n.id)), roads });
    for (const trip of plan.trips.filter((t) => t.zoneId === zone.id)) {
      const truck = city.trucks.find((t) => t.id === trip.truckId)!;
      let lastStop = zone.headNodeId;
      let at = lastStop;
      let legKm = 0;
      let load = 0;
      let tripMinutes = 0;
      for (const segment of trip.segments) {
        expect(segment.from, `${city.name} / ${trip.id}`).toBe(at);
        at = segment.to;
        tripMinutes += segment.duration;
        if (segment.kind === "COLLECTING" || segment.kind === "UNLOADING") {
          expect(segment.from).toBe(segment.to);
          expect(legKm).toBeCloseTo(oracle(lastStop, at), 9);
          legKm = 0;
          lastStop = at;
          if (segment.kind === "COLLECTING") {
            const bin = city.bins.find(({ id }) => id === segment.binId)!;
            expect(at).toBe(bin.roadNodeId);
            expect(zone.binIds).toContain(bin.id);
            const demand = bin.fillPercent * bin.capacityBinUnits / 100;
            expect(segment.amount).toBeCloseTo(demand, 9);
            load += demand;
            expect(load).toBeLessThanOrEqual(truck.capacityBinUnits + 1e-9);
            expect(segment.duration).toBe(city.settings.serviceMinutes);
          } else {
            expect(at).toBe(zone.headNodeId);
            expect(segment.duration).toBe(city.settings.unloadingMinutes);
            load = 0;
          }
        } else {
          const edge = roads.find((road) =>
            road.fromNodeId === segment.from && road.toNodeId === segment.to &&
            road.distanceKm === segment.distance &&
            Math.abs(segment.duration - 60 * road.distanceKm / city.settings.speeds[road.speedGrade ?? truck.speedGrade]) < 1e-9);
          expect(edge, `${city.name} / ${segment.from} → ${segment.to}`).toBeDefined();
          legKm += segment.distance;
        }
      }
      expect(at).toBe(zone.headNodeId);
      expect(legKm).toBe(0);
      expect(load).toBe(0);
      expect(trip.end - trip.start).toBeCloseTo(tripMinutes, 9);
    }
  }
}

it("checks every dispatched stop-to-stop leg inside the assigned zone, for both routing policies", () => {
  const now = Date.UTC(2026, 10, 7);
  const cities = [
    ...createCuratedCities(),
    ...createReadyCities(),
    captureSnapshot(showcaseCity(), testReadings(now), "TEST", now),
  ];
  for (const city of cities) {
    auditDispatchLegs(city, planCollection(city));
    auditDispatchLegs(city, planCollection(city, true));
    auditDispatchLegs(city, planCollection(city, false, true));
  }
});

it("compares the showcase dispatch with all feasible capacity-bounded pickup orders and unload splits", () => {
  const now = Date.UTC(2026, 10, 7);
  const city = captureSnapshot(showcaseCity(), testReadings(now), "TEST", now);
  const [zone] = city.zones;
  const [truck] = city.trucks;
  const plan = planCollection(city);
  const head = zone.headNodeId;
  const allowed = new Set(zone.nodeIds);
  const oracle = distanceOracle({
    nodes: city.nodes.filter((node) => allowed.has(node.id)),
    roads: city.roads.filter((road) => allowed.has(road.fromNodeId) && allowed.has(road.toNodeId)),
  });
  const eligible = city.bins.filter((bin) => bin.fillPercent >= city.settings.pickupThreshold);
  expect(eligible.map(({ id }) => id)).toEqual(["BIN-001", "BIN-002", "BIN-003", "BIN-004"]);
  const units = (bin: City["bins"][number]) => bin.capacityBinUnits * bin.fillPercent / 100;
  let shortest = Infinity;
  let feasibleSchedules = 0;
  let exactOrder: string[] = [];
  function enumerate(remaining: City["bins"], at: string, load: number, distance: number, order: string[]) {
    if (!remaining.length) {
      const roundTripDistance = distance + oracle(at, head);
      if (Number.isFinite(roundTripDistance)) feasibleSchedules++;
      if (roundTripDistance < shortest - 1e-9) {
        shortest = roundTripDistance;
        exactOrder = order;
      }
      return;
    }
    for (const bin of remaining) {
      const rest = remaining.filter(({ id }) => id !== bin.id);
      const demand = units(bin);
      if (load + demand <= truck.capacityBinUnits)
        enumerate(rest, bin.roadNodeId, load + demand, distance + oracle(at, bin.roadNodeId), [...order, bin.id]);
      if (load > 0 && demand <= truck.capacityBinUnits)
        enumerate(rest, bin.roadNodeId, demand, distance + oracle(at, head) + oracle(head, bin.roadNodeId), [...order, head, bin.id]);
    }
  }
  enumerate(eligible, head, 0, 0, [head]);
  expect(feasibleSchedules).toBe(192);
  expect(plan.pending).toEqual([]);
  expect(plan.trips).toHaveLength(1);
  expect(plan.trips.flatMap((trip) => trip.binIds).sort()).toEqual(eligible.map(({ id }) => id));
  for (const trip of plan.trips) {
    let lastStop = head;
    let distance = 0;
    for (const segment of trip.segments) {
      expect(allowed.has(segment.from) && allowed.has(segment.to)).toBe(true);
      if (segment.kind === "COLLECTING" || segment.kind === "UNLOADING") {
        distance += oracle(lastStop, segment.from);
        lastStop = segment.from;
      }
    }
    expect(lastStop).toBe(head);
    expect(trip.distance).toBeCloseTo(distance, 9);
  }
  expect(plan.distance).toBeCloseTo(shortest, 9);
  console.info({
    feasibleSchedules,
    shortestKm: shortest,
    exactOrder: [...exactOrder, head],
    plannedKm: plan.distance,
    plannedOrder: plan.trips.map((trip) => trip.binIds),
  });
});

it("keeps the approved green showcase bins unchanged during threshold playback", () => {
  const now = Date.UTC(2026, 10, 7);
  const city = captureSnapshot(showcaseCity(), testReadings(now), "TEST", now);
  const plan = planCollection(city);
  const end = advance(city, startSimulation(city, plan), plan.duration);
  expect(end.simulation.completed).toEqual(["BIN-001", "BIN-003", "BIN-004", "BIN-002"]);
  expect(end.city.bins.slice(4)).toEqual(city.bins.slice(4));
  const allBins = planCollection(city, false, true);
  expect(allBins.eligible).toHaveLength(10);
  expect(() => startSimulation(city, allBins)).toThrow(/pickup threshold/);
  const stale = structuredClone(city);
  stale.bins[0].fillPercent = 79;
  expect(() => startSimulation(stale, plan)).toThrow(/pickup threshold/);
});

it("shows every segment complete and clears the next pickup at the authoritative trip end", () => {
  const city = showcaseCity();
  const truck = city.trucks[0];
  const trip: Trip = {
    id: "rounding-regression", zoneId: city.zones[0].id, truckId: truck.id,
    head: "depot", origin: "depot", binIds: ["BIN-001"], load: 1, nodes: ["depot"],
    start: 0, end: 0.3, distance: 0,
    segments: [
      { kind: "COLLECTING", from: "depot", to: "depot", distance: 0, duration: 0.1 },
      { kind: "COLLECTING", from: "depot", to: "depot", distance: 0, duration: 0.2, binId: "BIN-001" },
    ],
  };
  expect(routeProgress(trip, trip.end).map(({ phase }) => phase)).toEqual(["completed", "completed"]);
  expect(truckSnapshot(city, { ...planCollection(city), trips: [trip] }, trip.end, truck.id).nextBinId)
    .toBeUndefined();
});
