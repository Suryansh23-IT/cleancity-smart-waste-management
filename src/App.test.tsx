// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { preset } from "./core/presets";
import { autoZone } from "./core/zoning";
import { saveLibrary, loadLibrary } from "./core/storage";
import { parseCity } from "./core/model";

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
  it("introduces the municipal use case, filters real exceptions and replans after an operator fixes one", async () => {
    await mount();
    expect(text()).toContain("SIMULATED MUNICIPAL DATA");
    expect(text()).toContain("Know what needs collecting");
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
    expect(text()).toContain("Physical cloud endpoint is unavailable");
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
    expect(text()).toContain("Cloud is not configured");
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
    expect(text()).toContain("Cloud is not configured");
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
