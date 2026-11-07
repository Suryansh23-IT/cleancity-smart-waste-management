import { City, clone } from "./model";
import { Plan, Phase, Trip, truckZoneAssignments } from "./routing";
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
  if(city.showcase&&!city.showcaseSnapshot)throw Error('Capture a validated physical or explicitly TEST snapshot before showcase simulation.');
  const eligible = new Set(city.bins.filter((bin) => bin.fillPercent >= city.settings.pickupThreshold).map((bin) => bin.id));
  if (plan.eligible.length !== eligible.size || new Set(plan.eligible).size !== eligible.size ||
      plan.eligible.some((id) => !eligible.has(id))) {
    throw Error("Dispatch must match the current pickup threshold. Replan collection.");
  }
  const bindings=truckZoneAssignments(city),seen=new Set<string>(),ends=new Map<string,number>();
  for(const trip of plan.trips){
    const zone=city.zones.find(z=>z.id===trip.zoneId),truck=city.trucks.find(t=>t.id===trip.truckId);
    if(!zone||!truck?.available||bindings.get(truck.id)!==zone.id||!zone.nodeIds.includes(zone.headNodeId)||zone.nodeIds.some(id=>city.zones.some(z=>z.id!==zone.id&&z.nodeIds.includes(id)))||trip.origin!==zone.headNodeId||trip.head!==zone.headNodeId||trip.start<(ends.get(truck.id)??0))throw Error('Stale or invalid dispatch: regenerate zones and replan collection.');
    let position=trip.origin,load=0,distance=0,duration=0;
    for(const s of trip.segments){
      if(s.from!==position||!zone.nodeIds.includes(s.from)||!zone.nodeIds.includes(s.to)||s.duration<0||!Number.isFinite(s.duration))throw Error('Route leaves its partition or has discontinuous movement. Replan collection.');
      if(s.from!==s.to&&!city.roads.some(r=>r.fromNodeId===s.from&&r.toNodeId===s.to&&r.distanceKm===s.distance))throw Error('Route references a missing road. Replan collection.');
      if(s.kind==='COLLECTING'){
        const bin=city.bins.find(b=>b.id===s.binId);
        if(!bin||!eligible.has(bin.id)||seen.has(bin.id)||!zone.binIds.includes(bin.id)||bin.roadNodeId!==s.from||s.from!==s.to||s.distance!==0)throw Error('Invalid, ineligible or duplicate pickup in dispatch. Replan collection.');
        const amount=bin.fillPercent*bin.capacityBinUnits/100;
        if(s.amount!==amount)throw Error('Pickup load changed. Replan collection.');
        seen.add(bin.id);load+=amount;
        if(load>truck.capacityBinUnits+1e-8)throw Error('Truck capacity exceeded in dispatch.');
      }
      if(s.kind==='UNLOADING'){if(s.from!==zone.headNodeId||s.from!==s.to||s.distance!==0)throw Error('Unloading must occur at the assigned depot.');load=0;}
      position=s.to;distance+=s.distance;duration+=s.duration;
    }
    if(position!==zone.headNodeId||load!==0||Math.abs(trip.distance-distance)>1e-7||Math.abs(trip.end-trip.start-duration)>1e-7)throw Error('Invalid trip return or totals. Replan collection.');
    ends.set(truck.id,trip.end);
  }
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
export function truckSnapshot(city:City,plan:Plan,time:number,truckId:string){
 const trips=plan.trips.filter(t=>t.truckId===truckId),trip=currentTrip(trips,time);
 const zoneId=trip?.zoneId??truckZoneAssignments(city).get(truckId);
 const head=city.zones.find(z=>z.id===zoneId)?.headNodeId;
 if(!trip)return {state:city.trucks.find(t=>t.id===truckId)?.available?'AVAILABLE':'UNAVAILABLE',from:head,to:head,fraction:0,load:0,distance:0,zoneId,nextBinId:undefined,trip:undefined};
 let cursor=trip.start;const next=time<trip.end?trip.segments.find(s=>{cursor+=s.duration;return s.kind==='COLLECTING'&&cursor>time;}):undefined;
 return {...tripState(trip,time),zoneId,nextBinId:next?.binId,trip};
}
export function routeProgress(trip:Trip,time:number){
 let cursor=trip.start;
 return trip.segments.map(segment=>{const start=cursor;cursor+=segment.duration;return {segment,start,end:Math.min(cursor,trip.end),phase:time>=trip.end||time>=cursor?'completed':time>=start?'current':'remaining'} as const;});
}
export function tripState(trip: Trip, time: number) {
  // The authoritative end is start + summed durations. Repeated cursor additions
  // can differ by a floating-point ulp and otherwise leave a finished truck unloading.
  if(time>=trip.end)return {state:'COMPLETED' as const,from:trip.head,to:trip.head,fraction:1,load:0,distance:trip.distance};
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
  const updatedBins = new Map<string, City["bins"][number]>();
  for (const trip of sim.plan.trips) {
    let cursor = trip.start;
    for (const s of trip.segments) {
      cursor += s.duration;
      if (
        s.kind === "COLLECTING" &&
        (cursor <= time || time >= trip.end) &&
        s.binId &&
        !completed.includes(s.binId)
      ) {
        const b = city.bins.find((b) => b.id === s.binId);
        if (b) {
          const historyTime =
            Math.max(
              0,
              ...sim.original.bins.flatMap((b) => b.history.map((h) => h.time)),
            ) +
            cursor * 60000;
          updatedBins.set(b.id, {
            ...b,
            fillPercent: 0,
            history: [...b.history, { time: historyTime, fill: 0 }].slice(-5),
          });
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
    city: updatedBins.size
      ? { ...city, bins: city.bins.map((bin) => updatedBins.get(bin.id) ?? bin) }
      : city,
    simulation: {
      ...sim,
      time,
      running: sim.running && time < sim.plan.duration,
      completed,
      events: events.slice(-200),
    },
  };
}
