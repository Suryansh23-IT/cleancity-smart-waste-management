import { useEffect, useRef, useState } from "react";
import { Radio, RefreshCw, AlertTriangle } from "lucide-react";
import { status } from "../core/model";
import { PhysicalBin, parsePhysical, staleReading } from "../core/physical";
export default function PhysicalLab() {
  const [bins, setBins] = useState<PhysicalBin[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [checked, setChecked] = useState<string | null>(null),
    [now, setNow] = useState(Date.now());
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
            ? "Cloud is not configured. No verified telemetry is available."
            : `Physical API unavailable (${response.status}). No verified data.`,
        );
      if (
        !response.headers
          .get("content-type")
          ?.toLowerCase()
          .includes("application/json")
      )
        throw Error(
          "Physical cloud endpoint is unavailable. No verified telemetry is available.",
        );
      const data = await response.json();
      if (signal?.aborted || version !== requestVersion.current) return;
      setBins(parsePhysical(data));
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
    }, 30000);
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
          <p>ESP32 → HTTPS ingestion → Supabase → read-only dashboard</p>
        </div>
        <span className="pill">
          {error
            ? "NO VERIFIED DATA"
            : bins.length
              ? "PHYSICAL TELEMETRY"
              : "NO VERIFIED DATA"}
        </span>
        <button disabled={loading} onClick={() => refresh()}>
          <RefreshCw size={16} />
          {loading ? "Checking…" : "Refresh"}
        </button>
      </section>
      {error && (
        <div className="warning-list">
          <AlertTriangle size={18} /> {error} Last successfully fetched
          readings, if any, are retained below and marked stale.
        </div>
      )}
      <div className="physical-grid">
        {[1, 2, 3, 4].map((i) => {
          const id = `BIN-${String(i).padStart(3, "0")}`,
            b = bins.find((b) => b.id === id),
            stale = !!error || staleReading(b?.receivedAt ?? null, now),
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
                <span className="pill">{stale ? "OFFLINE" : "ONLINE"}</span>
              </div>
              <div
                className="gauge"
                style={{
                  background: `conic-gradient(${stale ? "#50606a" : color} ${(b?.fillPercent ?? 0) * 3.6}deg, #24313c 0deg)`,
                }}
              >
                <div>
                  <strong>
                    {b?.fillPercent === null || b?.fillPercent === undefined
                      ? "—"
                      : Math.round(b.fillPercent) + "%"}
                  </strong>
                  <small>{b?.receivedAt ? s : "NO VERIFIED DATA"}</small>
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
                <dd>PHYSICAL</dd>
                <dt>Device</dt>
                <dd>{b?.deviceId ?? "Not configured"}</dd>
              </dl>
              {b && b.history.length > 1 && (
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
          Last successful API check: {checked ?? "None"} · Poll interval 30
          seconds · Offline threshold 90 seconds. Server receipt timestamps are
          authoritative.
        </p>
      </section>
      <section className="panel">
        <span className="eyebrow">NEXT MANAGEABLE HARDWARE ACTION</span>
        <h3>Verify one sensor before expanding.</h3>
        <p>
          Hardware debugging is paused pending experienced assistance. When
          testing resumes, Vishal and the helper should identify the exact board
          and power path, measure the resistor values, and have a technician
          check one sensor’s level-shifted Echo circuit before powering it. Then
          record ruler/empty/partial/full/no-echo tests. Do not rewire with
          power connected. No GPIO mapping or circuit approval is implied by
          this dashboard.
        </p>
        <p className="small">
          ESP32 detection/upload/serial success is user-reported. HC-SR04
          operation and live device → database → dashboard integration remain
          unverified.
        </p>
      </section>
    </>
  );
}
