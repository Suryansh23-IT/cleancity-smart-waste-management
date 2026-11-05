import { describe, it, expect } from "vitest";
import { preset, infeasiblePreset, randomize } from "./presets";
import { autoZone } from "./zoning";
import { planCollection } from "./routing";
import { advance, startSimulation } from "./simulation";
import { operationProgress, zoneWorkloads } from "./insights";
import { forecast } from "./forecast";
describe("municipal acceptance metrics", () => {
  it.each([10, 20, 50, 100])(
    "tracks %i-bin trips through completion and replay",
    (count) => {
      const c = randomize(preset(count), true);
      c.zones = autoZone(
        c,
        c.nodes
          .filter((n) => n.type === "HEAD")
          .slice(0, 3)
          .map((n) => n.id),
      ).zones;
      c.trucks.forEach((t) => (t.capacityBinUnits = 3));
      const p = planCollection(c),
        s = startSimulation(c, p),
        initial = operationProgress(c, p, s);
      expect(initial.distance).toBe(0);
      expect(initial.remaining).toBe(count);
      expect(p.pending).toEqual([]);
      const partial = advance(c, s, p.duration / 2),
        middle = operationProgress(partial.city, p, partial.simulation);
      expect(middle.distance).toBeGreaterThan(0);
      expect(middle.distance).toBeLessThanOrEqual(p.distance);
      expect(middle.remaining + middle.completed).toBe(count);
      const final = advance(c, s, p.duration),
        done = operationProgress(final.city, p, final.simulation);
      expect(done.distance).toBeCloseTo(p.distance);
      expect(done.completed).toBe(count);
      expect(done.remaining).toBe(0);
      expect(done.done).toBe(true);
      expect(
        done.trucks.every(
          (t) => t.load <= t.capacity && t.utilization <= 100 + 1e-8,
        ),
      ).toBe(true);
      expect(operationProgress(c, p, startSimulation(s.original, p))).toEqual(
        initial,
      );
      const zones = zoneWorkloads(c, p);
      expect(zones.reduce((sum, z) => sum + z.urgent, 0)).toBe(count);
      expect(zones.reduce((sum, z) => sum + z.distance, 0)).toBeCloseTo(
        p.distance,
      );
    },
  );
  it("keeps pending and unreachable work separate from completed planned stops", () => {
    const c = infeasiblePreset();
    c.zones = autoZone(c, ["n0", "n3", "n6"]).zones;
    const p = planCollection(c),
      s = startSimulation(c, p),
      final = advance(c, s, p.duration),
      progress = operationProgress(final.city, p, final.simulation);
    expect(progress.pending).toBeGreaterThan(0);
    expect(progress.remaining).toBe(0);
    expect(final.city.bins[9].fillPercent).toBe(100);
  });
  it("calculates both horizons and rejects stale, future, invalid or duplicate samples", () => {
    const h = [40, 45, 50, 55, 60].map((fill, i) => ({
      time: i * 3600000,
      fill,
    }));
    expect(forecast(h, 80, 4 * 3600000).hours).toBe(4);
    expect(forecast(h, 90, 4 * 3600000).hours).toBe(6);
    expect(forecast(h, 80, 8 * 3600000).quality).toContain("Stale");
    expect(forecast(h, 80, 0).hours).toBe(null);
    expect(forecast(h.map((x) => ({ ...x, time: 0 }))).hours).toBe(null);
    expect(forecast(h.map((x) => ({ ...x, fill: NaN }))).hours).toBe(null);
  });
});
