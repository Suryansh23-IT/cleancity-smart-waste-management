import { City, clone } from "./model";
import { Plan, Phase, Trip } from "./routing";
export interface Event {
  time: number;
  message: string;
  binId?: string;
  source: "SIMULATED";
}
export interface Simulation {
  original: City;
  plan: Plan;
  time: number;
  running: boolean;
  completed: string[];
  events: Event[];
}
export function startSimulation(city: City, plan: Plan): Simulation {
  return {
    original: clone(city),
    plan: clone(plan),
    time: 0,
    running: plan.trips.length > 0,
    completed: [],
    events: [
      { time: 0, message: "Virtual dispatch started", source: "SIMULATED" },
    ],
  };
}
export function currentTrip(trips: Trip[], time: number): Trip | undefined {
  return (
    trips.find((t) => time >= t.start && time < t.end) ??
    [...trips].reverse().find((t) => time >= t.end) ??
    trips[0]
  );
}
export function tripState(trip: Trip, time: number) {
  if (time < trip.start)
    return {
      state: "AVAILABLE" as const,
      from: trip.origin,
      to: trip.origin,
      fraction: 0,
      load: 0,
      distance: 0,
    };
  let cursor = trip.start,
    load = 0,
    distance = 0;
  for (const s of trip.segments) {
    const end = cursor + s.duration;
    if (time < end)
      return {
        state: s.kind as Phase,
        from: s.from,
        to: s.to,
        fraction: s.duration ? (time - cursor) / s.duration : 1,
        load,
        distance:
          distance +
          s.distance * (s.duration ? (time - cursor) / s.duration : 1),
      };
    cursor = end;
    distance += s.distance;
    if (s.kind === "COLLECTING") load += s.amount ?? 0;
    if (s.kind === "UNLOADING") load = 0;
  }
  return {
    state: "COMPLETED" as const,
    from: trip.head,
    to: trip.head,
    fraction: 1,
    load: 0,
    distance,
  };
}
export function advance(
  city: City,
  sim: Simulation,
  minutes: number,
): { city: City; simulation: Simulation } {
  if (!Number.isFinite(minutes) || minutes < 0)
    throw Error("Advance by a finite nonnegative number of minutes");
  const time = Math.min(sim.plan.duration, sim.time + Math.max(0, minutes)),
    completed = [...sim.completed],
    events = [...sim.events];
  const next = clone(city);
  for (const trip of sim.plan.trips) {
    let cursor = trip.start;
    for (const s of trip.segments) {
      cursor += s.duration;
      if (
        s.kind === "COLLECTING" &&
        cursor <= time &&
        s.binId &&
        !completed.includes(s.binId)
      ) {
        const b = next.bins.find((b) => b.id === s.binId);
        if (b) {
          b.fillPercent = 0;
          const historyTime =
            Math.max(
              0,
              ...sim.original.bins.flatMap((b) => b.history.map((h) => h.time)),
            ) +
            cursor * 60000;
          b.history = [...b.history, { time: historyTime, fill: 0 }].slice(-5);
        }
        completed.push(s.binId);
        events.push({
          time: cursor,
          binId: s.binId,
          message: `Collected ${b?.name ?? s.binId} · ${trip.truckId}`,
          source: "SIMULATED",
        });
      }
    }
  }
  events.sort((a, b) => a.time - b.time || a.message.localeCompare(b.message));
  return {
    city: next,
    simulation: {
      ...sim,
      time,
      running: sim.running && time < sim.plan.duration,
      completed,
      events: events.slice(-200),
    },
  };
}
