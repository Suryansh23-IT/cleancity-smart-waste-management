import {describe,it,expect} from 'vitest';
import {createReadyCities} from './readyCities';
import {regenerateZones} from './zoning';
import {createCuratedCities} from './curated';
import {validateCity} from './model';
import {pathFinder} from './graph';
import {planCollection} from './routing';
import {startSimulation,advance} from './simulation';
const cities=createCuratedCities();
describe('authored municipal city collection',()=>{
 it('refuses a route whose only return connection crosses another partition',()=>{
  const c=createReadyCities()[0],z=c.zones[0],bin=c.bins.find(b=>z.binIds.includes(b.id)&&b.roadNodeId!==z.headNodeId)!;
  c.bins.forEach(b=>b.fillPercent=b.id===bin.id?95:0);
  const other=c.zones[1].headNodeId;
  c.roads=c.roads.filter(r=>r.fromNodeId!==bin.roadNodeId);
  c.roads.push({id:'outside-only',fromNodeId:bin.roadNodeId,toNodeId:other,distanceKm:.001});
  const p=planCollection(c);expect(p.trips).toEqual([]);expect(p.pending.find(b=>b.binId===bin.id)?.reason).toContain('inside assigned zone');
 });
 it('binds automatic trucks to one partition and never uses outside shortcuts',()=>{
  const c=createReadyCities()[1];c.trucks=c.trucks.map(t=>({...t,zoneId:undefined}));
  const p=planCollection(c);expect(p.pending).toEqual([]);
  for(const truck of c.trucks){const trips=p.trips.filter(t=>t.truckId===truck.id);expect(new Set(trips.map(t=>t.zoneId)).size).toBe(1);for(const trip of trips){const z=c.zones.find(z=>z.id===trip.zoneId)!;expect(trip.nodes.every(id=>z.nodeIds.includes(id))).toBe(true);}}
 });
 for(const c of createReadyCities())it(`${c.name}: all-bin policy preserves fills, capacities and full service`,()=>{
  const snapshot=JSON.stringify(c),all=planCollection(c,false,true),targeted=planCollection(c);
  expect(all.eligible.length).toBe(c.bins.length);expect(all.pending).toEqual([]);expect(JSON.stringify(c)).toBe(snapshot);
  expect(targeted.eligible.length).toBeLessThan(all.eligible.length);
  expect(all.trips.reduce((n,t)=>n+t.binIds.length,0)).toBe(c.bins.length);
  for(const trip of all.trips)expect(trip.load).toBeLessThanOrEqual(c.trucks.find(t=>t.id===trip.truckId)!.capacityBinUnits+1e-8);
  expect(()=>startSimulation(c,all)).toThrow(/pickup threshold/);
 });
 for(const original of createReadyCities())it(`${original.name}: regenerating/reordering zones preserves depot responsibility`,()=>{
  const result=regenerateZones(original,original.zones.map(z=>z.headNodeId).reverse());
  const city={...original,zones:result.zones,trucks:result.trucks};
  for(const truck of city.trucks){const old=original.trucks.find(t=>t.id===truck.id)!;expect(city.zones.find(z=>z.id===truck.zoneId)!.headNodeId).toBe(original.zones.find(z=>z.id===old.zoneId)!.headNodeId);}
  const plan=planCollection(city);expect(plan.pending).toEqual([]);
  for(const trip of plan.trips){const truck=city.trucks.find(t=>t.id===trip.truckId)!;const zone=city.zones.find(z=>z.id===trip.zoneId)!;expect(trip.zoneId).toBe(truck.zoneId);expect(trip.head).toBe(zone.headNodeId);expect(trip.binIds.every(id=>zone.binIds.includes(id))).toBe(true);}
 });
 it('is deterministic and replaces all six old identities',()=>{expect(cities).toEqual(createCuratedCities());expect(new Set(cities.map(c=>c.id)).size).toBe(6);});
 for(const city of [...cities,...createReadyCities()])it(`${city.name}: valid, reachable, capacity safe and completes exact demand`,()=>{
  expect(validateCity(city)).toEqual([]);
  const path=pathFinder(city);
  for(const z of city.zones){expect(city.nodes.find(n=>n.id===z.headNodeId)?.type).toBe('HEAD');expect(city.trucks.some(t=>t.zoneId===z.id)).toBe(true);for(const id of z.binIds){const b=city.bins.find(b=>b.id===id)!;expect(Number.isFinite(path(z.headNodeId,b.roadNodeId).distance)).toBe(true);expect(Number.isFinite(path(b.roadNodeId,z.headNodeId).distance)).toBe(true);}}
  const p=planCollection(city);expect(p.eligible.length).toBeGreaterThan(0);
  expect(p.pending).toEqual([]);
  expect(new Set([...p.trips.flatMap(t=>t.binIds),...p.pending.map(b=>b.binId)]).size).toBe(p.eligible.length);
  for(const t of p.trips){const zone=city.zones.find(z=>z.id===t.zoneId)!;expect(t.nodes.every(id=>zone.nodeIds.includes(id)||id===zone.headNodeId)).toBe(true);expect(t.load).toBeLessThanOrEqual(city.trucks.find(v=>v.id===t.truckId)!.capacityBinUnits+1e-8);for(let i=1;i<t.nodes.length;i++)expect(city.roads.some(r=>r.fromNodeId===t.nodes[i-1]&&r.toNodeId===t.nodes[i])).toBe(true);}
  const done=advance(city,startSimulation(city,p),p.duration+1);expect(done.simulation.completed.length+p.pending.length).toBe(p.eligible.length);expect(done.simulation.running).toBe(false);expect(done.simulation.completed.every(id=>done.city.bins.find(b=>b.id===id)!.fillPercent===0)).toBe(true);
  expect(p.distance).toBeCloseTo(p.trips.reduce((s,t)=>s+t.distance,0),8);
 });
 it('connects the riverbanks only over the two named bridges',()=>{const c=cities[2];const crossings=c.roads.filter(r=>{const a=c.nodes.find(n=>n.id===r.fromNodeId)!;const b=c.nodes.find(n=>n.id===r.toNodeId)!;return (a.x<550)!==(b.x<550);});expect(crossings).toHaveLength(4);expect(crossings.every(r=>r.name?.includes('Bridge'))).toBe(true);});
});
