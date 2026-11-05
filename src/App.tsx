import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Boxes,
  Check,
  ChevronRight,
  CircleHelp,
  Copy,
  FlaskConical,
  GitBranch,
  LayoutDashboard,
  Map,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Route,
  Save,
  Settings2,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Trash2,
  Truck,
  Undo2,
  Redo2,
} from "lucide-react";
import {
  City,
  clone,
  uid,
  validateCity,
  parseCity,
  status,
} from "./core/model";
import { preset, blankCity, randomize, infeasiblePreset } from "./core/presets";
import { autoZone, relocateBin, validateZoneTrips } from "./core/zoning";
import { Plan, planCollection, comparablePlans } from "./core/routing";
import {
  Simulation,
  startSimulation,
  advance,
  tripState,
  currentTrip,
} from "./core/simulation";
import { forecast } from "./core/forecast";
import { loadLibrary, saveLibrary } from "./core/storage";
import { pathFinder } from "./core/graph";
import CityCanvas, { Selection } from "./components/CityCanvas";
import Inspector from "./components/Inspector";
import PhysicalLab from "./components/PhysicalLab";
import StudioTools from "./components/StudioTools";
import { routingGraphChanged, operationalChanged } from "./core/studio";
import {
  RunProgress,
  ZoneWorkload,
  Forecasts,
  ComparisonDetails,
} from "./components/OperationsInsights";

