import { City } from '../core/model';
import { Plan, comparablePlans, planCollection, truckZoneAssignments } from '../core/routing';
import { useMemo } from 'react';
import { Simulation } from '../core/simulation';
import { operationProgress } from '../core/insights';

const rupees=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
export default function OperationsWorkspace({city,plan,baseline,sim,mode,onPlan,onContinue,onInspect}: {
 city:City;plan:Plan|null;baseline:Plan|null;sim:Simulation|null;mode:'dispatch'|'analytics';
 onPlan:()=>void;onContinue:()=>void;onInspect:(id:string)=>void;
}){
 const demand=city.bins.filter(b=>b.fillPercent>=city.settings.pickupThreshold);
 const available=city.trucks.filter(t=>t.available);
 const bindings=truckZoneAssignments(city);
 const progress=plan?operationProgress(city,plan,sim):null;
 const done=!!sim&&sim.time>=sim.plan.duration;
 const place=(id:string)=>city.nodes.find(n=>n.id===id)?.label??id;
 const comparable=!!plan&&!!baseline&&comparablePlans(plan,baseline);
 const original=sim?.original??city;
 const routine=useMemo(()=>mode==='analytics'&&plan?planCollection(original,false,true):null,[original,mode,plan]);
 const policyComparable=!!routine&&!!plan&&!routine.pending.length&&!plan.pending.length;
 return <section className={`operations-workspace ${mode}`} aria-label={mode==='dispatch'?'Dispatch review':'Results overview'}>
  <div className="operation-intro"><div><span className="eyebrow">{mode==='dispatch'?'PREPARE YOUR COLLECTION':'UNDERSTAND YOUR RESULTS'}</span><h2>{mode==='dispatch'?'Ready the fleet. Review the response.':done?'Your collection, accounted for.':sim?'Collection is still in progress.':'Start with a collection plan.'}</h2><p>{mode==='dispatch'?`${city.name} · ${demand.length} bins need collection · ${available.length} of ${city.trucks.length} trucks available.`:done?'Completed pickups and actual modeled progress are shown alongside the original plan.':sim?'These are partial results. Finish the simulation to review the complete outcome.':'Plan estimates are available before playback; they are not completed collection results.'}</p></div>
  <button className="primary" onClick={mode==='dispatch'&&!plan?onPlan:onContinue} disabled={mode==='dispatch'&&!plan&&(!available.length||!city.zones.length||!demand.length)}>{mode==='dispatch'?(plan?'Review simulation':'Prepare collection plan'):(sim?'Open simulation':'Prepare a plan')}</button></div>
  <div className="operation-summary">
   <div><small>{mode==='dispatch'?'Collection demand':'Pickups completed'}</small><strong>{mode==='dispatch'?demand.length:progress?.completed??0}</strong><span>{mode==='dispatch'?`At least ${city.settings.pickupThreshold}% full`:sim?`${progress?.remaining??0} scheduled stops remaining`:'No simulation started'}</span></div>
   <div><small>{mode==='dispatch'?'Planned road distance':'Distance travelled'}</small><strong>{plan?`${(mode==='dispatch'?plan.distance:progress?.distance??0).toFixed(2)} km`:'—'}</strong><span>{plan?`${plan.distance.toFixed(2)} km planned`:'Prepare a plan first'}</span></div>
   <div><small>Fleet completion time</small><strong>{plan?`${plan.duration.toFixed(1)} min`:'—'}</strong><span>Virtual elapsed time, with parallel vehicles</span></div>
   <div><small>{mode==='dispatch'?'Unserved pickups':'Modeled full-plan cost'}</small><strong>{mode==='dispatch'?(plan?.pending.length??'—'):(plan?rupees(plan.cost):'—')}</strong><span>{mode==='dispatch'?'Shown separately from scheduled stops':plan?`${plan.laborMinutes.toFixed(1)} summed vehicle minutes`:'No cost estimate yet'}</span></div>
  </div>
  {!city.zones.length&&mode==='dispatch'&&<p className="operation-note">Set up collection areas and their depots below. Each pickup needs a legal route out and back.</p>}
  {!available.length&&mode==='dispatch'&&<p className="operation-note">No trucks are available. Add or enable a truck in Fleet & zone assignments.</p>}
  {!demand.length&&mode==='dispatch'&&<p className="operation-note">No bins currently meet the pickup threshold. You can inspect the city or change simulated demand in City Studio.</p>}
  {plan&&<details className="dispatch-routes" open={mode==='dispatch'}><summary>Truck routes & pickup assignments · {plan.trips.length} trips</summary>
   {city.trucks.map(t=>{const trips=plan.trips.filter(trip=>trip.truckId===t.id);return <details key={t.id} className="route-vehicle"><summary><b>{t.label}</b><span>{!t.available?'Unavailable':trips.length?`${trips.length} trips · ${trips.reduce((s,v)=>s+v.distance,0).toFixed(2)} km`:'Not scheduled'}</span></summary>
    <p>{t.capacityBinUnits} bin units capacity · {city.zones.find(z=>z.id===bindings.get(t.id))?.name??'No zone assigned'} · {city.settings.speeds[t.speedGrade]} km/h</p>
    {trips.map(trip=><div key={trip.id} className="route-trip"><b>{trip.id} · {trip.start.toFixed(1)}–{trip.end.toFixed(1)} virtual min</b><p>{place(trip.origin)} → {trip.binIds.map(id=>city.bins.find(b=>b.id===id)?.name??id).join(' → ')} → {place(trip.head)}</p><small>{trip.load.toFixed(2)} bin units · {trip.distance.toFixed(2)} km · includes return and modeled service/unloading</small><details><summary>Actual road legs and service events</summary><ol>{trip.segments.map((leg,i)=><li key={i}>{leg.kind.replaceAll('_',' ').toLowerCase()} · {place(leg.from)} → {place(leg.to)} · {leg.distance.toFixed(2)} km · {leg.duration.toFixed(1)} min</li>)}</ol></details></div>)}
    <button onClick={()=>onInspect(t.id)}>Inspect {t.label} on map</button></details>;})}
  </details>}
  {plan&&<div className={plan.pending.length?'operation-exceptions':'operation-clear'}><h3>{plan.pending.length?'Needs a dispatch decision':'No unserved pickups in this plan'}</h3>{plan.pending.length?plan.pending.map(p=><p key={p.binId}><b>{city.bins.find(b=>b.id===p.binId)?.name??p.binId}</b> — {p.reason}</p>):<p>{plan.eligible.length?`${plan.eligible.length} eligible pickups are assigned. Bins below the threshold are not missed pickups.`:'There is no eligible pickup demand; zero trips is the correct result.'}</p>}</div>}
  {mode==='analytics'&&plan&&<div className="analysis-assumptions"><b>{comparable?'Same-demand baseline comparison':'Comparison needs matching service coverage'}</b><p>The reference visits bins in fixed identifier order; the planner uses urgency and nearest feasible pickups. This is a heuristic comparison, not proof of the best possible route.</p><p>Full-plan cost = {plan.distance.toFixed(2)} km × {rupees(city.settings.costPerKmINR)}/km + {(plan.laborMinutes/60).toFixed(2)} summed vehicle hours × {rupees(city.settings.costPerHourINR)}/hour. {comparable&&baseline?`Modeled ${baseline.cost>=plan.cost?'saving':'additional cost'}: ${rupees(Math.abs(baseline.cost-plan.cost))}.`:'No savings claim is made for mismatched service coverage.'}</p></div>}
  {mode==='analytics'&&routine&&plan&&<section className="analysis-assumptions" aria-label="All bins versus eligible collection"><h3>Routine full round vs threshold-based collection</h3><p>Both estimates use the same starting fill levels, roads, trucks, capacities and cost rates. The routine round visits every bin, including empty bins; threshold-based collection serves only eligible bins. This compares different service policies, not equal-coverage routing efficiency.</p><p><b>All {routine.eligible.length} bins:</b> {rupees(routine.cost)} · {routine.distance.toFixed(2)} km · {routine.duration.toFixed(1)} fleet min</p><p><b>Eligible {plan.eligible.length} bins:</b> {rupees(plan.cost)} · {plan.distance.toFixed(2)} km · {plan.duration.toFixed(1)} fleet min</p>{policyComparable?<p><b>Modeled {routine.cost>=plan.cost?'cost saved':'additional cost'}: {rupees(Math.abs(routine.cost-plan.cost))}</b>{routine.cost>0?` (${(Math.abs(routine.cost-plan.cost)/routine.cost*100).toFixed(1)}% of the full round).`:'.'} Below-threshold bins are deferred, not collected by this policy. These are estimates, not measured savings.</p>:<p>No savings claim: full round has {routine.pending.length} unserved bins; threshold plan has {plan.pending.length}. Resolve service failures before comparing costs.</p>}</section>}
  <p className="session-only">Simulated municipal operation · city inputs save in this browser; plans and run results stay in this tab. No GPS tracking or saved run history.</p>
 </section>;
}
