import { City } from "../core/model";
import { Plan, comparablePlans } from "../core/routing";
import { Simulation } from "../core/simulation";
import { operationProgress, zoneWorkloads } from "../core/insights";
import { forecast } from "../core/forecast";

export function RunProgress({
  city,
  plan,
  sim,
}: {
  city: City;
  plan: Plan;
  sim: Simulation | null;
}) {
  const p = operationProgress(city, plan, sim);
  return (
    <section className="panel run-progress" aria-label="Collection progress">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SIMULATED OPERATIONS · VIRTUAL PROGRESS</span>
          <h3>
            {p.done
              ? "Collection cycle complete"
              : sim?.running
                ? "Collection in motion"
                : sim
                  ? "Collection paused"
                  : "Dispatch overview"}
          </h3>
        </div>
        <span className="pill">
          {p.pending
            ? `${p.pending} pending · incomplete coverage`
            : p.done
              ? "ALL PLANNED STOPS COMPLETE"
              : "DIRECTED ROAD NETWORK"}
        </span>
      </div>
      <div className="progress-kpis">
        <div>
          <small>Distance travelled</small>
          <strong>
            {p.distance.toFixed(2)} <em>/ {p.plannedDistance.toFixed(2)} km</em>
          </strong>
        </div>
        <div>
          <small>Pickups complete</small>
          <strong>
            {p.completed} <em>collected</em>
          </strong>
        </div>
        <div>
          <small>Remaining stops</small>
          <strong>
            {p.remaining} <em>scheduled · {p.pending} pending</em>
          </strong>
        </div>
        <div>
          <small>Virtual clock</small>
          <strong>
            {p.time.toFixed(1)} <em>/ {plan.duration.toFixed(1)} min</em>
          </strong>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Vehicle / state</th>
              <th>Pickup progress</th>
              <th>Distance travelled / planned</th>
              <th>Load / capacity</th>
              <th>Trips</th>
              <th>Position on road</th>
              <th>Next pickup</th>
              <th>Scheduled utilization</th>
            </tr>
          </thead>
          <tbody>
            {p.trucks.map((t) => (
              <tr key={t.id}>
                <td>
                  <b>{t.label}</b>
                  <small>{t.state}</small>
                </td>
                <td>
                  {t.completed}/{t.stops}
                  <progress
                    aria-label={`${t.label} pickup progress`}
                    max={t.stops || 1}
                    value={t.completed}
                  />
                </td>
                <td>
                  {t.distance.toFixed(2)} / {t.plannedDistance.toFixed(2)} km
                </td>
                <td>
                  {t.load.toFixed(2)} / {t.capacity} units
                </td>
                <td>{t.trips}</td>
                <td>
                  {t.from
                    ? `${city.nodes.find(n=>n.id===t.from)?.label??t.from} → ${city.nodes.find(n=>n.id===t.to)?.label??t.to} · ${Math.round(t.fraction * 100)}%`
                    : "Not dispatched"}
                </td>
                <td>{city.bins.find(b=>b.id===t.nextBinId)?.name??(t.state==='RETURNING'?'Returning to depot':t.state==='UNLOADING'?'Unloading at depot':'—')}</td>
                <td>{t.utilization.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small">
        Utilization = scheduled vehicle minutes / fleet completion time, per
        truck. Distance accumulates only on travelled road segments. A completed
        pickup requires its service interval to finish; pending bins remain
        uncollected.
      </p>
    </section>
  );
}
export function ZoneWorkload({
  city,
  plan,
}: {
  city: City;
  plan: Plan | null;
}) {
  const zones = zoneWorkloads(city, plan),
    assigned = new Set(city.zones.flatMap((z) => z.binIds)),
    unassigned = city.bins.filter((b) => !assigned.has(b.id));
  return (
    <section className="panel" aria-label="Zone workload">
      <span className="eyebrow">RESPONSIBILITY & DEMAND</span>
      <h3>Neighbourhood workload</h3>
      <p className="small">Demand and pickup load reflect the collection inputs. See simulation progress for completed pickups.</p>
      {zones.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Zone</th>
                <th>Bins</th>
                <th>Normal / collection / urgent</th>
                <th>Pickup load</th>
                <th>Planned trips</th>
                <th>Road distance</th>
                <th>Vehicle time</th>
                <th>Pending</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id}>
                  <td>
                    <i className="zone-dot" style={{ background: z.color }} />
                    {z.name}
                  </td>
                  <td>{z.bins}</td>
                  <td>
                    {z.normal} / {z.collection} / {z.urgent}
                  </td>
                  <td>{z.load.toFixed(2)} units</td>
                  <td>{plan ? z.trips : "—"}</td>
                  <td>{plan ? `${z.distance.toFixed(2)} km` : "—"}</td>
                  <td>{plan ? `${z.minutes.toFixed(1)} min` : "—"}</td>
                  <td>{plan ? z.pending : "Not planned"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Generate zones to review graph-based responsibilities and demand.</p>
      )}
      {unassigned.length > 0 && (
        <p className="warning-text">
          {unassigned.length} unassigned bins (
          {
            unassigned.filter(
              (b) => b.fillPercent >= city.settings.pickupThreshold,
            ).length
          }{" "}
          eligible). Choose reachable municipal heads or reassign bins.
          Generating a zone does not invent missing return roads.
        </p>
      )}
      <p className="small">
        Current demand uses calibrated simulation units, not measured waste
        mass. During collection demand decreases; the trip plan remains the
        original dispatch snapshot.
      </p>
    </section>
  );
}
export function Forecasts({
  city,
  sim,
}: {
  city: City;
  sim: Simulation | null;
}) {
  const now =
    Math.max(0, ...city.bins.flatMap((b) => b.history.map((h) => h.time))) +
    (sim ? sim.time * 60000 : 0);
  // Use scenario-origin time during playback, since completed readings already include the offset.
  const clock = sim
    ? Math.max(
        0,
        ...sim.original.bins.flatMap((b) => b.history.map((h) => h.time)),
      ) +
      sim.time * 60000
    : now;
  const horizon = (f: ReturnType<typeof forecast>) =>
    f.hours === null
      ? "No estimate"
      : f.hours === 0
        ? "Reached"
        : `~${f.hours.toFixed(1)} h`;
  return (
    <section className="panel" id="fill-forecasts" aria-label="Fill forecasts">
      <span className="eyebrow">RULE-BASED · RECENT AVERAGE GROWTH</span>
      <h3>Time to collection and urgent thresholds</h3>
      <div className="table-scroll forecast-table">
        <table>
          <thead>
            <tr>
              <th>Bin</th>
              <th>Current fill</th>
              <th>Growth</th>
              <th>Pickup ≥{city.settings.pickupThreshold}%</th>
              <th>Urgent ≥{city.settings.urgentThreshold}%</th>
              <th>History quality</th>
            </tr>
          </thead>
          <tbody>
            {city.bins.map((b) => {
              const a = forecast(
                  b.history,
                  city.settings.pickupThreshold,
                  clock,
                ),
                u = forecast(b.history, city.settings.urgentThreshold, clock);
              return (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{b.fillPercent}%</td>
                  <td>{a.rate === null ? "—" : `${a.rate.toFixed(1)} pp/h`}</td>
                  <td>{horizon(a)}</td>
                  <td>{horizon(u)}</td>
                  <td>{a.quality}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!city.bins.length && <p>Add bins to see forecast horizons.</p>}
      <p className="small">
        Uses 4–5 unique valid samples after the latest decrease. “pp/h” means
        percentage points per virtual hour. No growth means no finite arrival
        estimate. History older than 3 virtual hours is stale. These are
        synthetic scenario estimates, not trained ML or validated physical
        predictions.
      </p>
    </section>
  );
}
export function ComparisonDetails({
  plan,
  baseline,
}: {
  plan: Plan;
  baseline: Plan;
}) {
  const comparable = comparablePlans(plan, baseline),
    delta = baseline.duration - plan.duration;
  return (
    <div className="table-scroll">
      <table aria-label="Operational comparison">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Fixed-order baseline</th>
            <th>Urgency / nearest heuristic</th>
            <th>Reduction</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Road distance (km)", baseline.distance, plan.distance],
            ["Fleet completion (min)", baseline.duration, plan.duration],
            ["Vehicle labor (min)", baseline.laborMinutes, plan.laborMinutes],
            ["Operating + labor cost (INR)", baseline.cost, plan.cost],
          ].map(([label, b, a]) => (
            <tr key={String(label)}>
              <td>{label}</td>
              <td>{Number(b).toFixed(2)}</td>
              <td>{Number(a).toFixed(2)}</td>
              <td>
                {comparable
                  ? (Number(b) - Number(a)).toFixed(2)
                  : "Not comparable"}
              </td>
            </tr>
          ))}
          <tr>
            <td>Trips / pending bins</td>
            <td>
              {baseline.trips.length} / {baseline.pending.length}
            </td>
            <td>
              {plan.trips.length} / {plan.pending.length}
            </td>
            <td>Capacity constrained</td>
          </tr>
        </tbody>
      </table>
      <p className="small">
        {comparable
          ? delta < 0
            ? "The heuristic takes longer than the baseline in this scenario."
            : "Positive reductions indicate lower modeled requirements; zero and negative results are retained."
          : "Different pickup coverage: no savings claim is made."}{" "}
        Fleet completion is elapsed time; vehicle labor sums all truck time.
        Each leg uses a shortest legal road distance within its zone. Pickup order
        prioritizes urgency and nearby feasible stops. The full schedule can be
        longer than another feasible schedule.
      </p>
    </div>
  );
}
