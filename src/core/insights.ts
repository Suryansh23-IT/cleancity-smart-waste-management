import { City } from "./model";
import { Plan } from "./routing";
import { Simulation, currentTrip, tripState } from "./simulation";

export function operationProgress(
  city: City,
  plan: Plan,
  sim: Simulation | null,
) {
  const time = sim?.time ?? 0,
    completed = new Set(sim?.completed ?? []);
  const scheduled = new Set(plan.trips.flatMap((t) => t.binIds));
  const trucks = city.trucks.map((truck) => {
    const trips = plan.trips.filter((t) => t.truckId === truck.id),
      active = currentTrip(trips, time),
      state = active ? tripState(active, time) : null;
    const stops = trips.flatMap((t) => t.binIds),
      done = stops.filter((id) => completed.has(id)).length;
    const busy = trips.reduce((sum, t) => sum + t.end - t.start, 0);
    return {
      id: truck.id,
      label: truck.label,
      state: sim
        ? (state?.state ?? "AVAILABLE")
        : trips.length
          ? "PLANNED"
          : "AVAILABLE",
      from: state?.from,
      to: state?.to,
      fraction: state?.fraction ?? 0,
      load: state?.load ?? 0,
      capacity: truck.capacityBinUnits,
      completed: done,
      remaining: stops.length - done,
      stops: stops.length,
      trips: trips.length,
      distance: sim
        ? trips.reduce((sum, t) => sum + tripState(t, time).distance, 0)
        : 0,
      plannedDistance: trips.reduce((sum, t) => sum + t.distance, 0),
      busyMinutes: busy,
      utilization: plan.duration ? (busy / plan.duration) * 100 : 0,
    };
  });
  return {
    distance: trucks.reduce((sum, t) => sum + t.distance, 0),
    plannedDistance: plan.distance,
    completed: completed.size,
    remaining: [...scheduled].filter((id) => !completed.has(id)).length,
    pending: plan.pending.length,
    time,
    done: !!sim && time >= plan.duration,
    trucks,
  };
}
export function zoneWorkloads(city: City, plan: Plan | null) {
  return city.zones.map((z) => {
    const bins = city.bins.filter((b) => z.binIds.includes(b.id)),
      eligible = bins.filter(
        (b) => b.fillPercent >= city.settings.pickupThreshold,
      );
    const trips = plan?.trips.filter((t) => t.zoneId === z.id) ?? [];
    return {
      id: z.id,
      name: z.name,
      color: z.color,
      bins: bins.length,
      normal: bins.length - eligible.length,
      collection: eligible.filter(
        (b) => b.fillPercent < city.settings.urgentThreshold,
      ).length,
      urgent: eligible.filter(
        (b) => b.fillPercent >= city.settings.urgentThreshold,
      ).length,
      load: eligible.reduce(
        (a, b) => a + (b.fillPercent / 100) * b.capacityBinUnits,
        0,
      ),
      distance: trips.reduce((a, t) => a + t.distance, 0),
      minutes: trips.reduce((a, t) => a + t.end - t.start, 0),
      trips: trips.length,
      pending:
        plan?.pending.filter((p) => z.binIds.includes(p.binId)).length ?? 0,
    };
  });
}
