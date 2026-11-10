import {useState} from 'react';
import {parseCity,type City} from '../core/model';
import type {Simulation} from '../core/simulation';
import DatabaseMigration,{stableRequestKey} from './DatabaseMigration';
import DatabaseHistory from './DatabaseHistory';
export interface StoredCity {_id:string;city:City;revision:number;deletedAt:string|null}
export async function waitForBackend(setMessage:(message:string)=>void){
 for(let attempt=1;attempt<=3;attempt++){
  setMessage(attempt===1?'Connecting to the municipal backend; this may take a minute…':`Backend is taking longer than expected. Retrying (${attempt}/3)…`);
  try{const response=await fetch('/api/ready',{cache:'no-store',signal:AbortSignal.timeout(30000)});if(response.ok)return;}catch{/* Retry the read-only readiness check. */}
  if(attempt<3)await new Promise(resolve=>setTimeout(resolve,2000));
 }
 throw Error('Municipal backend is unavailable. Please try again; your browser-local data is unchanged.');
}
export default function DatabaseWorkspace({city,simulation,selected,onSelection,onOpen}:{city:City;simulation:Simulation|null;selected:StoredCity|null;onSelection:(record:StoredCity|null)=>void;onOpen:(city:City,record?:StoredCity)=>void}){
 const setSelected=onSelection;
 const [csrf,setCsrf]=useState(''),[records,setRecords]=useState<StoredCity[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('Browser-local saves remain available. Database persistence requires the municipal backend and operator sign-in.'),[deleted,setDeleted]=useState(false);
 const [nextCityPage,setNextCityPage]=useState<string|null>(null);
 async function request(path:string,method='GET',body?:unknown,revision?:number,withMeta=false){
  const r=await fetch('/api'+path,{method,credentials:'same-origin',headers:{...(body?{'Content-Type':'application/json'}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(revision?{'If-Match':`"${revision}"`}:{})},body:body?JSON.stringify(body):undefined});
  if(r.status===204)return null;
  let result;try{result=await r.json();}catch{throw Error('Municipal backend unavailable; browser-local data is unchanged.');}
  if(!r.ok){if(r.status===401)setCsrf('');throw Error(result.error?.message??'Database request failed');}return withMeta?result:result.data;
 }
 async function perform(action:()=>Promise<void>){setBusy(true);try{await action();}catch(e){setMessage(e instanceof Error?e.message:'Database request failed');}finally{setBusy(false);}}
 async function refresh(showDeleted=deleted){const page=await request('/cities?deleted='+showDeleted,'GET',undefined,undefined,true);setRecords(page.data);setNextCityPage(page.meta.next);}
 return <details className="panel database-workspace" id="municipal-database" aria-label="Municipal database workspace"><summary>Municipal database · explicit operator saves</summary>
  <p role="status">{message}</p>
  {!csrf?<><button disabled={busy} onClick={()=>void perform(async()=>{await waitForBackend(setMessage);const s=await request('/session');setCsrf(s.csrf);await refresh();setMessage('Existing operator session resumed.');})}>Resume operator session</button><form onSubmit={e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);const password=f.get('password');void perform(async()=>{await waitForBackend(setMessage);setMessage('Signing in…');const s=await request('/session','POST',{username:f.get('username'),password});form.reset();setCsrf(s.csrf);await refresh(false);setDeleted(false);setMessage('Operator signed in. Database cities loaded; local saves remain separate.');});}}>
   <label>Operator username<input name="username" autoComplete="username" required/></label><label>Operator password<input name="password" type="password" autoComplete="current-password" required maxLength={256}/></label><button disabled={busy}>{busy?'Connecting…':'Sign in to database'}</button>
  </form></>:<fieldset disabled={busy}><legend>Database city library</legend>
   <button onClick={()=>void perform(async()=>{await refresh();setMessage('Database library refreshed.');})}>Refresh database cities</button>
   <button onClick={()=>void perform(async()=>{await request('/session','DELETE');setCsrf('');setRecords([]);setSelected(null);setMessage('Signed out. Local drafts remain in this browser.');})}>Sign out of database</button>
   <label><input type="checkbox" checked={deleted} onChange={e=>{const value=e.target.checked;void perform(async()=>{await refresh(value);setDeleted(value);setSelected(null);});}}/>Show deleted database cities</label>
   <button onClick={()=>void perform(async()=>{const validated=parseCity(JSON.stringify(city));const record=await request('/cities','POST',{city:validated,requestKey:await stableRequestKey(validated)});const readback=await request('/cities/'+record._id);if(JSON.stringify(readback.city)!==JSON.stringify(validated))throw Error('Read-back mismatch; retain local city and inspect the database record');setSelected(readback);await refresh();setMessage('City copy saved and read back from the database. Browser-local originals were retained.');})}>Save current city as database copy</button>
   {selected&&!selected.deletedAt&&<button disabled={selected.city.id!==city.id} onClick={()=>void perform(async()=>{const r=await request('/cities/'+selected._id,'PUT',{city},selected.revision);setSelected(r);await refresh();setMessage('Database city saved at revision '+r.revision);})}>Update selected database city · revision {selected.revision}</button>}
   <ul>{records.map(r=><li key={r._id}><strong>{r.city.name}</strong> · revision {r.revision} · {r.deletedAt?'deleted':'database'}
    {!r.deletedAt&&<><button onClick={()=>{if(selected?._id===r._id&&selected.revision!==r.revision&&selected.city.id===city.id){setMessage('This draft retains its original revision. Open the database city to reload, or save a separate copy; selecting cannot silently rebase edits.');return;}setSelected(r);}}>Select database city {r.city.name}</button><button onClick={()=>void perform(async()=>{const latest=await request('/cities/'+r._id);onOpen(parseCity(JSON.stringify(latest.city)),latest);setMessage('Database city opened as a local draft. Save back explicitly.');})}>Open database city {r.city.name}</button><button onClick={()=>void perform(async()=>{await request('/cities/'+r._id,'DELETE',undefined,r.revision);setSelected(null);await refresh();setMessage('Database city soft-deleted; Show deleted offers restore. Local city retained.');})}>Archive database city {r.city.name}</button></>}
    {r.deletedAt&&<button onClick={()=>void perform(async()=>{await request('/cities/'+r._id+'/restore','POST',{},r.revision);await refresh();setMessage('Database city restored.');})}>Restore database city {r.city.name}</button>}
   </li>)}</ul>
   {nextCityPage&&<button onClick={()=>void perform(async()=>{const page=await request('/cities?deleted='+deleted+'&after='+encodeURIComponent(nextCityPage),'GET',undefined,undefined,true);setRecords(prior=>[...prior,...page.data]);setNextCityPage(page.meta.next);})}>Load more database cities</button>}
   <DatabaseMigration request={request} perform={perform} onImported={refresh}/>
   <DatabaseHistory city={city} simulation={simulation} request={request} perform={perform} onOpen={c=>onOpen(parseCity(JSON.stringify(c)))}/>
  </fieldset>}
  <p>Local and database saves are separate. No sensor readings or SQLite history are migrated here. City JSON v1 stays compatible; saved records include separate server metadata.</p>
 </details>;
}
