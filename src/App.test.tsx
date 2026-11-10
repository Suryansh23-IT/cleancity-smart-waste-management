// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { preset } from "./core/presets";
import { autoZone } from "./core/zoning";
import { saveLibrary, loadLibrary } from "./core/storage";
import { parseCity } from "./core/model";
import {showcaseCity} from './core/showcase';

// Large map workflows render hundreds of accessible SVG objects in jsdom.
vi.setConfig({ testTimeout: 15000 });

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root, container: HTMLDivElement;
const text = () => container.textContent ?? "";
function button(name: string): HTMLButtonElement {
  const element = [...container.querySelectorAll("button")].find(
    (b) =>
      b.getAttribute("aria-label") === name || b.textContent?.trim() === name,
  );
  if (!element) throw Error(`Missing button: ${name}`);
  return element;
}
async function click(name: string) {
  await act(async () => button(name).click());
}
async function value(
  element: HTMLInputElement | HTMLSelectElement,
  value: string,
) {
  await act(async () => {
    const proto =
      element instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : HTMLSelectElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(element, value);
    element.dispatchEvent(
      new Event(element instanceof HTMLInputElement ? "input" : "change", {
        bubbles: true,
      }),
    );
  });
}
async function mount() {
  await act(async () => root.render(<App />));
}
beforeEach(() => {
  localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("municipal UI integration (DOM, not graphical browser)", () => {
  it('restores the selected Wi-Fi feed and displays uncalibrated live distances', async () => {
    const at=new Date().toISOString();
    const bin={id:'BIN-001',label:'Sensor 1',deviceId:'device-example',distanceCm:12.34,fillPercent:null,receivedAt:at,sampledAt:at,readingId:'a'.repeat(64)+':BIN-001',status:'VALID',history:[]};
    localStorage.setItem('cleancity.physical.source','wifi');
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,headers:new Headers({'content-type':'application/json'}),json:async()=>({source:'PHYSICAL',origin:'CLOUD_WIFI',staleAfterMs:45000,bins:[bin]})}));
    await mount(); await click('Physical IoT Lab');
    expect(text()).toContain('Connected · receiving live Wi-Fi readings');
    expect(container.querySelector('.bin-gauge .gauge strong')?.textContent).toBe('12.3 cm');
    expect(text()).toContain('DISTANCE · NOT CALIBRATED');
    expect(text()).not.toContain('Sign in to view readings');
  });
  it('keeps per-bin alert levels separate and derives distances from each calibration', async () => {
    const at = new Date().toISOString();
    const bins = [1,2].map(i => ({id:`BIN-00${i}`,label:`Sensor ${i}`,deviceId:'fixture',distanceCm:12.5,fillPercent:70,receivedAt:at,status:'VALID',calibration:{emptyDistanceCm:30,usableDepthCm:25},history:[]}));
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,headers:new Headers({'content-type':'application/json'}),json:async()=>({source:'PHYSICAL',origin:'LOCAL_USB',staleAfterMs:10000,receiver:{connected:true,error:null},bins})}));
    await mount(); await click('Physical IoT Lab');
    const cards=container.querySelectorAll('.bin-gauge');
    expect(cards[0].textContent).toContain('70.0%');
    expect(cards[0].textContent).toContain('70%: 12.5 cm');
    expect(cards[0].textContent).toContain('90%: 7.5 cm');
    await value(container.querySelector('[aria-label="BIN-001 orange threshold"]')!, '60');
    await click('Save BIN-001 alert levels');
    expect(cards[0].textContent).toContain('60% orange / 90% red');
    expect(cards[0].textContent).toContain('60%: 15.0 cm');
    expect(cards[1].textContent).toContain('70% orange / 90% red');
    expect(JSON.parse(localStorage.getItem('cleancity.lab.binThresholds')!)).toEqual({'BIN-001':{pickup:60,urgent:90}});
  });
  it('shows individual fill depth and sensor offset and saves their sum as empty distance', async () => {
    const at=new Date().toISOString();
    const bins=[1,2,3,4].map(i=>({id:`BIN-00${i}`,label:`Sensor ${i}`,deviceId:'fixture',distanceCm:14.5,fillPercent:50,receivedAt:at,status:'VALID',calibration:{emptyDistanceCm:27,usableDepthCm:25},history:[]}));
    const fetcher=vi.fn().mockImplementation((_url, options)=>options?.method==='PUT' ? Promise.resolve({ok:true,json:async()=>({})}) : Promise.resolve({ok:true,headers:new Headers({'content-type':'application/json'}),json:async()=>({source:'PHYSICAL',origin:'LOCAL_USB',staleAfterMs:10000,receiver:{connected:true,error:null},bins})}));
    vi.stubGlobal('fetch',fetcher); await mount(); await click('Physical IoT Lab');
    expect((container.querySelector('[aria-label="BIN-001 dustbin height"]') as HTMLInputElement).value).toBe('25');
    expect((container.querySelector('[aria-label="BIN-001 sensor offset"]') as HTMLInputElement).value).toBe('2');
    expect(container.querySelectorAll('[aria-label$="individual calibration"]')).toHaveLength(4);
    await value(container.querySelector('[aria-label="BIN-001 dustbin height"]')!, '20');
    await click('Save BIN-001 calibration');
    const put=fetcher.mock.calls.find((call:any[])=>call[1]?.method==='PUT');
    expect(put?.[0]).toBe('/api/physical/calibration/BIN-001');
    expect(JSON.parse(put?.[1].body)).toEqual({emptyDistanceCm:22,usableDepthCm:20});
    expect((container.querySelector('[aria-label="BIN-002 dustbin height"]') as HTMLInputElement).value).toBe('25');
  });
  it('shows valid uncalibrated local distance, distance history and calibration controls',async()=>{
    const at=new Date().toISOString();
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,headers:new Headers({'content-type':'application/json'}),json:async()=>({source:'PHYSICAL',origin:'LOCAL_USB',staleAfterMs:10000,receiver:{connected:true,error:null},bins:[{id:'BIN-001',label:'TEST channel',deviceId:'TEST-fixture',distanceCm:20.22,fillPercent:null,receivedAt:at,status:'VALID',calibration:null,history:[{receivedAt:at,distanceCm:20.22,fillPercent:null,status:'VALID'}]}]})}));
    await mount();await click('Physical IoT Lab');expect(text()).toContain('VALID · NOT CALIBRATED');expect(text()).toContain('LOCAL PHYSICAL');expect(text()).toContain('20.2 cm');expect(text()).not.toContain('INVALID READING');expect(container.querySelector('[aria-label="BIN-001 recent distance history"]')?.textContent).toContain('20.22 cm');expect(container.querySelector('[aria-label="BIN-001 sensor offset"]')).not.toBeNull();
  });
  it('changes demo demand with one click while preserving roads zones and fleet',async()=>{
    await mount();await click('Zone & Fleet Operations');await click('Save scenario');
    const before=loadLibrary(localStorage)[0];await click('Next seed · new demand');await click('Save scenario');
    const after=loadLibrary(localStorage)[0];expect(after.settings.seed).toBe(before.settings.seed+1);
    expect(after.nodes).toEqual(before.nodes);expect(after.roads).toEqual(before.roads);expect(after.zones).toEqual(before.zones);expect(after.trucks).toEqual(before.trucks);
    expect(after.bins.map(b=>b.fillPercent)).not.toEqual(before.bins.map(b=>b.fillPercent));
  });
  it('keeps dispatch review and results tied to modeled inputs and protects fleet drafts',async()=>{
    await mount();await click('Zone & Fleet Operations');
    expect(text()).toContain('Truck routes & pickup assignments');
    expect(container.querySelectorAll('.head-choice input:checked')).toHaveLength(3);
    await value(container.querySelector('.fleet-editor input[name="capacity"]')!,'4');
    await click('Save scenario');expect(text()).toContain("Apply the open form's Save button first");
    await click('Save Truck 01');await click('Plan collection');
    expect(container.querySelector('[aria-label="Dispatch review"]')).not.toBeNull();
    await click('Review simulation');await click('Start collection');await click('Pause');
    expect(text()).toContain('Collection paused');
    await click('Finish run');await click('View collection analysis');
    expect(container.querySelector('[aria-label="Results overview"]')).not.toBeNull();
    expect(text()).toContain('summed vehicle hours');expect(text()).toContain('runs stay in this tab unless explicitly saved');
    const workload = container.querySelector('[aria-label="Zone workload"]');
    expect(workload?.textContent).toContain('reflect the collection inputs');
    expect([...workload!.querySelectorAll("tbody tr")].some((row) =>
      Number.parseFloat(row.querySelectorAll("td")[3].textContent ?? "0") > 0,
    )).toBe(true);
  });
  it('shows four honest physical slots without manufacturing sensor values',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:503}));
    await mount();await click('Physical IoT Lab');
    expect(container.querySelectorAll('.bin-gauge')).toHaveLength(4);
    expect(text()).toContain('Telemetry receiver is not configured or unavailable');
    expect(text().match(/NO READING/g)).toHaveLength(4);
    expect(text()).not.toContain('Supabase');expect(text()).toContain('Four physical channels · separate from simulated collection');
  });
  it("explains a non-JSON receiver outage without leaking parser errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Offline</html>", { status: 503 })));
    await mount();
    await click("Physical IoT Lab");
    await click("Detect ports");
    const controls = container.querySelector('[aria-label="USB serial connection"]');
    expect(controls?.textContent).toContain("Local receiver unavailable");
    expect(controls?.textContent).not.toContain("Unexpected token");
  });
  it('distinguishes invalid, stale and absent physical contract readings',async()=>{
    const history:never[]=[];
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,headers:new Headers({'content-type':'application/json'}),json:async()=>({source:'PHYSICAL',bins:[
      {id:'BIN-001',label:'Test invalid',deviceId:'fixture',receivedAt:new Date().toISOString(),distanceCm:null,fillPercent:null,history},
      {id:'BIN-002',label:'Test stale',deviceId:'fixture',receivedAt:new Date(Date.now()-120000).toISOString(),distanceCm:12,fillPercent:50,history}
    ]})}));
    await mount();await click('Physical IoT Lab');
    expect(text()).toContain('INVALID READING');expect(text()).toContain('STALE');
    expect(text().match(/NO READING/g)).toHaveLength(2);
    expect(text()).toContain('LAST RECEIVED VALUE');
  });
  it("does not claim city persistence for unapplied inspector fields", async () => {
    await mount();await click('City Studio');
    await act(async()=>container.querySelector<HTMLButtonElement>('.studio-object-list button')!.click());
    await value(container.querySelector('.inspector input[name="name"]')!,'Draft bin name');
    await click('Save scenario');
    expect(text()).toContain("Apply the open form's Save button first");
    expect(loadLibrary(localStorage)).toHaveLength(0);
    await click('Cities');expect(container.querySelector('.modal')).not.toBeNull();
    await click('Cancel');expect(container.querySelector('.inspector input[name="name"]')).not.toBeNull();
    await click('Save changes');await click('Save scenario');
    expect(loadLibrary(localStorage)[0].bins[0].name).toBe('Draft bin name');
  });
  it("creates connected assets through named beginner forms and undoes a bin addition", async () => {
    await mount();await click('City Studio');await click('New city');
    if(container.querySelector('.modal'))await click('Confirm');
    const create = async(kind:string,name:string)=>{
      await click(`+ ${kind}`);
      const form=container.querySelector<HTMLFormElement>('.studio-create-form')!;
      await value(form.querySelector('input[name="name"]')!,name);
      await act(async()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    };
    await create('Junction','Library');await create('Junction','Station');
    await create('Road','Library Road');
    await create('Bin','Library bin');
    await click('Save scenario');
    const c=loadLibrary(localStorage)[0];
    expect(c.nodes.map(n=>n.label)).toEqual(['Library','Station']);
    expect(c.nodes[0].x).not.toBe(c.nodes[1].x);
    expect(c.roads).toHaveLength(2);
    expect(c.roads[0].fromNodeId).toBe(c.roads[1].toNodeId);
    expect(c.bins[0].name).toBe('Library bin');
    await click('Undo edit');await click('Save scenario');
    expect(loadLibrary(localStorage)[0].bins).toHaveLength(0);
  });
  it("saves the current draft before opening a different city", async () => {
    await mount();await click('City Studio');await click('New city');
    if(container.querySelector('.modal'))await click('Confirm');
    await click('Cities');await click('Templates 6');await click('View Willowbridge Riverside');
    expect(container.querySelector('.modal')?.textContent).toContain('Save & open');
    await click('Save & open');
    expect(loadLibrary(localStorage)).toHaveLength(1);
    expect(text()).toContain('Willowbridge Riverside');
  });
  it("opens an independent curated city copy and saves it without changing existing cities", async () => {
    saveLibrary(localStorage, [preset(10)]);
    await mount();
    await click("Cities");
    await click("Templates 6");
    expect(container.querySelectorAll(".city-library-card")).toHaveLength(6);
    await click("View Willowbridge Riverside");
    expect(text()).toContain("Willowbridge Riverside");
    await click("Save scenario");
    const saved=loadLibrary(localStorage);
    expect(saved).toHaveLength(2);
    expect(saved.some(c=>c.name==='Willowbridge Riverside' && c.bins.length===32)).toBe(true);
    expect(saved.some(c=>c.id===preset(10).id)).toBe(true);
    await click("Cities");
    await click("Templates 6");
    await click("Duplicate Willowbridge Riverside");
    expect(text()).toContain("Willowbridge Riverside copy");
    await click("Save scenario");
    expect(loadLibrary(localStorage)).toHaveLength(3);
  });
  it("creates a named empty city and deletes only its browser save", async () => {
    await mount();
    await click("Cities"); await click("Create city");
    const form=container.querySelector('.create-city-panel form')!;
    await value(form.querySelector('input[name="name"]')!,"Acceptance Borough");
    await value(form.querySelector('select[name="bins"]')!,"0");
    await act(async()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    expect(text()).toContain('Acceptance Borough');
    await click("Save scenario"); await click("Cities");
    await click("My cities 1");
    await click("Rename city");
    await value(container.querySelector('.city-rename-form input')!,"Acceptance Borough renamed");
    await act(async()=>container.querySelector('.city-rename-form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    expect(loadLibrary(localStorage)[0].name).toBe("Acceptance Borough renamed");
    await click("Delete saved Acceptance Borough renamed");await click("Confirm");
    expect(loadLibrary(localStorage)).toHaveLength(0);
    expect(text()).toContain('Acceptance Borough');
  });
  it("finds bins through Studio's object list without changing graph data", async () => {
    await mount();await click('City Studio');
    const before=container.querySelectorAll('.map-road').length;
    const input=container.querySelector<HTMLInputElement>('[aria-label="Find an object to edit"]')!;
    await value(input,'BIN-001');
    expect(container.querySelectorAll('.studio-object-list button')).toHaveLength(1);
    await act(async()=>container.querySelector<HTMLButtonElement>('.studio-object-list button')!.click());
    expect(container.querySelector('.inspector input[name="name"]')).not.toBeNull();
    expect(container.querySelectorAll('.map-road')).toHaveLength(before);
  });
  it('does not treat uncaptured showcase sensor placeholders as known pickup demand',async()=>{
    saveLibrary(localStorage,[showcaseCity()]);await mount();
    expect(container.querySelector('.mission-banner')?.textContent).toContain('No snapshot captured');
    expect(container.querySelector('.dashboard-kpis')?.textContent).toContain('Demand awaits snapshot');
    expect(button('Plan pickups').disabled).toBe(true);
    await click('Capture showcase snapshot');await click('Preview TEST fixtures');await click('Confirm TEST snapshot');await click('Dashboard');
    expect(container.querySelector('.mission-banner')?.textContent).toContain('TEST fixture snapshot');
    expect(container.querySelector('.dashboard-kpis')?.textContent).toContain('4 require pickup');
  });
  it("introduces the municipal use case, filters real exceptions and replans after an operator fixes one", async () => {
    await mount();
    expect(text()).toContain("Simulated municipal data · Local workspace");
    expect(container.querySelector('.dashboard-brief')?.textContent).toContain('Ready with exceptions');
    expect(container.querySelector('.plan-strip')?.textContent).toContain('Not comparable');
    expect(button("Start simulation").disabled).toBe(false);
    await act(async () =>
      container.querySelector<HTMLButtonElement>(".urgent-kpi")!.click(),
    );
    expect(container.querySelectorAll(".review-table tbody tr")).toHaveLength(
      15,
    );
    const alert = [
      ...container.querySelectorAll<HTMLButtonElement>(
        ".attention-panel>button",
      ),
    ].find((b) => b.textContent?.includes("cannot be served"))!;
    await act(async () => alert.click());
    expect(container.querySelectorAll(".review-table tbody tr")).toHaveLength(
      1,
    );
    expect(
      container.querySelector(".review-table")?.textContent?.toLowerCase(),
    ).toContain("capacity");
    await click("Inspect BIN-001");
    expect(
      container.querySelector<HTMLFieldSetElement>(".inspector fieldset")!
        .disabled,
    ).toBe(true);
    await click("Edit selected object");
    await value(
      container.querySelector('.inspector input[name="capacity"]')!,
      "1",
    );
    await click("Save changes");
    await click("Dashboard");
    expect(button("Plan collection").disabled).toBe(false);
    await click("Plan collection");
    expect(text()).toContain("0 pending bins");
  }, 20000);
  it("runs the demo to actual results and reloads city data without inventing persisted run history", async () => {
    await mount();
    await click("Start simulation");
    await click("Pause");
    await click("Finish run");
    await click("Dashboard");
    expect(container.querySelector(".result-preview")?.textContent).toContain(
      "24 collected",
    );
    expect(container.querySelector(".result-preview")?.textContent).toContain(
      "1 unserved",
    );
    await click("View results");
    expect(container.querySelector(".canvas-wrap")).toBe(null);
    expect(text()).toContain("Collection cycle complete");
    expect(
      container.querySelector('table[aria-label="Operational comparison"]'),
    ).toBeTruthy();
    await click("Save scenario");
    const saved = loadLibrary(localStorage)[0];
    expect(saved.bins.filter((b) => b.fillPercent === 0)).toHaveLength(24);
    expect(saved.zones).toHaveLength(3);
    await act(async () => root.unmount());
    root = createRoot(container);
    await mount();
    expect(text()).toContain("Greenfield municipal demo");
    expect(button("Plan collection").disabled).toBe(false);
    await click("Analytics");
    expect(text()).toContain("Plan estimates · collection not run");
    expect(container.querySelector(".run-progress")).toBe(null);
  }, 20000);
  it("protects saved cities and unsaved edits when opening the guided demo", async () => {
    const existing = preset(10);
    saveLibrary(localStorage, [existing]);
    await mount();
    await click("City Studio");
    await click("Randomize fill levels");
    await click("Open guided demo");
    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    await click("Cancel");
    expect(container.querySelectorAll(".map-bin")).toHaveLength(10);
    expect(loadLibrary(localStorage)).toEqual([existing]);
    await click("Open guided demo");
    await click("Confirm");
    expect(text()).toContain("Greenfield municipal demo");
    await click("Save scenario");
    expect(loadLibrary(localStorage)).toHaveLength(2);
    expect(loadLibrary(localStorage).find((c) => c.id === existing.id)).toEqual(
      existing,
    );
  });
  it("edits fleet availability on the operations page and invalidates the dashboard plan", async () => {
    await mount();
    await click("Zone & Fleet Operations");
    const summary = container.querySelector<HTMLElement>(
      ".fleet-editor summary",
    )!;
    await act(async () => summary.click());
    await act(async () =>
      container
        .querySelector<HTMLInputElement>(
          '.fleet-editor input[name="available"]',
        )!
        .click(),
    );
    await click("Save Truck 01");
    await click("Dashboard");
    expect(
      container.querySelectorAll(".situation-kpi")[3].textContent,
    ).toContain("4 available");
    expect(button("Plan collection").disabled).toBe(false);
    await click("Analytics");
    expect(container.querySelector(".canvas-wrap")).toBe(null);
    expect(container.querySelector(".fleet-manager")).toBe(null);
    await click("Show help");
    expect(text()).toContain("Your collection workflow");
  });
  it("applies one bulk fill operation reversibly and searches/declutters without editing", async () => {
    saveLibrary(localStorage, [preset(100)]);
    await mount();
    await click("City Studio");
    const form =
      container.querySelectorAll<HTMLFormElement>(".studio-tools form")[3];
    await value(form.querySelector('input[name="fill"]')!, "88");
    await click("Apply bulk fill");
    await click("Save scenario");
    expect(
      loadLibrary(localStorage)[0].bins.every((b) => b.fillPercent === 88),
    ).toBe(true);
    await click("Undo edit");
    await click("Save scenario");
    expect(
      loadLibrary(localStorage)[0].bins.some((b) => b.fillPercent !== 88),
    ).toBe(true);
    await click("Redo edit");
    await click("Save scenario");
    expect(
      loadLibrary(localStorage)[0].bins.every((b) => b.fillPercent === 88),
    ).toBe(true);
    const svg = container.querySelector(".canvas-wrap > svg")!;
    const initial = svg.getAttribute("viewBox");
    await click("Zoom in");
    expect(svg.getAttribute("viewBox")).not.toBe(initial);
    await click("Reset camera");
    expect(svg.getAttribute("viewBox")).toBe(initial);
    await value(
      container.querySelector('input[aria-label="Search map objects"]')!,
      "BIN-100",
    );
    await click("bin · BIN-100");
    expect(container.querySelector(".inspector h3")?.textContent).toBe(
      "BIN-100",
    );
    const bins = [
      ...container.querySelectorAll<HTMLInputElement>(".map-layers input"),
    ][2];
    await act(async () => bins.click());
    expect(container.querySelectorAll(".map-bin")).toHaveLength(0);
    await act(async () => bins.click());
    expect(container.querySelectorAll(".map-bin")).toHaveLength(100);
  });
  it("keeps View inspectors read-only and preserves zones, restrictions and plans after a rename", async () => {
    const c = preset(10);
    c.zones = autoZone(c, ["n0", "n3", "n6"]).zones;
    c.trucks[0].zoneId = c.zones[0].id;
    saveLibrary(localStorage, [c]);
    await mount();
    await click("Collection Simulator");
    await click("Optimize all zones");
    await click("Dashboard");
    await act(async () =>
      container
        .querySelector(".map-node")!
        .dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
        ),
    );
    expect(
      container.querySelector<HTMLFieldSetElement>(".inspector fieldset")!
        .disabled,
    ).toBe(true);
    expect(container.querySelector(".inline-edit-tools")).toBe(null);
    await click("Edit map");
    await value(
      container.querySelector('.inspector input[name="label"]')!,
      "Renamed municipal head",
    );
    await click("Save changes");
    await click("Dashboard");
    expect(button("Start simulation").disabled).toBe(false);
    await click("City Studio");
    await click("Save scenario");
    const saved = loadLibrary(localStorage)[0];
    expect(saved.zones).toEqual(c.zones);
    expect(saved.trucks).toEqual(c.trucks);
    expect(saved.nodes[0].label).toBe("Renamed municipal head");
    await click("Undo edit");
    await click("Save scenario");
    expect(loadLibrary(localStorage)[0].nodes[0].label).toBe(c.nodes[0].label);
    await click("Redo edit");
    await click("Save scenario");
    expect(loadLibrary(localStorage)[0].nodes[0].label).toBe(
      "Renamed municipal head",
    );
  });
  it("traps modal focus and cancels safely with Escape", async () => {
    saveLibrary(localStorage, [preset(100)]);
    await mount();
    await click("City Studio");
    await click("Reset scenario");
    const cancel = button("Cancel"),
      confirm = button("Confirm");
    cancel.focus();
    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    expect(document.activeElement).toBe(confirm);
    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(container.querySelector('[role="dialog"]')).toBe(null);
    expect(container.querySelectorAll(".map-bin")).toHaveLength(100);
  });
  it("shows both forecast horizons and original planned distance alongside progress", async () => {
    const c = preset(10);
    c.zones = autoZone(c, ["n0", "n3", "n6"]).zones;
    saveLibrary(localStorage, [c]);
    await mount();
    await click("Analytics");
    expect(text()).toContain("Pickup ≥80%");
    expect(text()).toContain("Urgent ≥90%");
    await click("Collection Simulator");
    await click("Optimize all zones");
    await click("Analytics");
    expect(text()).toContain("Distance travelled");
    expect(text()).toContain("Remaining stops");
    expect(
      container.querySelector('table[aria-label="Operational comparison"]'),
    ).toBeTruthy();
  });
  it("shows a clear offline message when static hosting returns HTML for the physical API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
      }),
    );
    await mount();
    await click("Physical IoT Lab");
    expect(text()).toContain("Physical telemetry endpoint is unavailable");
    expect(text()).not.toContain("Unexpected token");
  });
  it("recovers physical polling through StrictMode cleanup without getting stuck loading", async () => {
    await act(async () =>
      root.render(
        <StrictMode>
          <App />
        </StrictMode>,
      ),
    );
    await click("Physical IoT Lab");
    expect(text()).toContain("Telemetry receiver is not configured or unavailable");
    expect(button("Refresh").disabled).toBe(false);
  });
  it("walks 100-bin zoning, randomization, planning, playback, save and reload", async () => {
    saveLibrary(localStorage, [preset(100)]);
    await mount();
    await click("Zone & Fleet Operations");
    const heads = [
      ...container.querySelectorAll<HTMLInputElement>(".head-choice input"),
    ];
    for (const head of heads.slice(0, 3)) await act(async () => head.click());
    await click("Generate zones");
    expect(container.querySelectorAll(".zone-card")).toHaveLength(3);
    await click("City Studio");
    await click("Randomize fill levels");
    await click("Collection Simulator");
    await click("Optimize all zones");
    expect(text()).toContain("Trip schedule & pending work");
    expect(button("Start collection").disabled).toBe(false);
    await click("Start collection");
    await click("Pause");
    const progress = container.querySelector("progress")!;
    expect(progress.value).toBe(0);
    await click("Step +1 min");
    expect(container.querySelector("progress")!.value).toBe(1);
    await click("Reset run");
    expect(button("Start collection").disabled).toBe(false);
    await click("Save scenario");
    const saved = loadLibrary(localStorage);
    expect(saved[0].zones).toHaveLength(3);
    expect(saved[0].bins).toHaveLength(100);
    await act(async () => root.unmount());
    root = createRoot(container);
    await mount();
    await click("Zone & Fleet Operations");
    expect(container.querySelectorAll(".zone-card")).toHaveLength(3);
    expect(text()).toContain("Newhaven Metro");
  }, 20000);
  it("renders all six sections and physical failures without inventing data", async () => {
    await mount();
    for (const name of [
      "City Studio",
      "Zone & Fleet Operations",
      "Collection Simulator",
      "Analytics",
      "Dashboard",
    ]) {
      await click(name);
      expect(container.querySelector("h1")).toBeTruthy();
    }
    await click("Physical IoT Lab");
    expect(text()).toContain("NO VERIFIED DATA");
    expect(container.querySelectorAll(".bin-gauge")).toHaveLength(4);
    expect(text()).toContain("Telemetry receiver is not configured or unavailable");
    expect(container.querySelector(".canvas-wrap")).toBe(null);
  });
  it("edits a directed road, clears zones/plans, and supports undo/redo", async () => {
    const c = preset(10);
    c.zones = autoZone(c, ["n0", "n3", "n6"]).zones;
    saveLibrary(localStorage, [c]);
    await mount();
    await click("Collection Simulator");
    await click("Optimize all zones");
    await click("City Studio");
    await act(async () =>
      container
        .querySelector(".road")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    const input = container.querySelector<HTMLInputElement>(
      'input[name="distance"]',
    )!;
    await value(input, "1.75");
    await click("Save changes");
    expect(text()).toContain("Road graph changed");
    await click("Save scenario");
    expect(loadLibrary(localStorage)[0].zones).toHaveLength(0);
    await click("Collection Simulator");
    expect(button("Start collection").disabled).toBe(true);
    await click("City Studio");
    await click("Undo edit");
    await click("Save scenario");
    expect(loadLibrary(localStorage)[0].zones).toHaveLength(3);
    await click("Redo edit");
    await click("Save scenario");
    expect(loadLibrary(localStorage)[0].zones).toHaveLength(0);
    expect(loadLibrary(localStorage)[0].roads[0].distanceKm).toBe(1.75);
  });
  it("creates a blank city, adds a head and bin, and saves edited bin values", async () => {
    await mount();
    await click("New city");
    await click("Node");
    await value(container.querySelector('select[name="type"]')!, "HEAD");
    await click("Save changes");
    await click("+ Place bin here");
    await value(
      container.querySelector('.inspector input[name="fill"]')!,
      "92",
    );
    await click("Save changes");
    await click("Save scenario");
    const c = loadLibrary(localStorage)[0];
    expect(c.nodes).toHaveLength(1);
    expect(c.nodes[0].type).toBe("HEAD");
    expect(c.bins[0].fillPercent).toBe(92);
    expect(parseCity(JSON.stringify(c))).toEqual(c);
  });
  it("retains readable feedback when a referenced node cannot be deleted", async () => {
    saveLibrary(localStorage, [preset(100)]);
    await mount();
    await click("City Studio");
    await act(async () =>
      container
        .querySelector(".map-node")!
        .dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
        ),
    );
    await click("Delete node");
    await click("Confirm");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Remove connected roads",
    );
    expect(container.querySelectorAll(".map-node")).toHaveLength(100);
  });
  it("preserves corrupt local data rather than silently overwriting it on Save", async () => {
    localStorage.setItem("cleancity.scenarios.v1", "broken");
    await mount();
    await click("Save scenario");
    expect(localStorage.getItem("cleancity.scenarios.v1")).toBe("broken");
    expect(text()).toContain("Saved data is unreadable");
  });
});
