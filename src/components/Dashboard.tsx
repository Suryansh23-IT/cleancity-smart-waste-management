import { ReactNode, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Truck,
  Route,
  Play,
  Settings2,
  BarChart3,
  Search,
  Boxes,
  FlaskConical,
  Activity,
} from "lucide-react";
import { City, status } from "../core/model";
import { Plan, planCollection, truckZoneAssignments } from "../core/routing";
import { forecast } from "../core/forecast";
import { Simulation } from "../core/simulation";
import { operationProgress } from "../core/insights";
import { BinFilter, reviewBins, workspaceStatus } from "../core/workspace";
const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export default function Dashboard({
  city,
  plan,
  sim,
  map,
  filter,
  showReview,
  onReview,
  onInspect,
  onNavigate,
  onPlan,
  onStart,
  onDemo,
  storageError,
}: {
  city: City;
  plan: Plan | null;
  sim: Simulation | null;
  map: ReactNode;
  filter: BinFilter;
  showReview: boolean;
  onReview: (f: BinFilter) => void;
  onInspect: (id: string) => void;
  onNavigate: (page: string, target?: string) => void;
  onPlan: () => void;
  onStart: () => void;
  onDemo: () => void;
  storageError?: string;
}) {
  const s = workspaceStatus(city, plan, sim),
    p = plan ? operationProgress(city, plan, sim) : null,
    [query, setQuery] = useState("");
  const snapshot = city.showcaseSnapshot, awaitingSnapshot = !!city.showcase && !snapshot;
  const source = city.showcase ? snapshot?.mode === 'TEST' ? 'TEST fixture snapshot' : snapshot ? 'Captured physical inputs' : 'No snapshot captured' : 'Simulated municipal data';
  const original = sim?.original ?? city;
  const routine = useMemo(() => plan && !plan.pending.length && !awaitingSnapshot ? planCollection(original, false, true) : null, [original, plan, awaitingSnapshot]);
  const savings = routine && plan && !routine.pending.length ? routine.cost - plan.cost : null;
  const assignments = useMemo(() => truckZoneAssignments(city), [city]);
  const outlook = useMemo(() => {
    if(awaitingSnapshot)return null;
    const clock=(sim?.original ?? city).bins.reduce((latest,b)=>b.history.reduce((t,h)=>Math.max(t,h.time),latest),0)+(sim?.time??0)*60000;
    return city.bins.flatMap(b=>{if(b.fillPercent>=city.settings.pickupThreshold)return [];const f=forecast(b.history,city.settings.pickupThreshold,clock);return f.hours!==null&&f.hours>0&&Number.isFinite(f.hours)?[{bin:b,hours:f.hours,quality:f.quality}]:[];}).sort((a,b)=>a.hours-b.hours).slice(0,3);
  },[city,sim,awaitingSnapshot]);
  const stage=awaitingSnapshot?'Snapshot required':s.done?'Run complete':sim?.running?'Playback running':sim?'Playback paused':plan?.trips.length?(plan.pending.length?'Ready with exceptions':'Dispatch ready'):plan?'No trips scheduled':'Plan not prepared';
  const chooseFilter = (f: BinFilter) => {
    setQuery("");
    onReview(f);
  };
  const bins = reviewBins(city, plan, sim, filter, query);
  const primary = awaitingSnapshot ? {label:'Capture showcase snapshot',go:()=>onNavigate('Physical IoT Lab','iot-showcase')} : s.done
    ? {
        label: "Review collection results",
        go: () => onNavigate("Analytics & What-If"),
      }
    : sim
      ? {
          label: "Continue collection",
          go: () => onNavigate("Collection Simulator"),
        }
      : !city.bins.length
        ? { label: "Configure your city", go: () => onNavigate("City Studio") }
        : !city.zones.length
          ? {
              label: "Set up collection zones",
              go: () => onNavigate("Zone & Fleet Operations", "zone-setup"),
            }
          : !s.available.length
            ? {
                label: "Configure collection fleet",
                go: () => onNavigate("Zone & Fleet Operations", "fleet-setup"),
              }
            : !plan
              ? { label: "Plan collection", go: onPlan }
              : plan.trips.length
                ? { label: "Start simulation", go: onStart }
                : {
                    label: "Review pickup demand",
                    go: () =>
                      chooseFilter(plan.pending.length ? "PENDING" : "ALL"),
                  };
  const actions = [
    {
      name: "Configure city",
      detail: `${city.nodes.length} junctions · ${city.bins.length} bins`,
      done: !!city.bins.length,
      icon: Settings2,
      go: () => onNavigate("City Studio"),
    },
    {
      name: "Review urgent bins",
      detail: `${s.urgent.length} at or above ${city.settings.urgentThreshold}%`,
      icon: AlertTriangle,
      go: () => chooseFilter("URGENT"),
    },
    {
      name: "Generate zones",
      detail: city.zones.length
        ? `${city.zones.length} zones · ${s.assigned.size}/${city.bins.length} bins assigned`
        : "Choose heads: depots where collection trips start and return.",
      done: !!city.zones.length,
      icon: MapPin,
      go: () => onNavigate("Zone & Fleet Operations", "zone-setup"),
    },
    {
      name: "Configure fleet",
      detail: `${s.available.length}/${city.trucks.length} trucks available`,
      done: !!s.available.length,
      icon: Truck,
      go: () => onNavigate("Zone & Fleet Operations", "fleet-setup"),
    },
    {
      name: "Plan pickups",
      detail:
        s.planReason ??
        (plan
          ? `${plan.trips.length} trips · ${plan.pending.length} unserved`
          : "Use current fills, road directions and truck capacities."),
      disabled: awaitingSnapshot || !!s.planReason,
      done: !!plan,
      icon: Route,
      go: onPlan,
    },
    {
      name: sim ? "Open simulation" : "Start collection",
      detail: sim
        ? "Inspect progress, pause, step or reset the current run."
        : (s.startReason ??
          "Animate planned pickups; changes are simulated only."),
      disabled: awaitingSnapshot || (!sim && !!s.startReason),
      done: s.done,
      icon: Play,
      go: sim ? () => onNavigate("Collection Simulator") : onStart,
    },
    {
      name: "View results",
      detail: sim
        ? "Actual progress, unserved work and modeled operating costs."
        : "Run a simulation to produce collection results.",
      disabled: !sim,
      icon: BarChart3,
      go: () => onNavigate("Analytics & What-If"),
    },
  ];
  return (
    <div className="operations-dashboard">
      <section className="mission-banner">
        <div>
          <span className="eyebrow">COLLECTION OPERATIONS</span>
          <h2>{city.name}</h2>
          <p>
            {awaitingSnapshot?'Capture planning inputs before assessing the four mapped sensor bins.':`${s.eligible.length} bins currently meet the pickup threshold. ${s.available.length} of ${city.trucks.length} trucks available.`}
          </p>
          {plan && plan.pending.length > 0 && (
            <button
              className="inline-exception"
              onClick={() => chooseFilter("PENDING")}
            >
              {plan.pending.length} unserved pickup
              {plan.pending.length === 1 ? "" : "s"} · review before dispatch{" "}
              <ArrowRight size={13} />
            </button>
          )}
          <span className="simulation-label">
            {source} · Local workspace
          </span>
          {city.showcase && <small className="showcase-source-note">4 mapped sensor bins · 6 virtual bins · collection is simulated</small>}
        </div>
        <div className="mission-action">
          <small>COLLECTION STATUS</small>
          <strong>{stage}</strong>
          <button className="primary" onClick={primary.go}>
            {primary.label}
            <ArrowRight size={16} />
          </button>
          <button className="text-action" onClick={onDemo}>
            Open guided demo
          </button>
        </div>
      </section>
      {storageError && <p className="dashboard-storage-alert" role="alert"><AlertTriangle size={17}/>{storageError}</p>}
      <section className="dashboard-kpis" aria-label="Municipal situation">
        <button className="situation-kpi" onClick={() => chooseFilter("ALL")}>
          <small><Boxes size={15}/> Collection bins</small>
          <strong>
            {city.bins.length}
            <em> bins</em>
          </strong>
          <span>
            {awaitingSnapshot?'Demand awaits snapshot':`${s.normal} below threshold · ${s.eligible.length} require pickup`}
          </span>
          <b>Inspect bins →</b>
        </button>
        <button
          className="situation-kpi urgent-kpi"
          onClick={() => chooseFilter("URGENT")}
        >
          <small><AlertTriangle size={15}/> Urgent attention</small>
          <strong>
            {awaitingSnapshot?'—':s.urgent.length}
            {!awaitingSnapshot&&<em> bins</em>}
          </strong>
          <span>Fill ≥{city.settings.urgentThreshold}% · priority review</span>
          <b>Review urgent →</b>
        </button>
        <button
          className="situation-kpi"
          onClick={() => onNavigate("Zone & Fleet Operations", "zone-setup")}
        >
          <small><MapPin size={15}/> Zone coverage</small>
          <strong>
            {city.bins.length
              ? `${Math.round((s.assigned.size / city.bins.length) * 100)}%`
              : "—"}
          </strong>
          <span>
            {city.bins.length
              ? `${s.assigned.size}/${city.bins.length} assigned to ${city.zones.length} zones`
              : "Create a city to assign collection responsibility."}
          </span>
          <b>Inspect responsibilities →</b>
        </button>
        <button
          className="situation-kpi"
          onClick={() => onNavigate("Zone & Fleet Operations", "fleet-setup")}
        >
          <small><Truck size={15}/> Fleet availability</small>
          <strong>
            {s.available.length}
            <em> available</em>
          </strong>
          <span>
            {plan
              ? `${sim ? p?.trucks.filter((t) => !["AVAILABLE", "UNAVAILABLE", "COMPLETED", "PLANNED"].includes(t.state)).length : s.planned.size} ${sim ? sim.running ? "in operation" : "on active legs" : "scheduled"} · ${city.trucks.length - s.available.length} unavailable`
              : "No dispatch plan yet"}
          </span>
          <b>Manage trucks →</b>
        </button>
      </section>
      <div className="dashboard-workspace">
        <div className="dashboard-map-column">
          {map}
          <div className="plan-strip" aria-label="Modeled operating estimates">
            <div>
              <small>{sim?'Distance traveled':'Planned distance'}</small>
              <b>{plan ? `${(sim?p!.distance:plan.distance).toFixed(2)} km` : "—"}</b>
            </div>
            <div>
              <small>{sim?'Elapsed playback':'Planned fleet time'}</small>
              <b>
                {plan
                  ? `${(sim?.time??plan.duration).toFixed(1)} min`
                  : "—"}
              </b>
            </div>
            <div><small>Modeled plan cost</small><b>{plan?rupees.format(plan.cost):'—'}</b></div>
            <button onClick={()=>onNavigate('Analytics & What-If')}>
              <small>{savings!==null&&savings<0?'Extra cost vs full round':'Savings vs full round'}</small>
              <b>{!plan?'Plan needed':savings===null?'Not comparable':rupees.format(Math.abs(savings))} <ArrowRight size={12}/></b>
            </button>
          </div>
        </div>
        <section className="panel dashboard-brief" aria-label="Dispatch status">
          <span className="eyebrow">CURRENT OPERATION</span><h3>{stage}</h3>
          {p && plan ? <>
            <div className="dispatch-brief-counts"><div><strong>{p.completed}</strong><small>Completed</small></div><div><strong>{p.remaining}</strong><small>{sim?'Remaining':'Scheduled'}</small></div><div><strong>{p.pending}</strong><small>Unserved</small></div></div>
            {sim && <progress aria-label="Scheduled pickup progress" max={Math.max(1,p.completed+p.remaining)} value={p.completed}/>}
            <p>{plan.trips.length} planned trips{sim?' · virtual playback only':' · no simulation started'}</p>
          </> : <p>{awaitingSnapshot?'Snapshot capture unlocks planning.':'Plan collection to see scheduled and unserved pickups.'}</p>}
          {plan?.pending.length ? <button className="brief-exception" onClick={()=>chooseFilter('PENDING')}><AlertTriangle size={16}/> Inspect unserved pickups <ArrowRight size={14}/></button> : null}
          <nav aria-label="Dashboard shortcuts">
            <button onClick={()=>onNavigate('Zone & Fleet Operations')}><Route size={16}/> Open Dispatch <ArrowRight size={14}/></button>
            <button onClick={()=>onNavigate('City Studio')}><MapPin size={16}/> Open City Studio <ArrowRight size={14}/></button>
            <button onClick={()=>onNavigate('Physical IoT Lab')}><FlaskConical size={16}/> Open Physical IoT Lab <ArrowRight size={14}/></button>
          </nav>
        </section>
        <aside
          className="panel action-center"
          aria-label="Operator action center"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR COLLECTION WORKFLOW</span>
              <h3>Operator action center</h3>
            </div>
          </div>
          <ol>
            {actions.map((a, i) => (
              <li key={a.name}>
                <span className={a.done ? "step-icon complete" : "step-icon"}>
                  {a.done ? <CheckCircle2 size={18} /> : <a.icon size={18} />}
                </span>
                <div>
                  <button
                    aria-label={a.name}
                    disabled={a.disabled}
                    onClick={a.go}
                  >
                    {i + 1}. {a.name}
                    <ArrowRight size={13} />
                  </button>
                  <small>{a.detail}</small>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
      <div className="dashboard-bottom">
        <section
          className="panel attention-panel"
          aria-label="Operational attention"
        >
          <div className="section-heading">
            <h3>Needs attention</h3>
            <span className="pill">ACTUAL SCENARIO STATE</span>
          </div>
          {!city.bins.length && (
            <button onClick={() => onNavigate("City Studio")}>
              <Settings2 size={17} />
              <span>
                <b>No city inventory</b>
                <small>Create a city or load the guided demo.</small>
              </span>
              <ArrowRight size={15} />
            </button>
          )}
          {!city.zones.length && (
            <button
              onClick={() =>
                onNavigate("Zone & Fleet Operations", "zone-setup")
              }
            >
              <MapPin size={17} />
              <span>
                <b>Collection zones need setup</b>
                <small>Choose collection heads and assign bins.</small>
              </span>
              <ArrowRight size={15} />
            </button>
          )}
          {!s.available.length && (
            <button
              onClick={() =>
                onNavigate("Zone & Fleet Operations", "fleet-setup")
              }
            >
              <Truck size={17} />
              <span>
                <b>No available collection trucks</b>
                <small>Add a truck or change its availability.</small>
              </span>
              <ArrowRight size={15} />
            </button>
          )}
          {s.urgent.length > 0 && (
            <button onClick={() => chooseFilter("URGENT")}>
              <AlertTriangle size={17} />
              <span>
                <b>{s.urgent.length} urgent bins</b>
                <small>Review demand and collection responsibility.</small>
              </span>
              <ArrowRight size={15} />
            </button>
          )}
          {city.zones.length > 0 && s.assigned.size < city.bins.length && (
            <button onClick={() => chooseFilter("UNASSIGNED")}>
              <MapPin size={17} />
              <span>
                <b>{city.bins.length - s.assigned.size} unassigned bins</b>
                <small>
                  Inspect access nodes, then assign responsibility in City
                  Studio.
                </small>
              </span>
              <ArrowRight size={15} />
            </button>
          )}
          {plan && plan.pending.length > 0 && (
            <button onClick={() => chooseFilter("PENDING")}>
              <AlertTriangle size={17} />
              <span>
                <b>
                  {plan.pending.length} pickups cannot be served by this plan
                </b>
                <small>
                  See the actual capacity, assignment or reachability reason.
                </small>
              </span>
              <ArrowRight size={15} />
            </button>
          )}
          {s.done && p && p.remaining > 0 && (
            <button onClick={() => onNavigate("Collection Simulator")}>
              <AlertTriangle size={17} />
              <span>
                <b>{p.remaining} scheduled stops remain</b>
                <small>Inspect simulation progress.</small>
              </span>
              <ArrowRight size={15} />
            </button>
          )}
          {!awaitingSnapshot && city.bins.length > 0 &&
            city.zones.length > 0 &&
            s.available.length > 0 &&
            !s.urgent.length &&
            !plan?.pending.length &&
            s.assigned.size === city.bins.length && (
              <p className="positive-note">
                <CheckCircle2 size={18} /> No current configuration or
                urgent-bin alerts.
              </p>
            )}
        </section>
        <section className="panel dashboard-zones">
          <div className="section-heading">
            <h3>{sim ? "Collection results" : "Zone workload"}</h3>
            <button
              onClick={() =>
                onNavigate(
                  sim ? "Analytics & What-If" : "Zone & Fleet Operations",
                )
              }
            >
              {sim ? "Detailed results" : "Zone & fleet"}
              <ArrowRight size={14} />
            </button>
          </div>
          {sim && p && (
            <div className="result-preview">
                <b>{s.done ? "Run finished" : sim.running ? "Run in progress" : "Run paused"}</b>
              <p>
                {p.completed} collected · {p.remaining} scheduled remaining ·{" "}
                {p.pending} unserved
              </p>
              <p>
                {p.distance.toFixed(2)} km travelled · {sim.time.toFixed(1)}{" "}
                virtual minutes elapsed
              </p>
              <p>
                {plan?.duration
                  ? `${((p.trucks.reduce((a, t) => a + t.busyMinutes, 0) / ((plan?.duration ?? 1) * Math.max(1, s.available.length))) * 100).toFixed(1)}% scheduled available-fleet utilization`
                  : "No travel scheduled"}
              </p>
              <button onClick={() => chooseFilter("COLLECTED")}>
                Inspect collected bins
              </button>
            </div>
          )}
          {city.zones.length ? (
            <ul className="zone-summary">
              {city.zones.map((z) => (
                <li key={z.id}>
                  <span className="zone-dot" style={{ background: z.color }} />
                  <div>
                    <b>{z.name}</b>
                    <small>
                      {z.binIds.length} bins ·{" "}
                      {
                        city.trucks.filter(
                          (t) => t.available && assignments.get(t.id) === z.id,
                        ).length
                      }{" "}
                      available trucks
                    </small>
                  </div>
                  <strong>
                    {awaitingSnapshot?'—':(
                      city.bins.filter(
                        (b) =>
                          z.binIds.includes(b.id) &&
                          b.fillPercent >= city.settings.pickupThreshold,
                      ).length
                    )}
                    <small>need pickup</small>
                  </strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              Zone workloads appear after collection heads and responsibilities
              are configured.
            </p>
          )}
        </section>
        <section className="panel dashboard-outlook" aria-label="Fill outlook">
          <div className="section-heading"><h3><Activity size={18}/> Fill outlook</h3><button onClick={()=>onNavigate('Analytics & What-If')}>Forecast details <ArrowRight size={14}/></button></div>
          <p>Next expected pickup thresholds from modeled fill history.</p>
          {outlook?.length ? <ul>{outlook.map(({bin,hours,quality})=><li key={bin.id}><span><b>{bin.name}</b><small>{quality}</small></span><strong>~{hours.toFixed(1)} h</strong></li>)}</ul> : <p className="outlook-empty">{awaitingSnapshot?'Capture a snapshot first.':'No projected crossings from usable, growing fill history.'}</p>}
        </section>
      </div>
      {showReview && (
        <section
          className="panel bin-review"
          id="bin-review"
          tabIndex={-1}
          aria-label="Bin review"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">INSPECT BEFORE DISPATCH</span>
              <h3>Bin review · {bins.length} results</h3>
            </div>
            <button onClick={() => chooseFilter("ALL")}>Show all bins</button>
          </div>
          <div className="review-filters">
            <label>
              Filter bins
              <select
                value={filter}
                onChange={(e) => chooseFilter(e.target.value as BinFilter)}
              >
                {[
                  ["ALL", "All bins"],
                  ["URGENT", "Urgent"],
                  ["PICKUP", "Pickup required"],
                  ["UNASSIGNED", "Unassigned"],
                  ["PENDING", "Unserved by plan"],
                  ["COLLECTED", "Collected this run"],
                ].map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <Search size={14} /> Search bins
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or ID"
              />
            </label>
          </div>
          <div className="table-scroll review-table">
            <table>
              <thead>
                <tr>
                  <th>Bin</th>
                  <th>Fill / status</th>
                  <th>Responsibility</th>
                  <th>Collection / exception</th>
                  <th>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {bins.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <b>{b.name}</b>
                    </td>
                    <td>
                      {b.fillPercent.toFixed(0)}% ·{" "}
                      {status(b.fillPercent, city.settings)
                        .replaceAll("_", " ")
                        .toLowerCase()}
                    </td>
                    <td>
                      {city.zones.find((z) => z.binIds.includes(b.id))?.name ??
                        "Unassigned"}
                    </td>
                    <td>
                      {plan?.pending.find((p) => p.binId === b.id)?.reason ??
                        (sim?.completed.includes(b.id)
                          ? "Collected"
                          : plan?.trips.some((t) => t.binIds.includes(b.id))
                            ? "Scheduled"
                            : "Not scheduled")}
                    </td>
                    <td>
                      <button
                        onClick={() => onInspect(b.id)}
                        aria-label={`Inspect ${b.name}`}
                      >
                        Locate on map
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!bins.length && (
              <p>
                No bins match this filter. Try All bins or clear the search.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
