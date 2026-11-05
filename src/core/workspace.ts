import { City } from "./model";
import { generateCity } from "./studio";
import { autoZone } from "./zoning";
import { Plan } from "./routing";
import { Simulation } from "./simulation";
export type BinFilter =
  | "ALL"
  | "PICKUP"
  | "URGENT"
  | "UNASSIGNED"
  | "PENDING"
  | "COLLECTED";
export function municipalDemo(): City {
  const c = generateCity({
    name: "Greenfield municipal demo",
    junctions: 30,
    bins: 40,
    districts: 3,
    scale: 5,
    density: 0.6,
    oneWay: 0.6,
    seed: 2026,
  });
  c.id = "demo-municipal-v1";
  c.description =
    "SIMULATED MUNICIPAL DATA · Reproducible Greenfield demonstration, seed 2026. One oversized pickup demonstrates exception handling.";
  ["Riverside depot", "Market depot", "Garden depot"].forEach(
    (label, i) => (c.nodes[i].label = label),
  );
  c.bins = c.bins.map((b, i) => {
    const fill = [96, 84, 40, 92, 70, 89, 25, 94][i % 8];
    return {
      ...b,
      fillPercent: fill,
      capacityBinUnits: i === 0 ? 8 : 1,
      history: [0, 1, 2, 3, 4].map((h) => ({
        time: h * 3600000,
        fill: Math.max(0, fill - 12 + 3 * h),
      })),
    };
  });
  c.zones = autoZone(c, ["j0", "j1", "j2"]).zones.map((z, i) => ({
    ...z,
    name: ["Riverside", "Market Ward", "Garden Quarter"][i],
  }));
  c.trucks = Array.from({ length: 5 }, (_, i) => ({
    id: `demo-truck-${i + 1}`,
    label: `Truck ${String(i + 1).padStart(2, "0")}`,
    capacityBinUnits: [2.2, 2.2, 2.6, 2.6, 3][i],
    speedGrade: 2,
    available: true,
    zoneId: c.zones[i < 2 ? 0 : i < 4 ? 1 : 2].id,
  }));
  return c;
}
export function workspaceStatus(
  city: City,
  plan: Plan | null,
  sim: Simulation | null,
) {
  const eligible = city.bins.filter(
      (b) => b.fillPercent >= city.settings.pickupThreshold,
    ),
    urgent = city.bins.filter(
      (b) => b.fillPercent >= city.settings.urgentThreshold,
    ),
    assigned = new Set(city.zones.flatMap((z) => z.binIds)),
    available = city.trucks.filter((t) => t.available),
    planned = new Set(plan?.trips.map((t) => t.truckId) ?? []),
    completed = sim?.completed.length ?? 0,
    done = !!sim && sim.time >= sim.plan.duration;
  const planReason = sim
    ? "Reset the current run before changing its plan."
    : !city.bins.length
      ? "Add bins in City Studio."
      : !city.zones.length
        ? "Create zones and choose collection heads."
        : !available.length
          ? "Make at least one truck available."
          : null;
  const startReason = !plan
    ? "Plan collection first."
    : !plan.trips.length
      ? plan.pending.length
        ? "No feasible trips. Review unserved pickups."
        : "No pickups meet the collection threshold."
      : null;
  const stage = !city.bins.length
    ? "Configure city"
    : !city.zones.length
      ? "Create zones"
      : !available.length
        ? "Configure fleet"
        : !plan
          ? "Plan collection"
          : done
            ? "Review results"
            : sim
              ? "Continue simulation"
              : plan.trips.length
                ? "Start simulation"
                : "Review pickup demand";
  return {
    eligible,
    urgent,
    normal: city.bins.length - eligible.length,
    assigned,
    available,
    planned,
    completed,
    done,
    planReason,
    startReason,
    stage,
  };
}
export function reviewBins(
  city: City,
  plan: Plan | null,
  sim: Simulation | null,
  filter: BinFilter,
  query = "",
) {
  const assigned = new Set(city.zones.flatMap((z) => z.binIds)),
    pending = new Set(plan?.pending.map((p) => p.binId)),
    completed = new Set(sim?.completed);
  return city.bins.filter(
    (b) =>
      (filter === "ALL" ||
        (filter === "URGENT" &&
          b.fillPercent >= city.settings.urgentThreshold) ||
        (filter === "PICKUP" &&
          b.fillPercent >= city.settings.pickupThreshold) ||
        (filter === "UNASSIGNED" && !assigned.has(b.id)) ||
        (filter === "PENDING" && pending.has(b.id)) ||
        (filter === "COLLECTED" && completed.has(b.id))) &&
      `${b.name} ${b.id}`.toLowerCase().includes(query.toLowerCase()),
  );
}
