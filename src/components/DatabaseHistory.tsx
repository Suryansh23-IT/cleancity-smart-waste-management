import {useState} from 'react';
import type {City} from '../core/model';
import type {Simulation} from '../core/simulation';
import {downloadJson,stableRequestKey,type DatabaseRequest} from './DatabaseMigration';
interface Archive {_id:string;createdAt:string;kind:string;payload:any}
export default function DatabaseHistory({city,simulation,request,perform,onOpen}:{city:City;simulation:Simulation|null;request:DatabaseRequest;perform:(action:()=>Promise<void>)=>Promise<void>;onOpen:(city:City)=>void}){
 const [scenarios,setScenarios]=useState<Archive[]>([]),[runs,setRuns]=useState<Archive[]>([]),[selected,setSelected]=useState(''),[label,setLabel]=useState('Planning snapshot'),[message,setMessage]=useState('Snapshots and saved results are immutable. Truck pickups remain simulated.'),[inspected,setInspected]=useState<Archive|null>(null);
 const [scenarioPage,setScenarioPage]=useState<string|null>(null),[runPage,setRunPage]=useState<string|null>(null);
 async function refresh(){const [s,r]=await Promise.all([request('/scenarios','GET',undefined,undefined,true),request('/runs','GET',undefined,undefined,true)]);setScenarios(s.data);setRuns(r.data);setScenarioPage(s.meta.next);setRunPage(r.meta.next);}
 const complete=!!simulation&&!simulation.running&&simulation.time>=simulation.plan.duration;
 return <section aria-label="Database planning history"><h3>Saved planning snapshots and results</h3><p role="status">{message}</p>
 <button onClick={()=>void perform(refresh)}>Refresh planning history</button>
 <label>Snapshot label<input value={label} maxLength={160} onChange={e=>setLabel(e.target.value)}/></label>
 <button disabled={!label.trim()} onClick={()=>void perform(async()=>{const input={city:simulation?.original??city,label};const s=await request('/scenarios','POST',{...input,requestKey:await stableRequestKey(input)});setSelected(s._id);await refresh();setMessage('Immutable planning snapshot saved. Active/completed runs use their original captured inputs.');})}>Save planning inputs snapshot</button>
 <label>Saved snapshot for verification<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Select a snapshot</option>{scenarios.map(s=><option key={s._id} value={s._id}>{s.payload.label} · {s.createdAt}</option>)}</select></label>
 <button disabled={!selected||!complete} onClick={()=>void perform(async()=>{if(!simulation)throw Error('Complete a simulation first');const input={scenarioId:selected,plan:simulation.plan,completed:simulation.completed,time:simulation.time};const result=await request('/runs','POST',{...input,requestKey:await stableRequestKey(input)});await refresh();setInspected(result);setMessage('Terminal result saved after server replay verification. This is simulated collection, not physical collection evidence.');})}>Verify and save completed simulation</button>
 <ul>{scenarios.map(s=><li key={s._id}>{s.payload.label}<button onClick={()=>{setInspected(s);setSelected(s._id);}}>Inspect snapshot {s.payload.label}</button><button onClick={()=>onOpen(s.payload.city)}>Open snapshot inputs {s.payload.label}</button></li>)}</ul>
 {scenarioPage&&<button onClick={()=>void perform(async()=>{const p=await request('/scenarios?after='+scenarioPage,'GET',undefined,undefined,true);setScenarios(v=>[...v,...p.data]);setScenarioPage(p.meta.next);})}>Load more planning snapshots</button>}
 <ul>{runs.map(r=><li key={r._id}>{r.createdAt} · {r.payload.completed.length} simulated pickups<button onClick={()=>void perform(async()=>setInspected(await request('/runs/'+r._id)))}>Inspect saved run {r._id.slice(0,8)}</button></li>)}</ul>
 {runPage&&<button onClick={()=>void perform(async()=>{const p=await request('/runs?after='+runPage,'GET',undefined,undefined,true);setRuns(v=>[...v,...p.data]);setRunPage(p.meta.next);})}>Load more saved runs</button>}
 {inspected&&<div aria-label="Saved record details"><h4>{inspected.kind==='run'?'Saved simulated run':'Saved planning snapshot'}</h4><p>{inspected.createdAt} · engine {inspected.payload.engineVersion}</p>{inspected.kind==='run'&&<p>{inspected.payload.completed.length} completed · {inspected.payload.plan.pending.length} pending · {inspected.payload.plan.distance.toFixed(2)} modeled km · {inspected.payload.plan.duration.toFixed(1)} min · INR {inspected.payload.plan.cost.toFixed(2)} · {inspected.payload.verification}</p>}<button onClick={()=>downloadJson('cleancity-database-record.json',JSON.stringify(inspected,null,2))}>Export saved record JSON</button></div>}
 </section>;
}
