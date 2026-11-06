import ShowcasePanel from './components/ShowcasePanel';
import {showcaseCity} from './core/showcase';
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
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
import DemandSeed from './components/DemandSeed';
import { createReadyCities } from "./core/readyCities";
import { preset, blankCity, randomize, infeasiblePreset } from "./core/presets";
import { regenerateZones, relocateBin, validateZoneTrips } from "./core/zoning";
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

import Dashboard from "./components/Dashboard";
import Cities from "./components/Cities";
import StudioCreate from "./components/StudioCreate";
import OperationsWorkspace from "./components/OperationsWorkspace";
import FleetPanel from "./components/FleetPanel";
import { municipalDemo, workspaceStatus, BinFilter } from "./core/workspace";
const pages = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Cities", icon: Map },
  { name: "City Studio", icon: Map },
  { name: "Zone & Fleet Operations", icon: Boxes },
  { name: "Collection Simulator", icon: Truck },
  { name: "Analytics & What-If", icon: BarChart3 },
  { name: "Physical IoT Lab", icon: FlaskConical },
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
      return { list, city: list[0] ?? municipalDemo(), error: "" };
    } catch {
      return {
        list: [] as City[],
        city: municipalDemo(),
        error:
          "Saved data could not be loaded. It has not been overwritten; export/recover browser storage before saving.",
      };
    }
  });
  const [city, setCity] = useState<City>(initial.city),
    [library, setLibrary] = useState(initial.list),
    [page, setPage] = useState("Overview"),
    [selection, setSelection] = useState<Selection | null>(null),
    [heads, setHeads] = useState<string[]>(initial.city.zones.map(z=>z.headNodeId)),
    [plan, setPlan] = useState<Plan | null>(() =>
      initial.list.length || initial.error
        ? null
        : planCollection(initial.city),
    ),
    [baseline, setBaseline] = useState<Plan | null>(() =>
      initial.list.length || initial.error
        ? null
        : planCollection(initial.city, true),
    ),
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
      saveAction?: () => void;
    } | null>(null),
    [showSettings, setShowSettings] = useState(false);
  const [binFilter, setBinFilter] = useState<BinFilter>("ALL"),
    [showReview, setShowReview] = useState(false),
    [showHelp, setShowHelp] = useState(false),
    [menuOpen, setMenuOpen] = useState(false),
    [opsMapOpen, setOpsMapOpen] = useState(false),
    [lastSaved, setLastSaved] = useState<string | null>(null),
    [focusTarget, setFocusTarget] = useState<{
      id: string;
      stamp: number;
    } | null>(null);
  const [inspectorDraft, setInspectorDraft] = useState(false);
  function navigate(next: string, target?: string, discardForm = false) {
    const go = () => {
    setInspectorDraft(false);
    setPage(next);
    setSelection(null);
    setShowSettings(false);
    setMenuOpen(false);
    setFocusTarget({ id: target ?? "workspace-title", stamp: Date.now() });
    };
    if(inspectorDraft && !discardForm) confirm("The property form has unapplied edits. Cancel and choose Save changes to apply them, or Confirm to discard these form edits and continue.",go);
    else go();
  }
  useEffect(() => {
    const el = document.getElementById(focusTarget?.id ?? "");
    el?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    el?.focus({ preventScroll: true });
  }, [focusTarget]);
  const openSettings = () => {
    navigate("City Studio");
    setShowSettings(true);
  };
  const review = (filter: BinFilter) => {
    setBinFilter(filter);
    setShowReview(true);
    setFocusTarget({ id: "bin-review", stamp: Date.now() });
  };
  const startRun = () =>
    guard(() => {
      if (!plan?.trips.length)
        throw Error(
          "Plan at least one feasible trip before starting collection.",
        );
      const run = startSimulation(city, plan);
      setSim(run);
      stateRef.current = { city, sim: run };
      navigate("Collection Simulator");
      setFocusTarget({ id: "city-map", stamp: Date.now() });
    });
  const openDemo = () => {
    const c = municipalDemo();
    c.id = uid("demo");
    load(c, true, "Overview");
  };
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        document
          .querySelector<HTMLButtonElement>(".mobile-navigation-toggle")
          ?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menuOpen]);
  const stateRef = useRef({ city, sim });
  stateRef.current = { city, sim };
  const importRef = useRef<HTMLInputElement>(null);
  const [noticeKind, setNoticeKind] = useState<"info" | "success" | "error">(
    initial.error ? "error" : "info",
  );
  const notify = (
    message: string,
    kind: "info" | "success" | "error" = "info",
  ) => {
    setNotice(message);
    setNoticeKind(kind);
  };
  const guard = (action: () => void) => {
    try {
      action();
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e), "error");
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
      if(city.showcaseSnapshot && JSON.stringify(next.showcaseSnapshot)===JSON.stringify(city.showcaseSnapshot) && city.bins.some(b=>/^(BIN-00[1-4]|showcase-real-[1-4])$/.test(b.id)&&next.bins.find(n=>n.id===b.id)?.fillPercent!==b.fillPercent))throw Error('Physical-derived fills are frozen. Capture a new validated snapshot instead.');
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
      const operational = operationalChanged(city, c);
      if (operational) invalidate();
      notify(
        graph
          ? "Network updated. Regenerate zones before planning."
          : operational
            ? "Scenario updated. Replan collection to use these changes."
            : "Changes applied to the workspace. Save scenario to keep them.",
      );
      setWarnings(
        graph
          ? ["Road graph changed. Generate zones again before planning."]
          : [],
      );
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
      return false;
    }
  }
  function load(c: City, ready = false, destination?: string) {
    const apply = () => {
      setInspectorDraft(false);
      setCity(clone(c));
      setHeads(c.zones.map(z=>z.headNodeId));
      setPast([]);
      setFuture([]);
      if (ready) {
        setPlan(planCollection(c));
        setBaseline(planCollection(c, true));
        setSim(null);
      } else invalidate();
      setSelection(null);
      setShowReview(false);
      setLastSaved(null);
      if (destination) navigate(destination, undefined, true);
      setWarnings([]);
      setDirty(!library.some((x) => x.id === c.id));
      notify(`${c.name} loaded`);
    };
    if(inspectorDraft) {confirm("The inspector has unapplied field edits. Cancel and apply Save changes first, or Confirm to discard them and open the other city.",apply);return;}
    if (dirty || sim)
      setDialog({message:"Open another city? Confirm discards the current unsaved changes and active simulation. Saved cities are kept. You can save this city's inputs before opening the next one.", action:apply,
        saveAction: dirty ? () => {
          if(initial.error) throw Error("Saved data is unreadable. Export your city before switching.");
          const list=[clone(city),...library.filter(x=>x.id!==city.id)];
          saveLibrary(localStorage,list); setLibrary(list); apply();
        } : undefined});
    else apply();
  }
  function save() {
    guard(() => {
      if(inspectorDraft) throw Error("Apply the open form's Save button first, then Save city. Your field edits have not been saved yet.");
      if (initial.error)
        throw Error(
          "Saved data is unreadable. Export your open city and recover the existing browser storage before saving.",
        );
      const list = [city, ...library.filter((c) => c.id !== city.id)];
      saveLibrary(localStorage, list);
      setLibrary(clone(list));
      setDirty(false);
      setLastSaved(new Date().toLocaleTimeString());
      notify(
        "City saved in this browser. Plans and run history stay in this tab.",
      );
    });
  }
  function generate() {
    guard(() => {
      if (sim) throw Error("Reset collection before regenerating zones");
      const result = regenerateZones(city, heads);
      if (
        !change({
          ...city,
          zones: result.zones,
          trucks: result.trucks,
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
      const reason = workspaceStatus(city, null, null).planReason;
      if (reason) throw Error(reason);
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
    isAnalytics = page === "Analytics & What-If",
    isDashboard = page === "Overview",
    isCities = page === "Cities";
  const mapPanel = (
    <section className="city-panel" id="city-map" tabIndex={-1}>
      <div className="city-panel-header">
        <div>
          <span className="eyebrow">
            {isStudio
              ? "CITY STUDIO"
              : isSim
                ? "COLLECTION PLAYBACK"
                : "CITY OPERATIONS MAP"}
          </span>
          <h3>
            {isStudio
              ? "Your city. Your connections."
              : isSim
                ? "Follow collection on the road"
                : "City status & collection responsibility"}
          </h3>
        </div>
        <div className="map-tools">
          <div className="mode-switch" aria-label="Map interaction mode">
            <button
              aria-pressed={!isStudio && !isSim}
              onClick={() => navigate("Overview")}
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
          {isStudio && (
            <details className="map-edit-options"><summary>Fill & settings</summary><fieldset
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
              <button aria-label="Scenario settings" onClick={openSettings}>
                <Settings2 size={17} />
              </button>
            </fieldset></details>
          )}
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
          onSelect={(next) => inspectorDraft ? confirm("Discard unapplied property edits and select another item? Cancel to keep editing.",()=>{setInspectorDraft(false);setSelection(next);}) : setSelection(next)}
          onMove={move}
          onCreate={addNode}
          editing={isStudio && !sim}
        />
        {(isStudio || selection) && (
          <Inspector
            onDraftChange={setInspectorDraft}
            city={city}
            selection={selection}
            select={(next) => inspectorDraft ? confirm("Discard unapplied property edits? Cancel to keep editing.",()=>{setInspectorDraft(false);setSelection(next);}) : setSelection(next)}
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
          <span className="muted">· Directed roads · Edge weights in km</span>
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
  );
  const collectionControls = (
    <section
      className="panel collection-panel"
      id="dispatch-controls"
      tabIndex={-1}
    >
      <div>
        <span className="eyebrow">04 / SMARTER COLLECTION</span>
        <h3>
          {sim
            ? sim.time >= sim.plan.duration
              ? "Collection run finished"
              : sim.running ? "Collection in motion" : "Collection paused"
            : "Plan and simulate collection"}
        </h3>
        <p>
          {sim
            ? `${sim.time.toFixed(1)} / ${sim.plan.duration.toFixed(1)} virtual minutes · ${sim.completed.length} completed stops`
            : "Plan current pickups across every zone, without exceeding truck capacity."}
        </p>
      </div>
      <div className="playback">
        <p className="playback-reason">
          {sim ? sim.time>=sim.plan.duration ? "Run complete. Review the results or replay the same inputs." : "Virtual playback only. Pause to step through service events or finish the run." : workspaceStatus(city, plan, sim).planReason ??
            workspaceStatus(city, plan, sim).startReason ??
              "The plan is ready. Start collection to simulate pickups."}
        </p>
        <button
          onClick={() => navigate("Zone & Fleet Operations", "zone-setup")}
        >
          Configure zones & fleet
        </button>
        <button
          onClick={optimize}
          disabled={!!workspaceStatus(city, plan, sim).planReason}
        >
          <Route size={16} /> Optimize all zones
        </button>
        {!sim ? (
          <button
            className="primary"
            disabled={!plan?.trips.length}
            onClick={startRun}
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
                  running: sim.time < sim.plan.duration && !sim.running,
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
            <button
              disabled={sim.running || sim.time >= sim.plan.duration}
              onClick={() => step(sim.plan.duration - sim.time)}
            >
              Finish run
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
      {sim && <><progress aria-label="Overall simulation progress" max={sim.plan.duration || 1} value={sim.time} /><div className="simulation-next"><span>{sim.completed.length} pickups complete · {Math.max(0,sim.plan.eligible.length-sim.plan.pending.length-sim.completed.length)} scheduled stops left · {sim.plan.pending.length} unserved</span><button onClick={()=>navigate('Analytics & What-If')}>View collection analysis <ChevronRight size={15}/></button></div></>}
    </section>
  );
  return (
    <div
      className={`app ${menuOpen ? "menu-open" : ""} ${isDashboard ? "dashboard-page" : ""} ${physical ? "lab-theme" : ""} ${isOps?'dispatch-page':''} ${isSim?'simulation-page':''} ${isAnalytics?'analytics-page':''} ${page === "City Studio" ? "studio-workspace" : ""}`}
    >
      {menuOpen && (
        <button
          className="navigation-backdrop"
          aria-label="Dismiss navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className="sidebar">
        <button
          className="mobile-close-navigation"
          onClick={() => setMenuOpen(false)}
        >
          Close menu ×
        </button>
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
              aria-label={
                p.name === "Overview"
                  ? "Dashboard"
                  : p.name === "Analytics & What-If"
                    ? "Analytics"
                    : p.name
              }
              className={page === p.name ? "active" : ""}
              onClick={() => {
                navigate(p.name);
              }}
            >
              <p.icon size={19} />
              <span>
                {p.name === "Overview"
                  ? "Dashboard"
                  : p.name === "Analytics & What-If"
                    ? "Analytics"
                    : p.name}
              </span>
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
          <button
            className="mobile-navigation-toggle"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
          <div>
            Workspace <ChevronRight size={14} />{" "}
            <b>
              {page === "Overview"
                ? "Dashboard"
                : page === "Analytics & What-If"
                  ? "Analytics"
                  : page}
            </b>
          </div>
          <div>
            <span className={`connection ${physical ? "" : "virtual"}`}>
              <i />
              {physical
                ? "Physical telemetry only"
                : "Simulator available offline"}
            </span>
            {!physical && (
              <button
                aria-label="Show workspace settings"
                onClick={openSettings}
              >
                <Settings2 size={18} />
              </button>
            )}
            <button
              aria-label="Show help"
              onClick={() => setShowHelp(!showHelp)}
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
              <h1 id="workspace-title" tabIndex={-1}>
                {page === "Overview"
                  ? "Municipal operations"
                  : isAnalytics
                    ? "Collection analytics"
                    : page}
              </h1>
              <p>
                {physical
                  ? "Four sensor channels. Only actual measurements appear here; one demo bin is available."
                  : page === "Overview"
                    ? "Review demand. Plan feasible pickups. Simulate collection. Evaluate results."
                    : isCities
                      ? "Choose a district, build a network and keep your work in this browser."
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
              {!physical && !isCities && (
                <>
                  <button onClick={save} aria-label="Save scenario">
                    <Save size={16} /> Save city
                    {dirty && <i className="unsaved-dot" />}
                  </button>
                  {isOps && (
                    <button
                      className="primary"
                      disabled={!!workspaceStatus(city, plan, sim).planReason}
                      title={
                        workspaceStatus(city, plan, sim).planReason ??
                        "Build feasible collection trips"
                      }
                      onClick={() => {
                        optimize();
                      }}
                    >
                      Plan collection
                    </button>
                  )}
                  {!isDashboard && (
                    <button onClick={openDemo}>Open guided demo</button>
                  )}
                </>
              )}
            </div>
          </div>
          {showHelp && (
            <section className="panel help-panel" aria-label="Workflow guide">
              <div className="section-heading">
                <h3>Your collection workflow</h3>
                <button onClick={() => setShowHelp(false)}>Close guide</button>
              </div>
              <p>
                1. Select or create a city → 2. Edit bins and roads → 3. Choose
                collection heads and generate zones → 4. Assign available trucks
                → 5. Plan pickups → 6. Simulate → 7. Analyze results.
              </p>
              <p>
                A head is a depot where trips start and return. A zone assigns
                responsibility for bins. The planner follows directed roads and
                respects truck capacity; unserved pickups retain an explanation.
              </p>
              <p>
                Save stores the city and current fills locally. Plans and run
                history are session-only. Export city JSON in City Studio for a
                portable backup. All municipal values are simulated; actual
                devices appear only in Physical IoT Lab.
              </p>
              <button onClick={openDemo}>Open guided demo</button>
              <button
                onClick={() =>
                  navigate("Zone & Fleet Operations", "zone-setup")
                }
              >
                Go to zone setup
              </button>
            </section>
          )}
          {!physical && city.showcase && <p role="status">{city.showcaseSnapshot?.mode==='TEST'?'TEST FIXTURE':city.showcaseSnapshot?'PHYSICAL-DERIVED':'UNCAPTURED'} showcase inputs · truck collection is simulated. Manage snapshots in Physical IoT Lab.</p>}
          {physical ? (
            <>
            <PhysicalLab />
            <section className="iot-showcase-workspace" aria-label="IoT showcase dashboard">
              <h2>10-bin showcase dashboard</h2>
              <p>Prepare a physical-derived or explicitly TEST planning snapshot here, then continue to the existing municipal collection workspaces.</p>
              <button onClick={()=>load(showcaseCity(),false,"Physical IoT Lab")}>Open 10-bin showcase</button>
              {city.showcase && <ShowcasePanel key={city.id} city={city} locked={!!sim} onCapture={c=>{if(sim||inspectorDraft){notify("Reset the run and apply open form edits first.","error");return false;}const errors=validateCity(c);if(errors.length){notify(errors.join("; "),"error");return false;}setCity(c);setDirty(true);invalidate();return true;}}/>}

              {city.showcase && <><button onClick={save}>Save showcase city</button><button onClick={()=>navigate('City Studio')}>Edit showcase map</button><button disabled={!city.showcaseSnapshot} onClick={()=>navigate('Zone & Fleet Operations')}>Continue to Dispatch</button></>}
            </section>
            </>
          ) : (
            <>
              {isCities && <Cities city={city} library={library} dirty={dirty} onSave={save}
                onRename={(c, name) => guard(() => {
                  const list=library.map(x => x.id===c.id ? {...x,name} : x);
                  saveLibrary(localStorage,list); setLibrary(clone(list));
                  if(city.id===c.id) setCity({...city,name});
                  notify("City renamed in this browser.","success");
                })}
                onOpen={(c, destination) => c === city ? navigate(destination) : load(c, false, destination)}
                onError={(message) => notify(message, "error")}
                onDelete={(c) => confirm(`Delete saved city “${c.name}” from this browser? The current open city is retained.`, () => guard(() => {
                  const list = library.filter(x => x.id !== c.id);
                  saveLibrary(localStorage, list); setLibrary(list);
                  if(c.id===city.id){setDirty(true);setLastSaved(null);}
                }))} />}
              {!isStudio && !isCities && (
                <section
                  className="workspace-city-bar"
                  aria-label="Current scenario"
                >
                  <div>
                    <b>{city.name}</b>
                    <small>
                      {city.bins.length} bins · {city.zones.length} zones ·{" "}
                      {city.trucks.length} trucks ·{" "}
                      {dirty
                        ? "Unsaved changes"
                        : lastSaved
                          ? `Saved at ${lastSaved}`
                          : library.some((c) => c.id === city.id)
                            ? "Saved city loaded"
                            : "Not saved in this browser"}
                    </small>
                  </div>
                  <label>
                    Switch city
                    <select
                      aria-label="Switch city"
                      value=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v.startsWith("ready:")) load({...createReadyCities()[Number(v.slice(6))],id:uid("city")});
else if (v === "demo") openDemo();
                        else if (v.startsWith("saved:")) {
                          const c = library.find((c) => c.id === v.slice(6));
                          if (c) load(c);
                        } else if (v) load(preset(Number(v)));
                      }}
                    >
                      <option value="">Saved cities & ready-to-run cities</option>
                      {createReadyCities().map((c,i)=><option key={c.id} value={`ready:${i}`}>{c.name}</option>)}
                      {library.map((c) => (
                        <option key={c.id} value={`saved:${c.id}`}>
                          {c.name}
                        </option>
                      ))}

                    </select>
                  </label>
                  <button onClick={() => navigate("Cities")}>
                    Edit / manage cities
                  </button>
                  {city.id.startsWith("demo-") && (
                    <button onClick={openDemo}>Reset demo</button>
                  )}
                  <button
                    onClick={() => {
                      const c = blankCity();
                      c.id = uid("city");
                      load(c, false, "City Studio");
                    }}
                  >
                    New city
                  </button>
                </section>
              )}
              {(isOps||isStudio)&&<DemandSeed key={`${city.id}:${city.settings.seed}`} city={city} locked={!!sim} onApply={change}/>}
              {(isOps||isAnalytics)&&<OperationsWorkspace city={city} plan={plan} baseline={baseline} sim={sim} mode={isOps?'dispatch':'analytics'} onPlan={optimize} onContinue={()=>navigate(isOps||sim?'Collection Simulator':'Zone & Fleet Operations')} onInspect={id=>{if(isOps)setOpsMapOpen(true);else navigate('Collection Simulator');setSelection({kind:'truck',id});}}/>}
              {isStudio && (
                <section className="studio-guide"><div><span className="eyebrow">CITY STUDIO / EDITING WORKSPACE</span><h2>Shape your collection network.</h2><p>Select a road, bin or junction on the map to edit its properties. Changes stay local until you save.</p></div><div><button onClick={() => navigate("Cities")}>City library</button><button onClick={() => navigate("Zone & Fleet Operations")}>Continue to dispatch <ChevronRight size={15}/></button></div></section>
              )}

              {isStudio && (
                <>
                  <details className="studio-city-actions"><summary>City file & presets · {city.name} · {dirty ? "Unsaved changes" : library.some(c=>c.id===city.id) ? "Saved in this browser" : "Not saved in this browser"}</summary><section className="scenario-bar">
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
                          notify(String(err), "error");
                        }
                        e.target.value = "";
                      }}
                    />
                    <button
                      disabled={!isStudio}
                      aria-label="Reset scenario"
                      title="Reset to the built-in demo, original preset or blank city"
                      onClick={() =>
                        confirm(
                          "Reset this city to its built-in demo or original preset? Custom cities become empty. Export or save edits first; the active run will be discarded.",
                          () => {
                            const c = city.id.startsWith("demo-")
                              ? municipalDemo()
                              : city.preset
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
                  </details>
                </>
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
                <div className="readiness-banner">
                  <b>Next: {workspaceStatus(city, plan, sim).stage}</b>
                  <span>
                    {workspaceStatus(city, plan, sim).planReason ??
                      "Review responsibilities and truck settings, then plan collection."}
                  </span>
                </div>
              )}
              {isOps && (
                <section
                  className="operations-toolbar panel"
                  id="zone-setup"
                  tabIndex={-1}
                >
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
                  <p className="setup-note">
                    Choose {city.settings.zoneCount} distinct heads below. Each
                    zone must have a road path to its bins and back.
                  </p>
                  <button
                    className="primary"
                    disabled={!!sim || heads.length !== city.settings.zoneCount}
                    onClick={generate}
                  >
                    <GitBranch size={16} /> Generate zones
                  </button>
                </section>
              )}
              {isDashboard ? (
                <Dashboard
                  city={city}
                  plan={plan}
                  sim={sim}
                  map={mapPanel}
                  filter={binFilter}
                  showReview={showReview}
                  onReview={review}
                  onInspect={(id) => {
                    setSelection({ kind: "bin", id });
                    setFocusTarget({ id: "city-map", stamp: Date.now() });
                  }}
                  onNavigate={navigate}
                  onPlan={() => {
                    optimize();
                    navigate("Collection Simulator");
                  }}
                  onStart={startRun}
                  onDemo={openDemo}
                />
              ) : null}
              {isSim && collectionControls}
              {isStudio && <StudioCreate city={city} change={change} select={setSelection} locked={!!sim}/>}
              {(isStudio || isSim) && mapPanel}
              {isStudio && (
                <StudioTools
                  city={city}
                  change={change}
                  confirm={confirm}
                  load={(c) => load({ ...c, id: uid("city") })}
                />
              )}
              {isOps && (
                <details
                  className="zone-map-disclosure"
                  open={opsMapOpen}
                  onToggle={(e) => setOpsMapOpen(e.currentTarget.open)}
                >
                  <summary>Inspect zone map & responsibilities</summary>
                  {mapPanel}
                </details>
              )}
              {!isDashboard && warnings.length > 0 && (
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
              {(isOps || isAnalytics) && (
                <ZoneWorkload city={city} plan={plan} />
              )}
              {isOps && (
                <div className="below-grid operations-config">
                  <section
                    className="panel"
                    id="zone-responsibilities"
                    tabIndex={-1}
                  >
                    <div className="section-heading">
                      <div>
                        <span className="eyebrow">ZONE RESPONSIBILITY</span>
                        <h3>Zone responsibilities</h3>
                      </div>
                      <button
                        onClick={() => {
                          setOpsMapOpen(true);
                          setFocusTarget({ id: "city-map", stamp: Date.now() });
                        }}
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
                            onClick={() => {
                              setSelection({ kind: "zone", id: z.id });
                              setOpsMapOpen(true);
                              setFocusTarget({
                                id: "city-map",
                                stamp: Date.now(),
                              });
                            }}
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
                  <FleetPanel
                    onDraftChange={setInspectorDraft}
                    city={city}
                    change={change}
                    locked={!!sim}
                    confirm={confirm}
                  />
                </div>
              )}
              {isAnalytics && (
                <section className="panel analytics-context">
                  <h2>
                    {sim
                      ? "Results from the current collection run"
                      : "Plan estimates · collection not run"}
                  </h2>
                  <p>
                    {sim
                      ? "Collected stops and travelled distance come from actual playback. Unserved pickups remain separate from scheduled work."
                      : "The figures below describe a calculated plan. Start collection to measure simulated progress; saving a city does not persist the run history."}
                  </p>
                  <button onClick={() => navigate("Collection Simulator")}>
                    {sim
                      ? "Inspect collection playback"
                      : "Go to collection simulator"}
                  </button>
                </section>
              )}
              {(isSim || isAnalytics) && plan && (
                <RunProgress city={city} plan={plan} sim={sim} />
              )}
              {isSim && (
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
              {isAnalytics && (
                <>
                  <section className="panel">
                    <div className="section-heading">
                      <div>
                        <span className="eyebrow">
                          TRANSPARENT OPERATING ESTIMATES
                        </span>
                        <h3>Every kilometre accounted for.</h3>
                      </div>
                      <button onClick={openSettings}>
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
              {isSim && sim && (
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
            <span>
              Local workspace · Save city inputs · Export JSON backups
            </span>
            <span>
              {physical
                ? "PHYSICAL DATA · RECEIVER REQUIRED"
                : "LOCAL SIMULATION · NO CLOUD REQUIRED"}
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div
          className={`toast toast-${noticeKind}`}
          role={noticeKind === "error" ? "alert" : "status"}
        >
          {noticeKind === "error" ? (
            <AlertTriangle size={18} />
          ) : noticeKind === "success" ? (
            <Check size={18} />
          ) : (
            <CircleHelp size={18} />
          )}
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
            <h2 id="dialog-title">{dialog.saveAction ? "Save your city before switching?" : "Review this change"}</h2>
            <p>{dialog.message}</p>
            <div>
              <button autoFocus onClick={() => setDialog(null)}>
                Cancel
              </button>
              {dialog.saveAction && <button className="primary" onClick={() => guard(() => {dialog.saveAction!();setDialog(null);})}>Save & open</button>}
              <button
                className="danger"
                aria-label="Confirm"
                onClick={() => {
                  const action = dialog.action;
                  setDialog(null);
                  guard(action);
                }}
              >
                {dialog.saveAction ? "Discard & open" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