const pages = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Physical IoT Lab", icon: FlaskConical },
  { name: "City Studio", icon: Map },
  { name: "Zone & Fleet Operations", icon: Boxes },
  { name: "Collection Simulator", icon: Truck },
  { name: "Analytics & What-If", icon: BarChart3 },
];
const money = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
const fixed = (n: number) => n.toFixed(2);
export default function App() {
  const [initial] = useState(() => {
    try {
      const list = loadLibrary(localStorage);
      return { list, city: list[0] ?? preset(100), error: "" };
    } catch {
      return {
        list: [] as City[],
        city: preset(100),
        error:
          "Saved data could not be loaded. It has not been overwritten; export/recover browser storage before saving.",
      };
    }
  });
  const [city, setCity] = useState<City>(initial.city),
    [library, setLibrary] = useState(initial.list),
    [page, setPage] = useState("Overview"),
    [selection, setSelection] = useState<Selection | null>(null),
    [heads, setHeads] = useState<string[]>([]),
    [plan, setPlan] = useState<Plan | null>(null),
    [baseline, setBaseline] = useState<Plan | null>(null),
    [sim, setSim] = useState<Simulation | null>(null),
    [speed, setSpeed] = useState(10),
    [notice, setNotice] = useState(initial.error),
    [warnings, setWarnings] = useState<string[]>([]),
    [dirty, setDirty] = useState(false),
    [past, setPast] = useState<City[]>([]),
    [future, setFuture] = useState<City[]>([]),
    [dialog, setDialog] = useState<{
      message: string;
      action: () => void;
    } | null>(null),
    [showSettings, setShowSettings] = useState(false);
  const stateRef = useRef({ city, sim });
  stateRef.current = { city, sim };
  const importRef = useRef<HTMLInputElement>(null);
  const notify = (message: string) => setNotice(message);
  const guard = (action: () => void) => {
    try {
      action();
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e));
    }
  };
  const confirm = (message: string, action: () => void) =>
    setDialog({ message, action });
  const invalidate = () => {
    setPlan(null);
    setBaseline(null);
    setSim(null);
  };
  function change(next: City, graph = false): boolean {
    try {
      if (page === "Overview" || page === "Collection Simulator")
        throw Error(
          "City View is read-only. Switch to Edit map or operations to make changes.",
        );
      for (const r of next.roads) {
        if (
          !city.roads.some(
            (old) =>
              old.id === r.id &&
              old.fromNodeId === r.fromNodeId &&
              old.toNodeId === r.toNodeId,
          ) &&
          next.roads.some(
            (other) =>
              other.id !== r.id &&
              other.fromNodeId === r.fromNodeId &&
              other.toNodeId === r.toNodeId,
          )
        )
          throw Error(
            "This directed road already exists. Edit its existing weight or direction.",
          );
      }
      if (sim)
        throw Error("Reset the collection run before editing its scenario.");
      graph = graph && routingGraphChanged(city, next);
      const c = graph
        ? {
            ...next,
            zones: [],
            trucks: next.trucks.map((t) => ({ ...t, zoneId: undefined })),
          }
        : next;
      const errors = validateCity(c);
      if (errors.length) throw Error(errors.join("; "));
      validateZoneTrips(c);
      setPast((p) => [...p, clone(city)].slice(-30));
      setFuture([]);
      setCity(c);
      setDirty(true);
      if (operationalChanged(city, c)) invalidate();
      setWarnings(
        graph
          ? ["Road graph changed. Generate zones again before planning."]
          : [],
      );
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
      return false;
    }
  }
  function load(c: City) {
    const apply = () => {
      setCity(clone(c));
      setHeads([]);
      setPast([]);
      setFuture([]);
      invalidate();
      setSelection(null);
      setWarnings([]);
      setDirty(!library.some((x) => x.id === c.id));
      notify(`${c.name} loaded`);
    };
    if (dirty || sim)
      confirm(
        "Load another scenario? Export or save changes first. Any active collection run will be discarded.",
        apply,
      );
    else apply();
  }
  function save() {
    guard(() => {
      if (initial.error)
        throw Error(
          "Saved data is unreadable. Export your open city and recover the existing browser storage before saving.",
        );
      const list = [city, ...library.filter((c) => c.id !== city.id)];
      saveLibrary(localStorage, list);
      setLibrary(clone(list));
      setDirty(false);
      notify("Scenario saved in this browser");
    });
  }
  function generate() {
    guard(() => {
      if (sim) throw Error("Reset collection before regenerating zones");
      const result = autoZone(city, heads);
      if (
        !change({
          ...city,
          zones: result.zones,
          trucks: city.trucks.map((t) => ({ ...t, zoneId: undefined })),
        })
      )
        return;
      setWarnings(result.warnings);
      notify(
        `Generated ${result.zones.length} zones · ${result.warnings.length} feasibility warnings`,
      );
    });
  }
  function optimize() {
    guard(() => {
      if (sim) throw Error("Reset collection before replanning");
      if (!city.zones.length) throw Error("Generate zones before optimizing");
      const p = planCollection(city),
        b = planCollection(city, true);
      setPlan(p);
      setBaseline(b);
      setWarnings(
        p.pending.map(
          (p) =>
            `${city.bins.find((b) => b.id === p.binId)?.name}: ${p.reason}`,
        ),
      );
      notify(
        `${p.trips.length} trips planned · ${p.pending.length} pending bins`,
      );
    });
  }
  function resetSim() {
    if (sim) {
      setCity(clone(sim.original));
      setSim(null);
      setDirty(true);
      notify("Collection reset to its original scenario");
    }
  }
  function step(minutes = 1) {
    const current = stateRef.current;
    if (!current.sim) return;
    const result = advance(current.city, current.sim, minutes);
    stateRef.current = { city: result.city, sim: result.simulation };
    setCity(result.city);
    setSim(result.simulation);
    setDirty(true);
  }
  useEffect(() => {
    if (!sim?.running) return;
    const timer = setInterval(() => step(speed / 4), 250);
    return () => clearInterval(timer);
  }, [sim?.running, speed]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 8000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  useEffect(() => {
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = document.querySelector<HTMLElement>(".modal");
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setDialog(null);
      }
      if (e.key === "Tab" && modal) {
        const buttons = [
          ...modal.querySelectorAll<HTMLButtonElement>("button"),
        ];
        const first = buttons[0],
          last = buttons.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("keydown", keys);
      previous?.focus();
    };
  }, [dialog]);
  const eligible = city.bins.filter(
      (b) => b.fillPercent >= city.settings.pickupThreshold,
    ),
    urgent = city.bins.filter(
      (b) => b.fillPercent >= city.settings.urgentThreshold,
    ),
    avg = city.bins.length
      ? city.bins.reduce((a, b) => a + b.fillPercent, 0) / city.bins.length
      : 0;
  const move = (
    kind: "node" | "bin",
    id: string,
    p: { x: number; y: number },
  ) => {
    if (kind === "node")
      change({
        ...city,
        nodes: city.nodes.map((n) => (n.id === id ? { ...n, ...p } : n)),
      });
    else {
      change({
        ...city,
        bins: city.bins.map((b) => (b.id === id ? { ...b, position: p } : b)),
      });
    }
  };
  const addNode = (p = { x: city.width / 2, y: city.height / 2 }) => {
    if (sim) {
      notify("Reset the collection run before editing its scenario.");
      return;
    }
    const id = uid("node");
    change(
      {
        ...city,
        nodes: [
          ...city.nodes,
          {
            id,
            label: `Junction ${city.nodes.length + 1}`,
            ...p,
            type: "INTERSECTION",
          },
        ],
      },
      true,
    );
    setSelection({ kind: "node", id });
    setPage("City Studio");
  };
  const undo = (redo = false) => {
    if (sim) {
      notify("Reset collection before undo/redo");
      return;
    }
    const stack = redo ? future : past;
    if (!stack.length) return;
    const target = stack.at(-1)!;
    if (redo) {
      setFuture(stack.slice(0, -1));
      setPast([...past, city]);
    } else {
      setPast(stack.slice(0, -1));
      setFuture([...future, city]);
    }
    setCity(clone(target));
    invalidate();
    setDirty(true);
    setSelection(null);
  };
  const exportCity = () => {
    const blob = new Blob([JSON.stringify(city, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `${city.name.replace(/[^\w-]/g, "-")}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Scenario exported");
  };
  const physical = page === "Physical IoT Lab",
    isStudio = page === "City Studio",
    isOps = page === "Zone & Fleet Operations",
    isSim = page === "Collection Simulator",
    isAnalytics = page === "Analytics & What-If";
  return (
    <div
      className={`app ${physical ? "lab-theme" : ""} ${page === "City Studio" ? "studio-workspace" : ""}`}
    >
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("Overview");
          }}
        >
          <span className="brand-icon">
            <GitBranch size={24} />
          </span>
          <span>
            Clean<span className="accent">City</span>
            <small>MUNICIPAL INTELLIGENCE</small>
          </span>
        </a>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {pages.map((p) => (
            <button
              key={p.name}
              aria-label={p.name}
              className={page === p.name ? "active" : ""}
              onClick={() => {
                setPage(p.name);
                setSelection(null);
              }}
            >
              <p.icon size={19} />
              <span>{p.name}</span>
              {p.name === "Physical IoT Lab" && <i className="offline-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={22} />
          <b>Built for better cities.</b>
          <p>
            Real observations.
            <br />
            Transparent simulations.
          </p>
          <span className="pill">ACADEMIC DEMONSTRATION</span>
        </div>
        <div className="profile">
          <span>CC</span>
          <div>
            <b>CleanCity Operations</b>
            <small>Local workspace · no login</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            Workspace <ChevronRight size={14} /> <b>{page}</b>
          </div>
          <div>
            <span className={`connection ${physical ? "" : "virtual"}`}>
              <i />
              {physical ? "Live data only" : "Simulator available offline"}
            </span>
            <button
              aria-label="Show workspace settings"
              disabled={physical}
              onClick={() => setShowSettings((s) => !s)}
            >
              <Settings2 size={18} />
            </button>
            <button
              aria-label="Show help"
              onClick={() =>
                notify(
                  "Choose a city, select K distinct head nodes, generate zones, randomize fills, optimize and start collection. Studio edits invalidate plans.",
                )
              }
            >
              <CircleHelp size={18} />
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {physical
                  ? "OBSERVE THE REAL WORLD"
                  : "PLAN. SIMULATE. MAKE AN IMPACT."}
              </span>
              <h1>{page === "Overview" ? "A cleaner city, in view." : page}</h1>
              <p>
                {physical
                  ? "Four physical bins. Verified telemetry. An honest view of connectivity."
                  : page === "Overview"
                    ? "Your municipal network, connected insights and smarter collection decisions."
                    : isStudio
                      ? "Design your road network. Every connection makes a difference."
                      : isOps
                        ? "Define responsibilities, assign resources and build feasible collection plans."
                        : isSim
                          ? "Watch your collection plan unfold along actual directed roads."
                          : "Explore transparent estimates. Change assumptions, then recalculate."}
              </p>
            </div>
            <div className="heading-actions">
              {!physical && (
                <>
                  <button onClick={save}>
                    <Save size={16} /> Save scenario
                    {dirty && <i className="unsaved-dot" />}
                  </button>
                  <button
                    className="primary"
                    onClick={() => {
                      setPage("Zone & Fleet Operations");
                      if (city.zones.length) optimize();
                    }}
                  >
                    <Route size={16} /> Plan collection
                  </button>
                </>
              )}
            </div>
          </div>
          {physical ? (
            <PhysicalLab />
          ) : (
            <>
              <div className="stats">
                <Metric
                  label="SIMULATED BINS"
                  value={city.bins.length.toString()}
                  detail={`${city.nodes.length} road nodes in ${city.name}`}
                  icon={<Boxes />}
                />
                <Metric
                  label="COLLECTION NEEDED"
                  value={eligible.length.toString()}
                  detail={`${urgent.length} urgent · threshold ${city.settings.pickupThreshold}%`}
                  icon={<Activity />}
                  warning
                />
                <Metric
                  label="AVERAGE FILL"
                  value={`${Math.round(avg)}%`}
                  detail="Current simulated bin levels"
                  icon={<BarChart3 />}
                />
                <Metric
                  label="PLANNED DISTANCE"
                  value={plan ? `${fixed(plan.distance)} km` : "—"}
                  detail={
                    plan
                      ? `${plan.trips.length} trips · ${plan.pending.length} pending`
                      : "Generate zones, then optimize"
                  }
                  icon={<Route />}
                />
              </div>
              {isStudio && (
                <StudioTools
                  city={city}
                  change={change}
                  confirm={confirm}
                  load={(c) => load({ ...c, id: uid("city") })}
                />
              )}
              <section className="scenario-bar">
                <div className="scenario-title">
                  <span className="mini-icon">
                    <Map size={19} />
                  </span>
                  <div>
                    <b>{city.name}</b>
                    <small>
                      {city.bins.length} bins · {city.zones.length} zones ·{" "}
                      {city.trucks.length} trucks{" "}
                      {dirty ? "· Unsaved changes" : ""}
                    </small>
                  </div>
                </div>
                <label className="sr-only" htmlFor="preset">
                  Load preset
                </label>
                <select
                  id="preset"
                  value=""
                  onChange={(e) => {
                    if (e.target.value)
                      load(
                        e.target.value === "bad"
                          ? infeasiblePreset()
                          : preset(Number(e.target.value)),
                      );
                  }}
                >
                  <option value="">Choose city preset</option>
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} bins · {n <= 20 ? "Riverton" : "Newhaven"}
                    </option>
                  ))}
                  <option value="bad">Infeasible test district</option>
                </select>
                <button
                  onClick={() => {
                    const c = blankCity();
                    c.id = uid("city");
                    load(c);
                    setPage("City Studio");
                  }}
                >
                  <Plus size={15} /> New city
                </button>
                <button
                  aria-label="Duplicate city"
                  title="Duplicate city"
                  onClick={() => {
                    const c = clone(city);
                    c.id = uid("city");
                    c.name += " copy";
                    load(c);
                  }}
                >
                  <Copy size={16} />
                </button>
                <button
                  aria-label="Export scenario"
                  title="Export scenario"
                  onClick={exportCity}
                >
                  <ArrowDownToLine size={16} />
                </button>
                <button
                  aria-label="Import scenario"
                  title="Import validated JSON"
                  onClick={() => importRef.current?.click()}
                >
                  <ArrowUpFromLine size={16} />
                </button>
                <input
                  ref={importRef}
                  hidden
                  type="file"
                  accept=".json,application/json"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 2_000_000) {
                      notify("File exceeds 2 MB");
                      return;
                    }
                    try {
                      const c = parseCity(await f.text());
                      c.id = uid("city");
                      load(c);
                    } catch (err) {
                      notify(String(err));
                    }
                    e.target.value = "";
                  }}
                />
                <button
                  disabled={!isStudio}
                  aria-label="Reset scenario"
                  title="Reset to original preset / blank"
                  onClick={() =>
                    confirm(
                      "Reset the city to its original preset (or empty city)? Unsaved changes and active collection will be discarded.",
                      () => {
                        const c = city.preset
                          ? preset(city.preset)
                          : blankCity();
                        c.id = city.id;
                        setCity(c);
                        setHeads([]);
                        setSelection(null);
                        setPast([]);
                        setFuture([]);
                        invalidate();
                        setWarnings([]);
                        setDirty(true);
                      },
                    )
                  }
                >
                  <RotateCcw size={16} />
                </button>
              </section>
              {library.length > 0 && (
                <div className="saved-list">
                  <span>Saved in this browser</span>
                  {library.map((c) => (
                    <div key={c.id}>
                      <button onClick={() => load(c)}>{c.name}</button>
                      <button
                        aria-label={`Delete saved ${c.name}`}
                        onClick={() =>
                          confirm(
                            `Delete saved city “${c.name}” from this browser? The current open city is retained.`,
                            () =>
                              guard(() => {
                                const list = library.filter(
                                  (x) => x.id !== c.id,
                                );
                                saveLibrary(localStorage, list);
                                setLibrary(list);
                              }),
                          )
                        }
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {showSettings && (
                <section className="panel">
                  <div className="section-heading">
                    <h3>Scenario assumptions</h3>
                    <button onClick={() => setShowSettings(false)}>
                      Close
                    </button>
                  </div>
                  <form
                    className="settings-form"
                    key={JSON.stringify(city.settings) + city.name}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget),
                        num = (s: string) => Number(f.get(s));
                      change({
                        ...city,
                        name: String(f.get("name")),
                        description: String(f.get("description")),
                        settings: {
                          ...city.settings,
                          pickupThreshold: num("pickup"),
                          urgentThreshold: num("urgent"),
                          costPerKmINR: num("km"),
                          costPerHourINR: num("hour"),
                          serviceMinutes: num("service"),
                          unloadingMinutes: num("unload"),
                          speeds: city.settings.speeds.map((_, i) =>
                            num(`speed${i}`),
                          ),
                        },
                      });
                    }}
                  >
                    <label>
                      City name
                      <input name="name" defaultValue={city.name} required />
                    </label>
                    <label>
                      Description
                      <input
                        name="description"
                        defaultValue={city.description}
                      />
                    </label>
                    {[
                      [
                        "pickup",
                        "Pickup threshold %",
                        city.settings.pickupThreshold,
                      ],
                      [
                        "urgent",
                        "Urgent threshold %",
                        city.settings.urgentThreshold,
                      ],
                      ["km", "Operating cost ₹/km", city.settings.costPerKmINR],
                      [
                        "hour",
                        "Labor cost ₹/hour",
                        city.settings.costPerHourINR,
                      ],
                      [
                        "service",
                        "Pickup service minutes",
                        city.settings.serviceMinutes,
                      ],
                      [
                        "unload",
                        "Unload minutes / trip",
                        city.settings.unloadingMinutes,
                      ],
                      ...city.settings.speeds.map((s, i) => [
                        `speed${i}`,
                        `Speed grade ${i + 1} km/h`,
                        s,
                      ]),
                    ].map(([key, label, value]) => (
                      <label key={key}>
                        {label}
                        <input
                          name={String(key)}
                          type="number"
                          min="0"
                          step="any"
                          defaultValue={value}
                          required
                        />
                      </label>
                    ))}
                    <button className="primary">Apply assumptions</button>
                  </form>
                </section>
              )}
              {isOps && (
                <section className="operations-toolbar panel">
                  <div>
                    <span className="eyebrow">01 / DEFINE YOUR ZONES</span>
                    <h3>Give every neighbourhood a head start.</h3>
                  </div>
                  <label>
                    Zones (K)
                    <select
                      value={city.settings.zoneCount}
                      onChange={(e) => {
                        change({
                          ...city,
                          settings: {
                            ...city.settings,
                            zoneCount: Number(e.target.value),
                          },
                          zones: [],
                          trucks: city.trucks.map((t) => ({
                            ...t,
                            zoneId: undefined,
                          })),
                        });
                        setHeads([]);
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <option key={i}>{i}</option>
                      ))}
                    </select>
                  </label>
                  <fieldset>
                    <legend>
                      Choose {city.settings.zoneCount} municipal heads
                    </legend>
                    {city.nodes
                      .filter((n) => n.type === "HEAD")
                      .map((n) => (
                        <label className="head-choice" key={n.id}>
                          <input
                            type="checkbox"
                            checked={heads.includes(n.id)}
                            onChange={(e) =>
                              setHeads(
                                e.target.checked
                                  ? [...heads, n.id]
                                  : heads.filter((id) => id !== n.id),
                              )
                            }
                          />
                          {n.label}
                        </label>
                      ))}
                    {!city.nodes.some((n) => n.type === "HEAD") && (
                      <p>Set node types to HEAD in City Studio first.</p>
                    )}
                  </fieldset>
                  <button className="primary" onClick={generate}>
                    <GitBranch size={16} /> Generate zones
                  </button>
                </section>
              )}
              <section className="city-panel">
                <div className="city-panel-header">
                  <div>
                    <span className="eyebrow">
                      {isStudio ? "CITY STUDIO" : "LIVE SIMULATION MAP"}
                    </span>
                    <h3>
                      {isStudio
                        ? "Your city. Your connections."
                        : "The bigger picture."}
                    </h3>
                  </div>
                  <div className="map-tools">
                    <div
                      className="mode-switch"
                      aria-label="Map interaction mode"
                    >
                      <button
                        aria-pressed={!isStudio && !isSim}
                        onClick={() => setPage("Overview")}
                      >
                        View map
                      </button>
                      <button
                        aria-pressed={isStudio}
                        onClick={() => setPage("City Studio")}
                      >
                        Edit map
                      </button>
                      <button
                        aria-pressed={isSim}
                        onClick={() => setPage("Collection Simulator")}
                      >
                        Simulate
                      </button>
                    </div>
                    {isStudio && (
                      <>
                        <button onClick={() => addNode()}>
                          <Plus size={15} /> Node
                        </button>
                        <button
                          aria-label="Undo edit"
                          disabled={!past.length}
                          onClick={() => undo()}
                        >
                          <Undo2 size={16} />
                        </button>
                        <button
                          aria-label="Redo edit"
                          disabled={!future.length}
                          onClick={() => undo(true)}
                        >
                          <Redo2 size={16} />
                        </button>
                      </>
                    )}
                    <fieldset
                      className="inline-edit-tools"
                      disabled={!(isStudio || isOps) || !!sim}
                    >
                      <label className="seed-field">
                        Seed
                        <input
                          type="number"
                          value={city.settings.seed}
                          onChange={(e) =>
                            change({
                              ...city,
                              settings: {
                                ...city.settings,
                                seed: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </label>
                      <button onClick={() => change(randomize(city))}>
                        <RefreshCw size={15} /> Randomize fill levels
                      </button>
                      <button
                        aria-label="Generate overflow demo"
                        title="Fill all simulated bins to 90–100%"
                        onClick={() => change(randomize(city, true))}
                      >
                        <Sparkles size={16} />
                      </button>
                      <button
                        aria-label="Scenario settings"
                        onClick={() => setShowSettings((s) => !s)}
                      >
                        <Settings2 size={17} />
                      </button>
                    </fieldset>
                  </div>
                </div>
                <div
                  className={`canvas-layout ${isStudio || selection ? "has-inspector" : ""}`}
                >
                  <CityCanvas
                    key={city.id}
                    city={city}
                    simulationView={isSim}
                    plan={plan}
                    simulation={sim}
                    selection={selection}
                    onSelect={setSelection}
                    onMove={move}
                    onCreate={addNode}
                    editing={isStudio && !sim}
                  />
                  {(isStudio || selection) && (
                    <Inspector
                      city={city}
                      selection={selection}
                      select={setSelection}
                      change={change}
                      confirm={confirm}
                      report={notify}
                      readOnly={!isStudio || !!sim}
                      edit={() => setPage("City Studio")}
                    />
                  )}
                </div>
                <div className="canvas-footer">
                  <span>
                    <i className="live-dot" />{" "}
                    {sim?.running ? "Collection running" : "Scenario ready"}{" "}
                    <span className="muted">
                      · Directed roads · Edge weights in km
                    </span>
                  </span>
                  <span>
                    {plan
                      ? "Current collection plan"
                      : city.zones.length
                        ? "Zones ready · Collection plan needed"
                        : "Zones need generation"}{" "}
                    <ChevronRight size={13} />
                  </span>
                </div>
              </section>
              {warnings.length > 0 && (
                <section className="warning-list">
                  <b>
                    {warnings.length} operational warning
                    {warnings.length === 1 ? "" : "s"}
                  </b>
                  {warnings.slice(0, 12).map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                  {warnings.length > 12 && (
                    <p>
                      And {warnings.length - 12} more. Inspect pending jobs
                      below.
                    </p>
                  )}
                </section>
              )}
              <ZoneWorkload city={city} plan={plan} />
              <div className="below-grid">
                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">02 / ZONE RESPONSIBILITY</span>
                      <h3>Local focus. Citywide impact.</h3>
                    </div>
                    <button
                      onClick={() => setPage("Zone & Fleet Operations")}
                      aria-label="View zone operations"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                  {city.zones.length ? (
                    <div className="zones-list">
                      {city.zones.map((z) => (
                        <button
                          key={z.id}
                          className="zone-card"
                          onClick={() =>
                            setSelection({ kind: "zone", id: z.id })
                          }
                        >
                          <i style={{ background: z.color }} />
                          <div>
                            <b>{z.name}</b>
                            <small>
                              {
                                city.nodes.find((n) => n.id === z.headNodeId)
                                  ?.label
                              }{" "}
                              · {z.binIds.length} bins
                            </small>
                          </div>
                          <span>
                            {
                              city.bins.filter(
                                (b) =>
                                  z.binIds.includes(b.id) &&
                                  b.fillPercent >=
                                    city.settings.pickupThreshold,
                              ).length
                            }{" "}
                            pickups
                          </span>
                          <ChevronRight size={14} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-inline">
                      <GitBranch />
                      <p>
                        Choose heads and generate graph-based zones.
                        <br />
                        <small>
                          Directed round-trip feasibility is checked for each
                          bin.
                        </small>
                      </p>
                    </div>
                  )}
                </section>
                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">03 / RESOURCES THAT MOVE</span>
                      <h3>Your collection fleet</h3>
                    </div>
                    <button
                      title="Add truck"
                      aria-label="Add truck"
                      disabled={page === "Overview" || isSim || !!sim}
                      onClick={() => {
                        if (sim) {
                          notify(
                            "Reset the collection run before editing its scenario.",
                          );
                          return;
                        }
                        const id = uid("truck");
                        change({
                          ...city,
                          trucks: [
                            ...city.trucks,
                            {
                              id,
                              label: `Truck ${city.trucks.length + 1}`,
                              capacityBinUnits: 8,
                              speedGrade: 2,
                              available: true,
                            },
                          ],
                        });
                        setSelection({ kind: "truck", id });
                      }}
                    >
                      <Plus size={17} />
                    </button>
                  </div>
                  {city.trucks.map((t) => {
                    const trip = sim
                        ? currentTrip(
                            sim.plan.trips.filter((p) => p.truckId === t.id),
                            sim.time,
                          )
                        : undefined,
                      s = trip && sim ? tripState(trip, sim.time) : null;
                    return (
                      <button
                        className="fleet-row"
                        key={t.id}
                        onClick={() =>
                          setSelection({ kind: "truck", id: t.id })
                        }
                      >
                        <span className="mini-icon">
                          <Truck size={20} />
                        </span>
                        <div>
                          <b>{t.label}</b>
                          <small>
                            {t.capacityBinUnits} units ·{" "}
                            {city.settings.speeds[t.speedGrade]} km/h
                            {s ? ` · load ${fixed(s.load)}` : ""}
                          </small>
                        </div>
                        <span className="pill">
                          {s?.state ??
                            (sim &&
                            sim.time >=
                              Math.max(
                                0,
                                ...sim.plan.trips
                                  .filter((p) => p.truckId === t.id)
                                  .map((t) => t.end),
                              )
                              ? "COMPLETED"
                              : t.available
                                ? "AVAILABLE"
                                : "UNAVAILABLE")}
                        </span>
                      </button>
                    );
                  })}
                  {!city.trucks.length && (
                    <p>No trucks. Add a truck to schedule collection.</p>
                  )}
                </section>
              </div>
              <section className="panel collection-panel">
                <div>
                  <span className="eyebrow">04 / SMARTER COLLECTION</span>
                  <h3>
                    {sim ? "Collection in motion" : "Ready when your city is."}
                  </h3>
                  <p>
                    {sim
                      ? `${sim.time.toFixed(1)} / ${sim.plan.duration.toFixed(1)} virtual minutes · ${sim.completed.length} completed stops`
                      : "Plan current pickups across every zone, without exceeding truck capacity."}
                  </p>
                </div>
                <div className="playback">
                  <button onClick={optimize} disabled={!!sim}>
                    <Route size={16} /> Optimize all zones
                  </button>
                  {!sim ? (
                    <button
                      className="primary"
                      disabled={!plan?.trips.length}
                      onClick={() => {
                        if (plan) {
                          const s = startSimulation(city, plan);
                          setSim(s);
                          setPage("Collection Simulator");
                        }
                      }}
                    >
                      <Play size={16} /> Start collection
                    </button>
                  ) : (
                    <>
                      <button
                        className="primary"
                        disabled={sim.time >= sim.plan.duration}
                        onClick={() =>
                          setSim({
                            ...sim,
                            running:
                              sim.time < sim.plan.duration && !sim.running,
                          })
                        }
                      >
                        {sim.running ? <Pause size={16} /> : <Play size={16} />}{" "}
                        {sim.running ? "Pause" : "Resume"}
                      </button>
                      <button
                        onClick={() => {
                          if (sim.running) setSim({ ...sim, running: false });
                          else step();
                        }}
                        disabled={sim.running || sim.time >= sim.plan.duration}
                      >
                        <SkipForward size={16} /> Step +1 min
                      </button>
                      <button onClick={resetSim}>
                        <RotateCcw size={16} /> Reset run
                      </button>
                      {sim.time >= sim.plan.duration && (
                        <button
                          onClick={() => {
                            setCity(clone(sim.original));
                            setSim(startSimulation(sim.original, sim.plan));
                            setDirty(true);
                          }}
                        >
                          <Play size={16} />
                          Replay collection
                        </button>
                      )}
                    </>
                  )}
                  <label>
                    Speed
                    <select
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                    >
                      {[1, 5, 10, 30, 60].map((s) => (
                        <option key={s} value={s}>
                          {s}×
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {sim && (
                  <progress max={sim.plan.duration || 1} value={sim.time} />
                )}
              </section>
              {plan && <RunProgress city={city} plan={plan} sim={sim} />}
              {(plan || isSim) && (
                <section className="panel">
                  <h3>Trip schedule & pending work</h3>
                  {plan ? (
                    <>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Trip</th>
                              <th>Zone / truck</th>
                              <th>Pickups</th>
                              <th>Load</th>
                              <th>Distance</th>
                              <th>Virtual schedule</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {plan.trips.map((t) => (
                              <tr key={t.id}>
                                <td>{t.id}</td>
                                <td>
                                  {
                                    city.zones.find((z) => z.id === t.zoneId)
                                      ?.name
                                  }{" "}
                                  /{" "}
                                  {
                                    city.trucks.find((x) => x.id === t.truckId)
                                      ?.label
                                  }
                                </td>
                                <td>{t.binIds.length}</td>
                                <td>{fixed(t.load)}</td>
                                <td>{fixed(t.distance)} km</td>
                                <td>
                                  {t.start.toFixed(1)}–{t.end.toFixed(1)} min
                                </td>
                                <td>
                                  {sim
                                    ? tripState(t, sim.time).state
                                    : "PLANNED"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {!plan.trips.length && (
                        <p>
                          No trips dispatched.{" "}
                          {plan.eligible.length
                            ? "See pending work."
                            : "No bins meet the pickup threshold."}
                        </p>
                      )}
                      {plan.pending.map((p) => (
                        <p className="warning-text" key={p.binId}>
                          {city.bins.find((b) => b.id === p.binId)?.name}:{" "}
                          {p.reason}
                        </p>
                      ))}
                    </>
                  ) : (
                    <p>Optimize all zones to create a real trip schedule.</p>
                  )}
                </section>
              )}
              {(isAnalytics || page === "Overview") && (
                <>
                  <section className="panel">
                    <div className="section-heading">
                      <div>
                        <span className="eyebrow">
                          TRANSPARENT OPERATING ESTIMATES
                        </span>
                        <h3>Every kilometre accounted for.</h3>
                      </div>
                      <button onClick={() => setShowSettings(true)}>
                        <Settings2 size={15} /> Cost assumptions
                      </button>
                    </div>
                    {plan && baseline ? (
                      <>
                        <div className="comparison">
                          <div>
                            <small>FIXED-ORDER BASELINE</small>
                            <strong>
                              {fixed(baseline.distance)} <em>km</em>
                            </strong>
                            <span>
                              {money(baseline.cost)} ·{" "}
                              {baseline.laborMinutes.toFixed(1)} vehicle min
                            </span>
                          </div>
                          <div>
                            <small>URGENCY + NEAREST FEASIBLE</small>
                            <strong>
                              {fixed(plan.distance)} <em>km</em>
                            </strong>
                            <span>
                              {money(plan.cost)} ·{" "}
                              {plan.laborMinutes.toFixed(1)} vehicle min
                            </span>
                          </div>
                          <div>
                            <small>ESTIMATED SAVINGS</small>
                            <strong
                              className={
                                baseline.cost - plan.cost >= 0
                                  ? "accent"
                                  : "warning-text"
                              }
                            >
                              {comparablePlans(baseline, plan)
                                ? money(baseline.cost - plan.cost)
                                : "Not comparable"}
                            </strong>
                            <span>
                              {comparablePlans(baseline, plan) ? (
                                <>
                                  {baseline.distance
                                    ? (
                                        ((baseline.distance - plan.distance) /
                                          baseline.distance) *
                                        100
                                      ).toFixed(1)
                                    : "0"}
                                  % distance reduction
                                </>
                              ) : (
                                "Different pending pickup sets"
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="small">
                          <ComparisonDetails plan={plan} baseline={baseline} />
                          Same eligible pickup set, fleet, capacity and speed
                          assumptions. Greedy strategies can serve different
                          feasible subsets; compare savings only when pending
                          sets match.{" "}
                          {JSON.stringify(
                            [...baseline.pending.map((p) => p.binId)].sort(),
                          ) !==
                          JSON.stringify(
                            [...plan.pending.map((p) => p.binId)].sort(),
                          )
                            ? "WARNING: pending sets differ; this is not a like-for-like savings claim."
                            : "Pending sets match."}{" "}
                          Cost = km × {money(city.settings.costPerKmINR)} +
                          vehicle hours × {money(city.settings.costPerHourINR)}.
                          Parallel truck time is counted separately for labor.
                        </div>
                      </>
                    ) : (
                      <div className="empty-inline">
                        <BarChart3 />
                        <p>
                          Optimize a collection plan to compare actual
                          calculated costs.
                          <br />
                          <small>
                            We report negative savings too. No optimality
                            guarantee.
                          </small>
                        </p>
                      </div>
                    )}
                  </section>
                  <div className="below-grid">
                    <section className="panel">
                      <span className="eyebrow">FILL DISTRIBUTION</span>
                      <h3>The state of the network</h3>
                      <div className="bar-chart">
                        {[
                          {
                            label: "Normal",
                            count: city.bins.length - eligible.length,
                            color: "#62d7af",
                          },
                          {
                            label: "Collection",
                            count: eligible.length - urgent.length,
                            color: "#ffbc70",
                          },
                          {
                            label: "Urgent",
                            count: urgent.length,
                            color: "#f78484",
                          },
                        ].map((x) => (
                          <div key={x.label}>
                            <span>{x.label}</span>
                            <div>
                              <i
                                style={{
                                  width: `${city.bins.length ? (x.count / city.bins.length) * 100 : 0}%`,
                                  background: x.color,
                                }}
                              />
                            </div>
                            <b>{x.count}</b>
                          </div>
                        ))}
                      </div>
                    </section>
                    <Forecasts city={city} sim={sim} />
                  </div>
                </>
              )}
              <section className="panel virtual-flow">
                <span className="eyebrow">
                  EDUCATIONAL FLOW · ALL EVENTS SIMULATED
                </span>
                <h3>From observation to action.</h3>
                <div>
                  {[
                    "Virtual bin",
                    "Simulated telemetry",
                    "Browser storage",
                    "Threshold alerts",
                    "Directed route engine",
                  ].map((name, i) => (
                    <div key={name}>
                      <span>0{i + 1}</span>
                      <b>{name}</b>
                      <small>
                        {i === 0
                          ? `${city.bins.length} virtual bins`
                          : i === 1
                            ? `Latest virtual hour ${(Math.max(0, ...city.bins.flatMap((b) => b.history.map((h) => h.time))) / 3600000).toFixed(1)}`
                            : i === 2
                              ? dirty
                                ? "Unsaved working state"
                                : "Save locally to persist"
                              : i === 3
                                ? `${eligible.length} threshold warnings`
                                : plan
                                  ? `${plan.trips.length} computed trips`
                                  : "Awaiting calculation"}
                      </small>
                    </div>
                  ))}
                </div>
                <p className="small">
                  This local flow does not write to Supabase. Browser storage is
                  updated only by Save scenario.
                </p>
              </section>
              {sim && (
                <section className="panel">
                  <h3>Simulated collection event history</h3>
                  {[...sim.events].reverse().map((e, i) => (
                    <div className="event-row" key={i}>
                      <span className="pill">SIMULATED</span>
                      <time>{e.time.toFixed(1)} min</time>
                      <span>{e.message}</span>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
          <footer>
            CleanCity{" "}
            <span>Designed for clarity. Built for a cleaner tomorrow.</span>
            <span>
              {physical
                ? "PHYSICAL DATA · CLOUD REQUIRED"
                : "LOCAL SIMULATION · NO CLOUD REQUIRED"}
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{notice}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      {dialog && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <span className="eyebrow">CONFIRM CHANGE</span>
            <h2 id="dialog-title">Continue with this action?</h2>
            <p>{dialog.message}</p>
            <div>
              <button autoFocus onClick={() => setDialog(null)}>
                Cancel
              </button>
              <button
                className="danger"
                onClick={() => {
                  const action = dialog.action;
                  setDialog(null);
                  guard(action);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function Metric({
  label,
  value,
  detail,
  icon,
  warning = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div className="metric">
      <div>
        <span>{label}</span>
        <i className={warning ? "warm" : ""}>{icon}</i>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
