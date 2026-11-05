import { describe, expect, it } from "vitest";
import {
  batchBins,
  generateCity,
  operationalChanged,
  routingGraphChanged,
} from "./studio";
import { parseCity, validateCity } from "./model";
import { pathFinder } from "./graph";
import { autoZone } from "./zoning";
import { planCollection } from "./routing";
import { operationProgress } from "./insights";

const options = {
  name: "Municipal acceptance",
  junctions: 30,
  bins: 40,
  districts: 3,
  scale: 8,
  density: 0.7,
  oneWay: 0.7,
  seed: 42,
};
describe("City Studio authoring contracts", () => {
  it.each([10, 20, 50, 100])(
    "generates a reproducible, strongly connected irregular %i-bin city",
    (bins) => {
      const c = generateCity({ ...options, bins });
      expect(c).toEqual(generateCity({ ...options, bins }));
      expect(validateCity(c)).toEqual([]);
      expect(new Set(c.nodes.map((n) => n.x)).size).toBeGreaterThan(20);
      const path = pathFinder(c);
      for (const n of c.nodes) {
        expect(path("j0", n.id).distance).toBeLessThan(Infinity);
        expect(path(n.id, "j0").distance).toBeLessThan(Infinity);
      }
      expect(c.roads.every((r) => r.distanceKm > 0)).toBe(true);
      expect(generateCity({ ...options, bins, seed: 43 }).nodes).not.toEqual(
        c.nodes,
      );
    },
  );
  it("runs 40-bin, 3-zone, 5-truck collections with shared zone restrictions", () => {
    const c = generateCity(options);
    c.bins = c.bins.map((b) => ({ ...b, fillPercent: 95 }));
    c.zones = autoZone(c, ["j0", "j1", "j2"]).zones;
    c.trucks = Array.from({ length: 5 }, (_, i) => ({
      ...c.trucks[0],
      id: `t${i}`,
      zoneId: c.zones[i < 3 ? 0 : i - 2].id,
    }));
    const p = planCollection(c);
    expect(p.pending).toEqual([]);
    expect(new Set(p.trips.flatMap((t) => t.binIds)).size).toBe(40);
  });
  it("distinguishes visual and identity edits from demand and road changes", () => {
    const c = generateCity(options),
      d = structuredClone(c);
    d.nodes[0].label = "Renamed";
    d.nodes[0].x += 1;
    d.roads[0].name = "New name";
    d.bins[0].position = { x: 15, y: 25 };
    expect(routingGraphChanged(c, d)).toBe(false);
    expect(operationalChanged(c, d)).toBe(false);
    d.bins[0].fillPercent = 101;
    expect(operationalChanged(c, d)).toBe(true);
    d.roads[0].distanceKm += 1;
    expect(routingGraphChanged(c, d)).toBe(true);
  });
  it("adds bins without changing existing demands, and validates batch inputs", () => {
    const c = generateCity(options),
      d = batchBins(c, 15, 87);
    expect(d.bins).toHaveLength(55);
    expect(d.bins.slice(0, 40)).toEqual(c.bins);
    expect(validateCity(d)).toEqual([]);
    for (const fill of [NaN, -1, 101])
      expect(() => batchBins(c, 2, fill)).toThrow();
    expect(() => batchBins(c, 0, 80)).toThrow();
  });
  it("round-trips old and positioned-bin JSON, rejects corrupt coordinates", () => {
    const c = generateCity(options);
    expect(parseCity(JSON.stringify(c))).toEqual(c);
    c.bins[0].position = { x: 40, y: 70 };
    expect(parseCity(JSON.stringify(c))).toEqual(c);
    c.bins[0].position.x = Infinity;
    expect(() => parseCity(JSON.stringify(c))).toThrow();
  });
  it("labels an unavailable truck honestly before planning", () => {
    const c = generateCity(options);
    c.trucks[0].available = false;
    const p = planCollection(c);
    expect(operationProgress(c, p, null).trucks[0].state).toBe("UNAVAILABLE");
  });
});
