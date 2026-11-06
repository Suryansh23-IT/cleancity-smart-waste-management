import {describe,it,expect} from 'vitest';
import {createReadyCities} from './readyCities';
import {createCuratedCities} from './curated';
import {autoZone,validateZoneTrips} from './zoning';
import {planCollection,truckZoneAssignments} from './routing';
import {truckSnapshot,routeProgress,startSimulation} from './simulation';
import {pathFinder} from './graph';

describe('default municipal partition contract',()=>{
 it('parks unscheduled trucks at their assigned depot and rejects a stale crossing plan',()=>{
  const c=createReadyCities()[0],p=planCollection(c);const bad=structuredClone(p);bad.trips[0].segments[0].to=c.zones[1].headNodeId;expect(()=>startSimulation(c,bad)).toThrow(/partition|dispatch/);
  c.bins.forEach(b=>b.fillPercent=0);const empty=planCollection(c);for(const t of c.trucks){const s=truckSnapshot(c,empty,0,t.id);expect(s.from).toBe(c.zones.find(z=>z.id===t.zoneId)!.headNodeId);expect(s.from).toBe(s.to);expect(s.state).toBe('AVAILABLE');}
 });
 for(const original of [...createReadyCities(),...createCuratedCities()])it(`${original.name}: disjoint internally reachable partitions and continuous depot-based trips`,()=>{
  const c=structuredClone(original);c.settings.strictZoneRouting=false; // Old JSON must not bypass the default.
  const result=autoZone(c,c.zones.map(z=>z.headNodeId));c.zones=result.zones;
  const owned=c.zones.flatMap(z=>z.nodeIds);expect(new Set(owned).size).toBe(owned.length);expect(c.zones.length).toBe(c.settings.zoneCount);
  validateZoneTrips(c);
  for(const z of c.zones){expect(z.nodeIds).toContain(z.headNodeId);const ids=new Set(z.nodeIds),path=pathFinder({nodes:c.nodes.filter(n=>ids.has(n.id)),roads:c.roads.filter(r=>ids.has(r.fromNodeId)&&ids.has(r.toNodeId))});for(const id of ids){expect(path(z.headNodeId,id).distance).toBeLessThan(Infinity);expect(path(id,z.headNodeId).distance).toBeLessThan(Infinity);}}
  const p=planCollection(c),bindings=truckZoneAssignments(c);expect(new Set([...p.trips.flatMap(t=>t.binIds),...p.pending.map(b=>b.binId)]).size).toBe(p.eligible.length);
  for(const truck of c.trucks){let previousEnd=0;for(const trip of p.trips.filter(t=>t.truckId===truck.id)){
   const z=c.zones.find(z=>z.id===trip.zoneId)!;expect(trip.zoneId).toBe(bindings.get(truck.id));expect(trip.origin).toBe(z.headNodeId);expect(trip.head).toBe(z.headNodeId);expect(trip.start).toBeGreaterThanOrEqual(previousEnd);previousEnd=trip.end;
   let position=trip.origin,load=0;for(const event of routeProgress(trip,0)){const s=event.segment;expect(s.from).toBe(position);expect(z.nodeIds).toContain(s.from);expect(z.nodeIds).toContain(s.to);position=s.to;
    if(s.distance>0)expect(c.roads.some(r=>r.fromNodeId===s.from&&r.toNodeId===s.to&&r.distanceKm===s.distance)).toBe(true);
    const state=truckSnapshot(c,p,(event.start+event.end)/2,truck.id);if(s.duration>0){expect(state.from).toBe(s.from);expect(state.to).toBe(s.to);expect(state.fraction).toBeCloseTo(.5);}
    if(s.kind==='COLLECTING'){expect(z.binIds).toContain(s.binId);load+=s.amount??0;expect(load).toBeLessThanOrEqual(truck.capacityBinUnits+1e-8);}if(s.kind==='UNLOADING'){expect(s.from).toBe(z.headNodeId);load=0;}
   }expect(position).toBe(z.headNodeId);expect(load).toBe(0);
  }}
 });
 it('rejects overlapping ownership without generating a misleading trip',()=>{const c=createReadyCities()[0];c.zones[1].nodeIds.push(c.zones[0].headNodeId);const p=planCollection(c);expect(p.trips).toEqual([]);expect(p.pending.every(b=>b.reason.includes('Invalid partition'))).toBe(true);});
});
