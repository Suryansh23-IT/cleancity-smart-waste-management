import { useEffect, useRef, useState } from "react";
import { Radio, RefreshCw, AlertTriangle } from "lucide-react";
import { status } from "../core/model";
import { PhysicalBin, parsePhysical, staleReading } from "../core/physical";
export default function PhysicalLab() {
  const [bins, setBins] = useState<PhysicalBin[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [checked, setChecked] = useState<string | null>(null),
    [now, setNow] = useState(Date.now()), [receiver,setReceiver]=useState<{connected:boolean;error:string|null}|null>(null),[local,setLocal]=useState(false),[feedback,setFeedback]=useState("");
  const inFlight = useRef(false);
  const requestVersion = useRef(0);
  async function refresh(signal?: AbortSignal) {
    if (inFlight.current) return;
    inFlight.current = true;
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const response = await fetch("/api/physical", {
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
          : AbortSignal.timeout(10000),
        cache: "no-store",
      });
      if (!response.ok)
        throw Error(
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
      setBins(parsePhysical(data));
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
    const interval = setInterval(() => {
      setNow(Date.now());
      refresh(controller.signal);
    }, 1000);
    return () => {
      controller.abort();
      requestVersion.current++;
      inFlight.current = false;
      clearInterval(interval);
    };
  }, []);
  return (
    <>
      <section className="physical-banner">
        <Radio size={27} />
        <div>
          <span className="eyebrow">PHYSICAL IOT LAB</span>
          <h3>Real devices. Real observations.</h3>
          <p>Four sensor channels · one demonstration bin · independent of the municipal simulator</p>
          <small>Local path: ESP32 → USB serial → Node receiver → SQLite → this view. Live hardware verification requires authorized COM access.</small>
        </div>
        <span className="pill">
          {error
            ? "NO VERIFIED DATA"
            : bins.length
              ? local ? "LOCAL PHYSICAL" : "PHYSICAL TELEMETRY"
              : "NO VERIFIED DATA"}
        </span>
        <button disabled={loading} onClick={() => refresh()}>
          <RefreshCw size={16} />
          {loading ? "Checking…" : "Refresh"}
        </button>
      </section>
      {error && (
        <div className="warning-list" role="alert">
          <AlertTriangle size={18} /> {error} Last successfully fetched
          readings, if any, are retained below and marked stale.
        </div>
      )}
      {local&&<p role="status">LOCAL PHYSICAL · Receiver {receiver?.connected?"CONNECTED":"DISCONNECTED"} · {receiver?.error??"No serial commands are sent. Other channels are distance-only until individually calibrated."}</p>}
      <div className="physical-grid">
        {[1, 2, 3, 4].map((i) => {
          const id = `BIN-${String(i).padStart(3, "0")}`,
            b = bins.find((b) => b.id === id),
            stale = !!error || (local ? !b?.receivedAt || now-Date.parse(b.receivedAt)>10000 || Date.parse(b.receivedAt)>now+5000 : staleReading(b?.receivedAt ?? null, now)),
            s = status(b?.fillPercent ?? null, undefined, stale),
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
                className="gauge"
                style={{
                  background: `conic-gradient(${stale ? "#abb8b0" : color} ${(b?.fillPercent ?? 0) * 3.6}deg, #edf2eb 0deg)`,
                }}
              >
                <div>
                  <strong>
                    {b?.fillPercent === null || b?.fillPercent === undefined
                      ? "—"
                      : Math.round(b.fillPercent) + "%"}
                  </strong>
                  <small>{b?.receivedAt ? stale ? "LAST RECEIVED VALUE" : local&&b.distanceCm!==null&&b.fillPercent===null ? "NOT CALIBRATED" : s : "NO VERIFIED DATA"}</small>
                </div>
              </div>
              <dl>
                <dt>Distance</dt>
                <dd>
                  {b?.distanceCm != null
                    ? `${b.distanceCm.toFixed(1)} cm`
                    : "—"}
                </dd>
                <dt>Last received</dt>
                <dd>
                  {b?.receivedAt
                    ? new Date(b.receivedAt).toLocaleString()
                    : "Never"}
                </dd>
                <dt>Source</dt>
                <dd>{local?"LOCAL PHYSICAL":"PHYSICAL"}</dd>
                <dt>Device</dt>
                <dd>{b?.deviceId ?? "Not configured"}</dd>
                <dt>Reading age</dt><dd>{b?.receivedAt ? `${Math.max(0,Math.round((now-Date.parse(b.receivedAt))/1000))} seconds` : 'Unknown'}</dd>
              </dl>
              {local&&<><p className="small">{b?.reason}{b?.lastValid?` · Last valid distance: ${b.lastValid.distanceCm.toFixed(2)} cm (${new Date(b.lastValid.receivedAt).toLocaleTimeString()})`:''}</p><details><summary>Measured calibration · this channel only</summary><p>Use measured empty distance and usable depth. Leave uncalibrated channels distance-only.</p><form onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setFeedback(`${id}: Saving calibration…`);try{const r=await fetch(`/api/physical/calibration/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({emptyDistanceCm:Number(f.get('empty')),usableDepthCm:Number(f.get('depth'))})});const result=await r.json();if(!r.ok)throw Error(result.error??'Calibration could not be saved');setFeedback(`${id}: calibration saved. Fill will be calculated from subsequent readings.`);await refresh();}catch(err){setFeedback(`${id}: ${err instanceof Error?err.message:String(err)}`);}}}><label>Empty distance (cm)<input name="empty" aria-label={`${id} empty distance`} type="number" min="2" max="400" step="any" required defaultValue={b?.calibration?.emptyDistanceCm}/></label><label>Usable depth (cm)<input name="depth" aria-label={`${id} usable depth`} type="number" min="0.01" max="398" step="any" required defaultValue={b?.calibration?.usableDepthCm}/></label><button>Save {id} calibration</button><p role="status">{feedback.startsWith(id)?feedback:""}</p></form></details><ol aria-label={`${id} recent distance history`}>{b?.history.slice(-5).map((h,i)=><li key={i}>{new Date(h.receivedAt).toLocaleTimeString()} · {h.distanceCm!=null?`${h.distanceCm.toFixed(2)} cm`:h.status??'Unknown'}</li>)}</ol></>}
              {b?.history.some(h=>h.fillPercent!==null)&&<p className="small">Last usable history value: {([...b.history].filter(h=>h.fillPercent!==null).sort((a,b)=>Date.parse(a.receivedAt)-Date.parse(b.receivedAt)).at(-1)?.fillPercent)?.toFixed(0)}%. This does not establish that the current reading is valid.</p>}
              {b && b.history.length > 1 && b.history.some(h=>h.fillPercent!==null) && (
                <>
                  <h4>Recent physical fill history</h4>
                  <svg
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
                </>
              )}
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
              b.fillPercent >= 80 ||
              staleReading(b.receivedAt, now),
          )
          .map((b) => (
            <p key={b.id}>
              {b.id}:{" "}
              {status(
                b.fillPercent,
                undefined,
                !!error || staleReading(b.receivedAt, now),
              )}
            </p>
          ))}
        {!bins.length && (
          <p>
            No verified readings or sensor alerts. Hardware data is never
            populated from the municipal simulator.
          </p>
        )}
        <p className="small">
          Last successful API check: {checked ?? "None"} · Poll interval 1
          seconds · Local stale threshold 10 seconds; legacy threshold 90 seconds. Server receipt timestamps are
          authoritative.
        </p>
      </section>
      <section className="panel"><h3>Physical evidence</h3><p>Four sensor channels are user-reported as working. Only one demo bin exists. Electrical protection and per-channel calibration are not independently verified. Preserve the tested firmware and wiring; never apply 5V Echo directly to ESP32 GPIO.</p></section>
    </>
  );
}
