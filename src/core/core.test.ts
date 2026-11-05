import { describe, it, expect } from "vitest";
import {
  City,
  clone,
  parseCity,
  removeNode,
  status,
  validateCity,
} from "./model";
import { preset, blankCity, randomize, infeasiblePreset } from "./presets";
import { pathFinder } from "./graph";
import {
  autoZone,
  reassignBin,
  relocateBin,
  validateZoneTrips,
} from "./zoning";
import { planCollection, comparablePlans } from "./routing";
import { advance, startSimulation, tripState, currentTrip } from "./simulation";
import { forecast } from "./forecast";
import { loadLibrary, saveLibrary } from "./storage";
function ready(count = 100) {
  const c = preset(count);
  c.zones = autoZone(
    c,
    c.nodes
      .filter((n) => n.type === "HEAD")
      .slice(0, 3)
      .map((n) => n.id),
  ).zones;
  return c;
}
describe("directed shortest paths", () => {
  const c = blankCity();
  c.nodes = ["a", "b", "c", "isolated"].map((id, i) => ({
    id,
    label: id,
    type: "INTERSECTION",
    x: i,
    y: 0,
  }));
  c.roads = [
    { id: "ab", fromNodeId: "a", toNodeId: "b", distanceKm: 5 },
    { id: "ac", fromNodeId: "a", toNodeId: "c", distanceKm: 1 },
    { id: "cb", fromNodeId: "c", toNodeId: "b", distanceKm: 2 },
  ];
  it("chooses competing shortest path and expands nodes/roads", () =>
    expect(pathFinder(c)("a", "b")).toEqual({
      distance: 3,
      nodes: ["a", "c", "b"],
      roads: ["ac", "cb"],
    }));
  it("obeys one-way, isolated, missing and same-node cases", () => {
    const p = pathFinder(c);
    expect(p("b", "a").distance).toBe(Infinity);
    expect(p("a", "isolated").nodes).toEqual([]);
    expect(p("missing", "a").distance).toBe(Infinity);
    expect(p("a", "a")).toEqual({ distance: 0, nodes: ["a"], roads: [] });
  });
  it("supports two-way roads", () => {
    const x = clone(c);
    x.roads.push({ id: "ba", fromNodeId: "b", toNodeId: "a", distanceKm: 4 });
    expect(pathFinder(x)("b", "a").distance).toBe(4);
  });
});
describe("schema and persistence", () => {
  it.each([10, 20, 50, 100])("validates reproducible %i-bin presets", (n) => {
    expect(preset(n).bins).toHaveLength(n);
    expect(validateCity(preset(n))).toEqual([]);
    expect(preset(n)).toEqual(preset(n));
  });
  it("rejects reference errors, bad imports, negative weights, physical injection", () => {
    const c = preset(10);
    c.roads[0].toNodeId = "absent";
    expect(validateCity(c).length).toBeGreaterThan(0);
    expect(() => parseCity("{")).toThrow();
    const x = preset(10);
    x.roads[0].distanceKm = -1;
    expect(() => parseCity(JSON.stringify(x))).toThrow();
    const b = preset(10) as unknown as { bins: { source: string }[] };
    b.bins[0].source = "PHYSICAL";
    expect(() => parseCity(JSON.stringify(b))).toThrow();
  });
  it("blocks deletion of referenced nodes and permits isolated deletion", () => {
    expect(() => removeNode(preset(10), "n0")).toThrow("Remove connected");
    const c = blankCity();
    c.nodes = [{ id: "a", label: "A", x: 20, y: 20, type: "HEAD" }];
    expect(removeNode(c, "a").nodes).toEqual([]);
  });
  it("roundtrips save, reload and export with explicit corrupt-storage failure", () => {
    const mem = new Map<string, string>(),
      storage = {
        getItem: (key: string) => mem.get(key) ?? null,
        setItem: (key: string, v: string) => {
          mem.set(key, v);
        },
      };
    const c = ready();
    saveLibrary(storage, [c]);
    expect(loadLibrary(storage)).toEqual([c]);
    expect(parseCity(JSON.stringify(c))).toEqual(c);
    expect(() => loadLibrary({ getItem: () => "{" })).toThrow();
  });
  it("rejects duplicates, malformed histories and non-finite coordinates", () => {
    const c = preset(10);
    c.bins.push(c.bins[0]);
    expect(validateCity(c)).toContain("Invalid/duplicate bins IDs");
    const x = preset(10);
    x.nodes[0].x = NaN;
    expect(validateCity(x).length).toBeGreaterThan(0);
  });
});
describe("graph-based zoning", () => {
  it("assigns each preset bin once with feasible round trips and stable fills", () => {
    const c = ready(),
      p = pathFinder(c),
      ids = c.zones.flatMap((z) => z.binIds);
    expect(ids.length).toBe(100);
    expect(new Set(ids).size).toBe(100);
    c.zones.forEach((z) =>
      z.binIds.forEach((id) => {
        const node = c.bins.find((b) => b.id === id)!.roadNodeId;
        expect(Number.isFinite(p(z.headNodeId, node).distance)).toBe(true);
        expect(Number.isFinite(p(node, z.headNodeId).distance)).toBe(true);
      }),
    );
    expect(randomize(c).zones).toEqual(c.zones);
  });
  it("rejects invalid K, duplicate and non-head seeds", () => {
    const c = preset(10);
    expect(() => autoZone(c, ["n0"])).toThrow();
    expect(() => autoZone(c, ["n0", "n0", "n3"])).toThrow();
    expect(() => autoZone(c, ["n0", "n1", "n3"])).toThrow();
  });
  it("reports isolated bin, and blocks infeasible manual reassignment", () => {
    const c = infeasiblePreset();
    const result = autoZone(c, ["n0", "n3", "n6"]);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.zones.flatMap((z) => z.binIds)).not.toContain("b9");
    c.zones = result.zones;
    expect(() => reassignBin(c, "b9", c.zones[0].id)).toThrow("round trip");
  });
});
describe("routing and capacity", () => {
  it("thresholds include exact 80 and 90, and reject invalid/stale", () => {
    expect(status(79)).toBe("NORMAL");
    expect(status(80)).toBe("COLLECTION_NEEDED");
    expect(status(90)).toBe("URGENT");
    expect(status(NaN)).toBe("UNKNOWN");
    expect(status(20, undefined, true)).toBe("STALE");
  });
  it("dispatches nothing with no eligible bins", () => {
    const c = ready();
    c.bins.forEach((b) => (b.fillPercent = 0));
    expect(planCollection(c).trips).toEqual([]);
  });
  it("schedules every zone with a single truck, capacity, expanded roads and no duplicates", () => {
    const c = randomize(ready(), true);
    c.trucks = c.trucks.slice(0, 1);
    c.trucks[0].capacityBinUnits = 3;
    const plan = planCollection(c);
    expect(plan.pending).toEqual([]);
    expect(plan.trips.length).toBeGreaterThan(3);
    const bins = plan.trips.flatMap((t) => t.binIds);
    expect(new Set(bins).size).toBe(100);
    let end = 0;
    plan.trips.forEach((t) => {
      expect(t.load).toBeLessThanOrEqual(3 + 1e-9);
      expect(t.start).toBeGreaterThanOrEqual(end);
      end = t.end;
      expect(t.nodes[0]).toBe(t.origin);
      expect(t.nodes.at(-1)).toBe(t.head);
      t.segments
        .filter((s) => s.distance > 0)
        .forEach((s) =>
          expect(
            c.roads.some(
              (r) =>
                r.fromNodeId === s.from &&
                r.toNodeId === s.to &&
                r.distanceKm === s.distance,
            ),
          ).toBe(true),
        );
    });
  });
  it("reports oversized, unreachable, unassigned and unavailable jobs", () => {
    const c = ready(10);
    c.bins.forEach((b) => (b.fillPercent = 100));
    c.bins[0].capacityBinUnits = 100;
    let p = planCollection(c);
    expect(
      p.pending.some((p) => p.binId === "b0" && p.reason.includes("capacity")),
    ).toBe(true);
    c.trucks.forEach((t) => (t.available = false));
    expect(planCollection(c).trips).toEqual([]);
    c.trucks.forEach((t) => (t.available = true));
    c.roads = c.roads.filter(
      (r) => r.fromNodeId !== "n1" && r.toNodeId !== "n1",
    );
    p = planCollection(c);
    expect(p.pending.some((p) => p.binId === "b1")).toBe(true);
  });
  it("cost is auditable and baseline compares same pickup set", () => {
    const c = ready(),
      p = planCollection(c),
      b = planCollection(c, true);
    expect(p.eligible).toEqual(b.eligible);
    expect(p.cost).toBeCloseTo(
      p.distance * c.settings.costPerKmINR +
        (p.laborMinutes / 60) * c.settings.costPerHourINR,
    );
    expect(p.duration).toBe(Math.max(0, ...p.trips.map((t) => t.end)));
    expect(
      p.trips.reduce(
        (a, t) => a + t.segments.reduce((a, s) => a + s.distance, 0),
        0,
      ),
    ).toBeCloseTo(p.distance);
  });
  it("derives per-road travel and service time from explicit assumptions", () => {
    const c = ready(10),
      p = planCollection(c);
    const expected = p.trips.reduce(
      (sum, t) =>
        sum +
        t.segments.reduce(
          (s, e) =>
            s +
            (e.distance
              ? (e.distance /
                  c.settings.speeds[
                    c.roads.find(
                      (r) => r.fromNodeId === e.from && r.toNodeId === e.to,
                    )!.speedGrade ??
                      c.trucks.find((x) => x.id === t.truckId)!.speedGrade
                  ]) *
                60
              : e.kind === "COLLECTING"
                ? c.settings.serviceMinutes
                : c.settings.unloadingMinutes),
          0,
        ),
      0,
    );
    expect(p.laborMinutes).toBeCloseTo(expected);
  });
});
describe("deterministic playback and forecasts", () => {
  it("randomization is repeatable, bounded, and independent from physical sources", () => {
    const c = ready(),
      a = randomize(c),
      b = randomize(c);
    expect(a).toEqual(b);
    expect(
      a.bins.every(
        (b) =>
          b.fillPercent >= 0 &&
          b.fillPercent <= 100 &&
          b.source === "SIMULATED",
      ),
    ).toBe(true);
    expect(c).toEqual(ready());
  });
  it("collects only after service ends, prevents duplicate completion, resets original", () => {
    const c = ready(10),
      p = planCollection(c),
      sim = startSimulation(c, p);
    const before = advance(c, sim, 0);
    expect(before.simulation.completed).toEqual([]);
    const done = advance(c, sim, p.duration + 1);
    expect(done.simulation.running).toBe(false);
    expect(done.simulation.completed.sort()).toEqual(
      p.trips.flatMap((t) => t.binIds).sort(),
    );
    done.simulation.completed.forEach((id) =>
      expect(done.city.bins.find((b) => b.id === id)?.fillPercent).toBe(0),
    );
    expect(advance(done.city, done.simulation, 100).simulation.events).toEqual(
      done.simulation.events,
    );
    expect(sim.original).toEqual(c);
    expect(
      p.trips.every((t) => tripState(t, p.duration).state === "COMPLETED"),
    ).toBe(true);
  });
  it("stepped and whole-run collection agree", () => {
    const c = ready(20),
      p = planCollection(c);
    let result = { city: c, simulation: startSimulation(c, p) };
    for (let i = 0; i < Math.ceil(p.duration) + 1; i++)
      result = advance(result.city, result.simulation, 1);
    const full = advance(c, startSimulation(c, p), p.duration);
    expect(result.city.bins.map((b) => b.fillPercent)).toEqual(
      full.city.bins.map((b) => b.fillPercent),
    );
    expect(result.simulation.completed.sort()).toEqual(
      full.simulation.completed.sort(),
    );
  });
  it("handles insufficient, pickup-reset, zero, invalid, noisy and growing history", () => {
    expect(forecast([]).hours).toBe(null);
    const history = [10, 20, 30, 40, 50].map((fill, i) => ({
      time: i * 3600000,
      fill,
    }));
    expect(forecast(history).hours).toBeCloseTo(3);
    expect(forecast(history.map((h) => ({ ...h, fill: 10 }))).hours).toBe(null);
    expect(
      forecast([...history, { time: 6 * 3600000, fill: 0 }]).quality,
    ).toContain("Insufficient");
    expect(forecast([{ time: NaN, fill: 100 }]).rate).toBe(null);
    expect(
      forecast(
        [0, 1, 60, 61, 100].map((fill, i) => ({ time: i * 3600000, fill })),
      ).quality,
    ).toContain("noisy");
  });
});
describe("audit regressions", () => {
  it("suppresses savings claims when served pickup sets differ", () => {
    const a = planCollection(ready(10)),
      b = clone(a);
    expect(comparablePlans(a, b)).toBe(true);
    b.pending.push({ binId: a.eligible[0], reason: "No transfer" });
    expect(comparablePlans(a, b)).toBe(false);
  });
  it("rejects unsafe preset references and road names before reset or rendering", () => {
    const c = ready() as City;
    c.preset = 100000000;
    expect(() => parseCity(JSON.stringify(c))).toThrow("preset");
    const x = preset(10);
    (x.roads[0] as unknown as { name: unknown }).name = { unexpected: true };
    expect(() => parseCity(JSON.stringify(x))).toThrow("road");
  });
  it("removes zone responsibility after bin relocation, preserving it for a no-op move", () => {
    const c = ready(10),
      id = c.bins[0].id;
    expect(relocateBin(c, id, c.bins[0].roadNodeId)).toBe(c);
    const moved = relocateBin(c, id, "n1");
    expect(moved.bins[0].roadNodeId).toBe("n1");
    expect(moved.zones.flatMap((z) => z.binIds)).not.toContain(id);
    expect(c.zones.flatMap((z) => z.binIds)).toContain(id);
    moved.roads = moved.roads.filter(
      (r) => r.fromNodeId !== "n2" && r.toNodeId !== "n2",
    );
    expect(() => validateZoneTrips(moved)).toThrow("round trip");
  });
  it("counts legal inter-zone repositioning and rejects teleporting across components", () => {
    const c = blankCity();
    c.settings.zoneCount = 2;
    c.nodes = [
      { id: "a", label: "A", x: 100, y: 100, type: "HEAD" },
      { id: "b", label: "B", x: 300, y: 100, type: "HEAD" },
    ];
    c.bins = ["a", "b"].map((id) => ({
      id: `bin-${id}`,
      name: id,
      roadNodeId: id,
      fillPercent: 100,
      capacityBinUnits: 1,
      source: "SIMULATED",
      history: [],
    }));
    c.zones = autoZone(c, ["a", "b"]).zones;
    let p = planCollection(c);
    expect(p.trips.length).toBe(1);
    expect(p.pending[0].reason).toContain("reach this zone head");
    c.roads = [{ id: "ab", fromNodeId: "a", toNodeId: "b", distanceKm: 2 }];
    p = planCollection(c);
    expect(p.pending).toEqual([]);
    expect(p.distance).toBe(2);
    expect(p.trips[1].nodes).toEqual(["a", "b"]);
    expect(p.trips[1].segments[0].duration).toBe(6);
    expect(p.trips[1].origin).toBe(p.trips[0].head);
  });
  it("produces identical bin history and chronological events at every playback speed", () => {
    const c = randomize(ready(20), true),
      p = planCollection(c);
    let stepped = { city: c, simulation: startSimulation(c, p) };
    for (let t = 0; t < Math.ceil(p.duration) + 1; t++)
      stepped = advance(stepped.city, stepped.simulation, 1);
    const full = advance(c, startSimulation(c, p), p.duration);
    expect(stepped.city).toEqual(full.city);
    expect(stepped.simulation.events).toEqual(full.simulation.events);
    expect(full.simulation.events.map((e) => e.time)).toEqual(
      full.simulation.events.map((e) => e.time).sort((a, b) => a - b),
    );
  });
  it("shows a truck at its first origin before dispatch and at its last arrival after completion", () => {
    const p = planCollection(ready(10)),
      trips = p.trips.filter((t) => t.truckId === p.trips[0].truckId);
    expect(currentTrip(trips, -1)).toBe(trips[0]);
    expect(tripState(trips[0], -1).from).toBe(trips[0].origin);
    expect(currentTrip(trips, p.duration)).toBe(trips.at(-1));
  });
});
