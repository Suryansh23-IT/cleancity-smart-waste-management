import SerialConnection from './SerialConnection';
import { useEffect, useRef, useState } from "react";
import { Radio, RefreshCw, AlertTriangle } from "lucide-react";
import { defaults, status } from "../core/model";
import { PhysicalBin, parsePhysical, staleReading, physicalEndpoint, cloudReadingAge, cloudStaleMs, type PhysicalTransport } from "../core/physical";
type LabThresholds = {pickup:number; urgent:number};
const thresholdDefaults: LabThresholds = {pickup:70, urgent:90};
const thresholdKey = 'cleancity.lab.binThresholds';
function validThresholds(value: LabThresholds) {
  return Number.isFinite(value?.pickup) && Number.isFinite(value?.urgent) && value.pickup >= 1 && value.pickup < value.urgent && value.urgent <= 100;
}
export default function PhysicalLab({transport, onTransport, onSignIn, onDemo}: {
  transport: PhysicalTransport; onTransport: (value: PhysicalTransport) => void; onSignIn: () => void; onDemo: (fills:number[]) => void;
}) {
  const wifi = transport === 'wifi';
  const [demoMode,setDemoMode]=useState(false);
  const [demoFills,setDemoFills]=useState([25,50,70,90]);
  const [thresholds, setThresholds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(thresholdKey) ?? '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) return Object.fromEntries(Object.entries(saved).filter(([id, value]) => /^BIN-00[1-4]$/.test(id) && validThresholds(value as LabThresholds))) as Record<string, LabThresholds>;
    } catch { /* Use defaults when local preferences are unavailable. */ }
    return {} as Record<string, LabThresholds>;
  });
  const [draftCalibration, setDraftCalibration] = useState<Record<string,{empty:number;depth:number}>>({});
  const usbAvailable = ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  const [fixture, setFixture] = useState(false);
  const [bins, setBins] = useState<PhysicalBin[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [checked, setChecked] = useState<string | null>(null),
    [now, setNow] = useState(Date.now()), [receiver,setReceiver]=useState<{connected:boolean;error:string|null;port?:string|null}|null>(null),[local,setLocal]=useState(false),[feedback,setFeedback]=useState("");
  const inFlight = useRef(false);
  const requestVersion = useRef(0);
  async function refresh(signal?: AbortSignal) {
    if (inFlight.current) return;
    inFlight.current = true;
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      if (!wifi && !usbAvailable) throw Error('Open the local CleanCity app to use the USB receiver.');
      const response = await fetch(physicalEndpoint(transport), {
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
          : AbortSignal.timeout(10000),
        cache: "no-store",
      });
      if (!response.ok)
        throw Error(wifi && response.status === 401 ? 'Sign in under Cities → Municipal database to view Wi-Fi readings.' :
          response.status === 503
            ? "Telemetry receiver is not configured or unavailable. No verified telemetry is available."
            : `Physical API unavailable (${response.status}). No verified data.`,
        );
      if (
        !response.headers
          .get("content-type")
          ?.toLowerCase()
          .includes("application/json")
      )
        throw Error(
          "Physical telemetry endpoint is unavailable. No verified telemetry is available.",
        );
      const data = await response.json();
      if (signal?.aborted || version !== requestVersion.current) return;
      if (wifi && !['CLOUD_WIFI','CLOUD_TEST'].includes(data.origin)) throw Error('Expected authenticated Wi-Fi telemetry.');
      setBins(parsePhysical(data));
      setFixture(data.origin === 'CLOUD_TEST');
      setLocal(data.origin==="LOCAL_USB");setReceiver(data.receiver??null);
      setError("");
      setChecked(new Date().toISOString());
      setNow(Date.now());
    } catch (e) {
      if (!signal?.aborted && version === requestVersion.current)
        setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (version === requestVersion.current) {
        inFlight.current = false;
        if (!signal?.aborted) setLoading(false);
      }
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const interval = setInterval(() => refresh(controller.signal), wifi ? 5000 : 1000);
    return () => {
      controller.abort();
      requestVersion.current++;
      inFlight.current = false;
      clearInterval(interval);
      clearInterval(tick);
    };
  }, []);
  if(demoMode) return <>
    <section className="physical-banner"><div><span className="eyebrow">DEMO · SIMULATED</span><h3>Sensor-free demo simulator</h3><p>Virtual values only. No physical telemetry is written.</p></div><button onClick={()=>setDemoMode(false)}>Return to live readings</button></section>
    <div className="physical-grid">{demoFills.map((fill,i)=>{const id=`BIN-00${i+1}`, t=thresholds[id]??thresholdDefaults, urgency=status(fill,{...defaults,pickupThreshold:t.pickup,urgentThreshold:t.urgent},false);return <section className="panel bin-gauge" key={id}><b>{id} · DEMO</b><p style={{color:urgency==='URGENT'?'#b83131':urgency==='COLLECTION_NEEDED'?'#a65d00':'#137750'}}>{fill}% · {urgency.replace('_',' ')}</p><label>Simulated fill <input type="range" min="0" max="100" value={fill} aria-label={`${id} simulated fill`} onChange={e=>setDemoFills(current=>current.map((v,n)=>n===i?Number(e.target.value):v))}/></label></section>})}</div>
    <section className="panel"><h3>Demo dispatch snapshot</h3><p>Explicitly load these values into a TEST showcase snapshot. The other six bins remain virtual; collection and analytics are simulated.</p><button onClick={()=>onDemo(demoFills)}>Use demo values in simulation</button></section>
  </>;
  return (
    <>
      <section className="physical-banner">
        <Radio size={27} />
        <div>
          <span className="eyebrow">PHYSICAL IOT LAB</span>
          <h3>Real devices. Real observations.</h3>
          <p>Four physical channels · separate from simulated collection</p>
          <small>{wifi ? 'Readings and history come from the authenticated Atlas telemetry API.' : 'Readings come from the local USB receiver and its saved history.'}</small>
          <label>Reading source <select value={transport} onChange={e => onTransport(e.target.value as PhysicalTransport)}>
            <option value="usb">USB · local receiver</option>
            <option value="wifi">Wi-Fi · cloud telemetry</option>
          </select></label>
        </div>
        <span className="pill">
          {error
            ? "NO VERIFIED DATA"
            : bins.length
              ? wifi ? fixture ? "WI-FI · TEST FIXTURE" : "WI-FI · CLOUD" : local ? "LOCAL PHYSICAL" : "PHYSICAL TELEMETRY"
              : loading ? "CHECKING RECEIVER" : "NO VERIFIED DATA"}
        </span>
        <button disabled={loading} onClick={() => refresh()}>
          <RefreshCw size={16} />
          {loading ? "Checking…" : "Refresh"}
        </button>
        <button onClick={()=>setDemoMode(true)}>Open demo simulator</button>
        <a className="workspace-jump" href="#iot-showcase">Go to 10-bin showcase ↓</a>
      </section>
      {wifi && <section className="panel lab-wifi-status" aria-label="Cloud connection status" role="status">
        <b>{fixture ? 'Wi-Fi · TEST fixture feed' : 'Automatic Wi-Fi monitoring'}</b>
        <p>{error ? 'Connection unavailable' : loading && bins.length === 0 ? 'Connecting to Wi-Fi readings…' : bins.length === 0 ? 'Offline · waiting for the first batch' : cloudReadingAge(bins[0], now) > 120000 ? 'Offline · no recent sample' : cloudReadingAge(bins[0], now) > cloudStaleMs ? 'Stale · waiting for a fresh batch' : fixture ? 'TEST fixture feed · not live physical telemetry' : `Connected · receiving live Wi-Fi readings · Fresh valid channels: ${bins.filter(b=>b.status==='VALID' && cloudReadingAge(b,now)<=cloudStaleMs).length}/4`}</p>
        <small>Reading age is the time since the last device sample. It rises between updates and resets when a new sample arrives.</small>
        {error.includes('Sign in') && <button onClick={onSignIn}>Sign in to view readings</button>}
      </section>}
      {!wifi && usbAvailable && <div className="lab-connection-grid">
      <SerialConnection onChange={()=>{void refresh();}}/>
      <section className="panel" aria-label="Automatic USB connection status" role="status">
        <b>Automatic USB monitoring</b>
        <p>{error ? 'Local receiver unavailable — USB cannot be read directly by this website.' : local ? `Receiver: ${receiver?.connected?'PORT OPEN':'DISCONNECTED'} · ${receiver?.port??'No port selected'} · Fresh valid channels: ${receiver?.connected?bins.filter(b=>b.status==='VALID'&&b.receivedAt&&now-Date.parse(b.receivedAt)<=10000&&Date.parse(b.receivedAt)<=now+5000).length:0}/4` : checked ? 'Local USB receiver status is unavailable from this source.' : 'Checking telemetry receiver…'}</p>
        <small>Updates automatically every second while this Lab is open. The local receiver must be running with your explicitly selected COM port; it retries that same port after a USB reconnect. Fresh distance readings do not prove calibration or electrical safety.</small>
      </section>
      </div>}
      {error && (
        <div className="warning-list" role="alert">
          <AlertTriangle size={18} /> {error} Last successfully fetched
          readings, if any, are retained below and marked stale.
        </div>
      )}
      {local&&<p role="status">LOCAL PHYSICAL · Receiver {receiver?.connected?"CONNECTED":"DISCONNECTED"} · {receiver?.error??"No serial commands are sent. Other channels are distance-only until individually calibrated."}</p>}
      <div className="lab-readings-heading"><div><span className="eyebrow">PHYSICAL SENSORS</span><h3>Live readings</h3></div><span>{wifi ? 'Wi-Fi · 4 channels' : 'USB · 4 channels'}</span></div>
      {wifi && bins.some(b=>b.status==='VALID' && b.fillPercent===null) && <p className="lab-calibration-notice">Fill percentage and alert colours will be available after Wi-Fi calibration. Check each reading's age for freshness.</p>}
      <div className="physical-grid">
        {[1, 2, 3, 4].map((i) => {
          const id = `BIN-${String(i).padStart(3, "0")}`,
            b = bins.find((b) => b.id === id),
            threshold = thresholds[id] ?? thresholdDefaults,
            labSettings = {...defaults, pickupThreshold:threshold.pickup, urgentThreshold:threshold.urgent},
            calibration = draftCalibration[id] ?? (b?.calibration ? {empty:b.calibration.emptyDistanceCm,depth:b.calibration.usableDepthCm} : null),
            stale = !!error || (wifi ? cloudReadingAge(b, now) > cloudStaleMs : local ? !receiver?.connected || !b?.receivedAt || now-Date.parse(b.receivedAt)>10000 || Date.parse(b.receivedAt)>now+5000 : staleReading(b?.receivedAt ?? null, now)),
            s = status(b?.fillPercent ?? null, labSettings, stale),
            color =
              s === "URGENT"
                ? "#f78484"
                : s === "COLLECTION_NEEDED"
                  ? "#ffbc70"
                  : "#62d7af";
          return (
            <section className="panel bin-gauge" key={id}>
              <div className="section-heading">
                <b>{b?.label ?? id}</b>
                <span className="pill">{!b?.receivedAt ? "NO READING" : error ? "RECEIVER UNAVAILABLE" : local&&!receiver?.connected ? "DISCONNECTED" : stale ? "STALE" : b.status==="NO_ECHO" ? "NO ECHO" : b.status==="INVALID"||b.distanceCm===null ? "INVALID READING" : b.fillPercent===null ? "VALID · NOT CALIBRATED" : "RECEIVING"}</span>
              </div>
              <div
                className={`gauge${wifi && b?.status === 'VALID' && b.fillPercent === null ? ' gauge-distance' : ''}`}
                style={{
                  background: `conic-gradient(${stale ? "#abb8b0" : color} ${(b?.fillPercent ?? 0) * 3.6}deg, #edf2eb 0deg)`,
                }}
              >
                <div>
                  <strong>
                    {b?.fillPercent === null || b?.fillPercent === undefined
                      ? wifi && b?.status === 'VALID' && b.distanceCm !== null ? `${b.distanceCm.toFixed(1)} cm` : "—"
                      : b.fillPercent.toFixed(1) + "%"}
                  </strong>
                  <small>{b?.receivedAt ? stale ? "LAST RECEIVED VALUE" : b.distanceCm!==null&&b.fillPercent===null ? "DISTANCE · NOT CALIBRATED" : s === 'COLLECTION_NEEDED' ? 'COLLECTION NEEDED' : s : "NO VERIFIED DATA"}</small>
                </div>
              </div>
              <dl>
                {!(wifi && b?.status === 'VALID' && b.fillPercent === null) && <><dt>Distance</dt>
                <dd>
                  {b?.distanceCm != null
                    ? `${b.distanceCm.toFixed(1)} cm`
                    : "—"}
                </dd></>}
                <dt>Last received</dt>
                <dd>
                  {b?.receivedAt
                    ? new Date(b.receivedAt).toLocaleString()
                    : "Never"}
                </dd>
                <dt>Source</dt>
                <dd>{wifi ? fixture ? 'WI-FI · TEST' : 'WI-FI · CLOUD' : local ? 'LOCAL PHYSICAL' : 'PHYSICAL'}</dd>
                <dt>Device</dt>
                <dd>{b?.deviceId ?? "Not configured"}</dd>
                <dt>Reading age</dt><dd>{b?.receivedAt ? `${Math.max(0,Math.round((now-Date.parse(b.receivedAt))/1000))} seconds` : 'Unknown'}</dd>
              </dl>
              {(local || wifi) && b && <>
                {local && <p className="small">{b.reason}{b.lastValid ? ` · Last valid distance: ${b.lastValid.distanceCm.toFixed(2)} cm (${new Date(b.lastValid.receivedAt).toLocaleTimeString()})` : ''}</p>}
                <details className="lab-calibration" aria-label={`${id} individual calibration`}>
                  <summary>Individual calibration · {id}</summary>
                  <p>Enter the measured sensor-to-bottom empty distance and the sensor-to-full distance. The 2 cm full threshold is provisional until verified.</p>
                  <form onInput={e=>{const f=new FormData(e.currentTarget), empty=Number(f.get('empty')), offset=Number(f.get('offset')); setDraftCalibration(current=>({...current,[id]:{empty,depth:empty-offset}}));}} onSubmit={async e=>{
                    e.preventDefault(); const f=new FormData(e.currentTarget), empty=Number(f.get('empty')), offset=Number(f.get('offset')), depth=empty-offset;
                    if(!Number.isFinite(empty)||!Number.isFinite(offset)||depth<=0||offset<2||empty>400){setFeedback(`${id}: empty must exceed full; full must be at least 2 cm and empty at most 400 cm.`);return;}
                    setFeedback(`${id}: Saving calibration…`);
                    try {let csrf='';if(wifi){const session=await fetch('/api/session',{cache:'no-store'});if(!session.ok)throw Error('Sign in under Cities → Municipal database first.');csrf=(await session.json()).data.csrf;}const r=await fetch(wifi?`/api/telemetry/calibration/${id}`:`/api/physical/calibration/${id}`,{method:'PUT',headers:{'Content-Type':'application/json',...(wifi?{'X-CSRF-Token':csrf}:{})},body:JSON.stringify({emptyDistanceCm:empty,usableDepthCm:depth})});const result=await r.json();if(!r.ok)throw Error(typeof result.error==='string'?result.error:result.error?.message??'Calibration could not be saved');setFeedback(`${id}: calibration saved.`);setDraftCalibration(current=>{const next={...current};delete next[id];return next;});await refresh();}catch(err){setFeedback(`${id}: ${err instanceof Error?err.message:String(err)}`);}
                  }}>
                    <label>Sensor-to-bottom empty distance (cm)<input name="empty" aria-label={`${id} empty distance`} type="number" min="2.01" max="400" step="any" required defaultValue={b.calibration?.emptyDistanceCm}/></label>
                    <label>Sensor-to-full distance (cm)<input name="offset" aria-label={`${id} sensor offset`} type="number" min="2" max="399.99" step="any" required defaultValue={b.calibration ? Number((b.calibration.emptyDistanceCm-b.calibration.usableDepthCm).toFixed(2)) : undefined}/></label>
                    <button>Save {id} calibration</button><p role="status">{feedback.startsWith(id)?feedback:''}</p>
                  </form>
                </details>
              </>}
              <details className="lab-thresholds"><summary>Alert levels · {threshold.pickup}% orange / {threshold.urgent}% red</summary>
                <p>Set alert levels for {id}. These do not change its fill calculation.</p>
                <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget), next={pickup:Number(f.get('pickup')),urgent:Number(f.get('urgent'))};if(!validThresholds(next)){setFeedback(`${id}: orange must be at least 1% and below red, with red at most 100%.`);return;}const updated={...thresholds,[id]:next};setThresholds(updated);try{localStorage.setItem(thresholdKey,JSON.stringify(updated));setFeedback(`${id}: alert levels saved in this browser.`);}catch{setFeedback(`${id}: alert levels applied for this session; browser storage unavailable.`);}}}>
                  <label>Orange · collection (%)<input aria-label={`${id} orange threshold`} name="pickup" type="number" min="1" max="99" step="any" required defaultValue={threshold.pickup}/></label>
                  <label>Red · urgent (%)<input aria-label={`${id} red threshold`} name="urgent" type="number" min="2" max="100" step="any" required defaultValue={threshold.urgent}/></label>
                  <button>Save {id} alert levels</button><p role="status">{feedback.startsWith(id)?feedback:''}</p>
                </form>
              </details>
              {calibration && Number.isFinite(calibration.empty) && Number.isFinite(calibration.depth) && calibration.depth>0 && calibration.empty-calibration.depth>=2 && <div className="lab-distance-guide"><b>{draftCalibration[id] ? 'Calibration preview · save to apply' : 'Distance guide'}</b><p>Empty distance: {calibration.empty.toFixed(1)} cm · full distance: {(calibration.empty-calibration.depth).toFixed(1)} cm{Math.abs(calibration.empty-calibration.depth-2)<0.001 ? ' (provisional)' : ''}</p><p>🟠 {threshold.pickup}%: {(calibration.empty-calibration.depth*threshold.pickup/100).toFixed(1)} cm or closer<br/>🔴 {threshold.urgent}%: {(calibration.empty-calibration.depth*threshold.urgent/100).toFixed(1)} cm or closer</p><small>Fill = (empty distance − measured distance) ÷ usable fill range.</small></div>}
              {b && b.history.length > 0 && <details className="lab-history"><summary>Recent readings &amp; history</summary>
                {local && <ol aria-label={`${id} recent distance history`}>{b.history.slice(-5).map((h,i)=><li key={i}>{new Date(h.receivedAt).toLocaleTimeString()} · {h.distanceCm!=null?`${h.distanceCm.toFixed(2)} cm`:h.status??'Unknown'}</li>)}</ol>}
                {b.history.some(h=>h.fillPercent!==null)&&<p className="small">Last usable history value: {([...b.history].filter(h=>h.fillPercent!==null).sort((a,b)=>Date.parse(a.receivedAt)-Date.parse(b.receivedAt)).at(-1)?.fillPercent)?.toFixed(0)}%. This does not establish that the current reading is valid.</p>}
                {b.history.length > 1 && b.history.some(h=>h.fillPercent!==null) && <>
                  <h4>Recent physical fill history</h4>
                  <svg
                    role="img"
                    viewBox="0 0 240 90"
                    aria-label={`${id} recent fill history`}
                  >
                    <polyline
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      points={b.history
                        .map((h, i) =>
                          h.fillPercent == null
                            ? null
                            : `${(i / (b.history.length - 1)) * 230 + 5},${85 - h.fillPercent * 0.75}`,
                        )
                        .filter(Boolean)
                        .join(" ")}
                    />
                  </svg>
                </>}
              </details>}
            </section>
          );
        })}
      </div>

      <section className="panel">
        <h3>Physical alerts & connectivity</h3>
        {bins
          .filter(
            (b) =>
              b.fillPercent === null ||
              b.fillPercent >= (thresholds[b.id] ?? thresholdDefaults).pickup ||
            (wifi ? cloudReadingAge(b, now) > cloudStaleMs : staleReading(b.receivedAt, now)),
          )
          .map((b) => (
            <p key={b.id}>
              {b.id}:{" "}
              {b.fillPercent === null && b.status === 'VALID' && !error && !(wifi ? cloudReadingAge(b, now) > cloudStaleMs : staleReading(b.receivedAt, now)) ? 'NOT CALIBRATED' : status(
                b.fillPercent,
                {...defaults, pickupThreshold:(thresholds[b.id] ?? thresholdDefaults).pickup, urgentThreshold:(thresholds[b.id] ?? thresholdDefaults).urgent},
                !!error || (wifi ? cloudReadingAge(b, now) > cloudStaleMs : staleReading(b.receivedAt, now)),
              ).replace('_', ' ')}
            </p>
          ))}
        {!bins.length && (
          <p>
            No verified readings or sensor alerts. Hardware data is never
            populated from the municipal simulator.
          </p>
        )}
        <p className="small">
          Last successful API check: {checked ?? "None"} · {wifi ? 'Poll interval 5 seconds · stale after 45 seconds · offline after 2 minutes.' : 'Poll interval 1 second · local stale threshold 10 seconds.'}
        </p>
      </section>
      <section className="panel"><h3>Physical evidence</h3><p>The four-channel local pipeline was demonstrated previously. Final mounted-bin calibration, electrical checks and repeatability remain separate acceptance tasks. Preserve the tested firmware and wiring; never apply 5V Echo directly to ESP32 GPIO.</p></section>
    </>
  );
}
