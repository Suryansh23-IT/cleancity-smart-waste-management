import {it,expect} from 'vitest';
import {createCuratedCities} from './curated';
import {createReadyCities} from './readyCities';
import {showcaseCity,captureSnapshot,testReadings} from './showcase';
import {planCollection} from './routing';
import {startSimulation,advance,truckSnapshot} from './simulation';
import {validateCity} from './model';
it('reconciles legal trips, capacity, costs and terminal playback for all eleven retained cities plus showcase',()=>{
 const cities=[...createCuratedCities(),...createReadyCities(),captureSnapshot(showcaseCity(),testReadings(),'TEST')];expect(cities).toHaveLength(12);
 for(const c of cities){expect(validateCity(c),c.name).toEqual([]);const p=planCollection(c);expect(p.distance).toBeCloseTo(p.trips.reduce((s,t)=>s+t.distance,0));expect(p.cost).toBeCloseTo(p.distance*c.settings.costPerKmINR+p.laborMinutes/60*c.settings.costPerHourINR);
  const pickupIds=p.trips.flatMap(t=>t.binIds);expect(new Set(pickupIds).size).toBe(pickupIds.length);expect(pickupIds.some(id=>p.pending.some(x=>x.binId===id))).toBe(false);
  for(const t of p.trips){const truck=c.trucks.find(x=>x.id===t.truckId)!;expect(t.load).toBeLessThanOrEqual(truck.capacityBinUnits+1e-8);expect(t.nodes.at(-1)).toBe(t.head);for(let i=1;i<t.nodes.length;i++)expect(c.roads.some(r=>r.fromNodeId===t.nodes[i-1]&&r.toNodeId===t.nodes[i])).toBe(true);}
  const result=advance(c,startSimulation(c,p),p.duration);expect([...result.simulation.completed].sort()).toEqual([...pickupIds].sort());for(const truck of c.trucks.filter(x=>p.trips.some(t=>t.truckId===x.id))){const end=truckSnapshot(c,p,p.duration,truck.id);expect(end.from).toBe(end.to);expect(end.load).toBe(0);}
 }
});
