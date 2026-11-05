// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import CityCanvas from "./CityCanvas";
import { preset } from "../core/presets";
it("preserves search zoom when an inspector changes the rendered map aspect ratio", async () => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  let resize: ResizeObserverCallback = () => {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(cb: ResizeObserverCallback) {
        resize = cb;
      }
      observe() {}
      disconnect() {}
    },
  );
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () =>
      root.render(
        <CityCanvas
          city={preset(10)}
          plan={null}
          simulation={null}
          selection={null}
          editing={false}
          onMove={() => {}}
          onSelect={() => {}}
          onCreate={() => {}}
        />,
      ),
    );
    const dimensions = (width: number) =>
      resize(
        [{ contentRect: { width, height: 650 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    await act(async () => dimensions(1000));
    const input = host.querySelector<HTMLInputElement>(
      'input[aria-label="Search map objects"]',
    )!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, "BIN-001");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>(".map-search-results button")!
        .click(),
    );
    expect(host.querySelector(".zoom span")?.textContent).toBe("180%");
    await act(async () => dimensions(730));
    expect(host.querySelector(".zoom span")?.textContent).toBe("180%");
    expect(host.querySelectorAll(".map-bin")).toHaveLength(10);
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
