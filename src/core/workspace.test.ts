import { describe, it, expect } from "vitest";
import { municipalDemo, workspaceStatus, reviewBins } from "./workspace";
import { validateCity, parseCity } from "./model";
import { planCollection } from "./routing";
import { advance, startSimulation } from "./simulation";
import { blankCity } from "./presets";
describe("municipal workspace projections and demo", () => {
  it("provides a reproducible editable demo using the existing planner, with a real capacity exception", () => {
    const c = municipalDemo(),
      p = planCollection(c);
    expect(c).toEqual(municipalDemo());
    expect(validateCity(c)).toEqual([]);
    expect(parseCity(JSON.stringify(c))).toEqual(c);
    expect(c.bins).toHaveLength(40);
    expect(c.zones).toHaveLength(3);
    expect(c.trucks).toHaveLength(5);
    expect(new Set(p.trips.map((t) => t.truckId)).size).toBe(5);
    expect(p.eligible).toHaveLength(25);
    expect(p.pending).toHaveLength(1);
    expect(p.pending[0].reason.toLowerCase()).toContain("capacity");
    expect(new Set(p.trips.flatMap((t) => t.binIds)).size).toBe(24);
  });
  it("keeps current demand, completed stops and unserved work distinct after execution", () => {
    const c = municipalDemo(),
      p = planCollection(c),
      result = advance(c, startSimulation(c, p), p.duration + 1),
      s = workspaceStatus(result.city, p, result.simulation);
    expect(s.done).toBe(true);
    expect(s.completed).toBe(24);
    expect(s.eligible).toHaveLength(1);
    expect(p.pending).toHaveLength(1);
    expect(
      reviewBins(result.city, p, result.simulation, "COLLECTED"),
    ).toHaveLength(24);
    expect(
      reviewBins(result.city, p, result.simulation, "PENDING"),
    ).toHaveLength(1);
    expect(reviewBins(c, p, null, "URGENT")).toHaveLength(15);
  });
  it("explains missing configuration and does not fabricate availability or plan metrics", () => {
    const c = blankCity();
    c.trucks = [];
    expect(workspaceStatus(c, null, null).stage).toBe("Configure city");
    c.bins = municipalDemo().bins;
    c.nodes = municipalDemo().nodes;
    expect(workspaceStatus(c, null, null).planReason).toContain("Create zones");
    c.zones = municipalDemo().zones;
    expect(workspaceStatus(c, null, null).planReason).toContain("truck");
    c.trucks = municipalDemo().trucks.map((t) => ({ ...t, available: false }));
    expect(workspaceStatus(c, null, null).available).toHaveLength(0);
    expect(workspaceStatus(c, null, null).planned.size).toBe(0);
  });
});
