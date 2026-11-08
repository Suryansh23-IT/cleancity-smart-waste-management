import {useState} from 'react';
import {City} from '../core/model';
import {mapping,previewReadings,captureSnapshot,testReadings} from '../core/showcase';
import {physicalEndpoint,type PhysicalTransport} from '../core/physical';
export default function ShowcasePanel({city,locked,onCapture,transport}:{city:City;locked:boolean;onCapture:(c:City)=>boolean;transport:PhysicalTransport}){
 const [preview,setPreview]=useState<unknown>(null),[mode,setMode]=useState<'TEST'|'PHYSICAL'>('PHYSICAL'),[error,setError]=useState('');
 const snap=city.showcaseSnapshot;
 async function load(test:boolean){
  setPreview(null);setError('');
  try {
   const input=test?testReadings():await (async()=>{
    const r=await fetch(physicalEndpoint(transport),{signal:AbortSignal.timeout(5000),cache:'no-store'});
    if(!r.ok)throw Error(r.status===401?'Sign in to the municipal database first':transport==='wifi'?'Wi-Fi telemetry unavailable':'Local receiver unavailable');
    const data=await r.json();
    if(transport==='wifi'&&!['CLOUD_WIFI','CLOUD_TEST'].includes(data.origin))throw Error('Expected authenticated Wi-Fi telemetry');
    if(transport==='usb'&&data.origin!=='LOCAL_USB')throw Error('Expected the local USB receiver');
    return data;
   })();
   previewReadings(input);setMode(test||input.origin==='CLOUD_TEST'?'TEST':'PHYSICAL');setPreview(input);
  } catch(e) {setError(e instanceof Error?e.message:String(e));}
 }
 return <section className="panel showcase-panel" aria-label="Ten-bin hybrid snapshot"><h3>{snap?`${snap.mode==='TEST'?'TEST FIXTURE':'MIXED-SOURCE'} PLANNING SNAPSHOT`:'Ten-bin hybrid showcase · capture required'}</h3><p>Approved 90 × 60 cm showcase layout · 4 mapped channels + 6 VIRTUAL bins. Truck collection is simulated; it never clears sensors. No live values enter a run automatically.</p>{snap&&<p>Frozen {snap.origin==='CLOUD_WIFI'?'Wi-Fi':snap.origin==='CLOUD_TEST'?'Wi-Fi TEST':snap.mode==='TEST'?'TEST':'USB'} input captured {snap.capturedAt} · original fills preserved in snapshot metadata. Save city / Export JSON includes provenance. Playback fills represent simulated progress.</p>}<details><summary>Channel mapping and frozen provenance</summary>{Object.entries(mapping).map(([channel,id])=><p key={id}>{channel} → {id} · {snap?.mode==='TEST'?'TEST FIXTURE':snap?'PHYSICAL-DERIVED':'REAL PHYSICAL · not captured'}{snap&&` · ${snap.readings.find(r=>r.id===channel)?.distanceCm} cm · received ${snap.readings.find(r=>r.id===channel)?.receivedAt}`}</p>)}<p>Other six bins: VIRTUAL modeled demand. Unknown physical fills are placeholders until capture, not measured zero.</p></details><fieldset disabled={locked}><button onClick={()=>load(false)}>Preview {transport==='wifi'?'Wi-Fi readings':'actual sensors'}</button><button onClick={()=>load(true)}>Preview TEST fixtures</button>{!!preview&&<div role="status"><b>{mode==='TEST'?'TEST FIXTURES ONLY — NOT LIVE':transport==='wifi'?'Authenticated Wi-Fi readings preview':'USB readings preview'}</b>{previewReadingsForDisplay(preview).map(b=><p key={b.id}>{b.id} · {b.fillPercent}% · {b.distanceCm} cm · {b.receivedAt}</p>)}<button onClick={()=>{try{if(onCapture(captureSnapshot(city,preview,mode)))setPreview(null);}catch(e){setError(String(e));}}}>Confirm {mode} snapshot</button></div>}</fieldset>{locked&&<p>Reset the active run before previewing or refreshing snapshot inputs.</p>}{error&&<p role="alert">{error}</p>}</section>;
}
function previewReadingsForDisplay(input:unknown){return (input as {bins:{id:string;fillPercent:number;distanceCm:number;receivedAt:string}[]}).bins;}
