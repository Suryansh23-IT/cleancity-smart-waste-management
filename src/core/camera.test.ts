import { expect, it } from "vitest";
import { screenToWorld, panCamera } from "./camera";
it("converts screen hits using inverse SVG transforms including page offsets and zoom", () => {
  expect(
    screenToWorld(
      { x: 320, y: 250 },
      { a: 2, b: 0, c: 0, d: 2, e: -400, f: -300 },
      { width: 1100, height: 720 },
    ),
  ).toEqual({ x: 240, y: 200 });
  expect(
    screenToWorld(
      { x: 320, y: 250 },
      { a: 0.5, b: 0, c: 0, d: 0.5, e: 200, f: 30 },
      { width: 1100, height: 720 },
    ),
  ).toEqual({ x: 360, y: 155 });
  expect(
    screenToWorld(
      { x: -900, y: 2500 },
      { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      { width: 1100, height: 720 },
    ),
  ).toEqual({ x: 0, y: 720 });
});
it("pans by the rendered SVG scale rather than the letterboxed element dimensions", () => {
  expect(
    panCamera({ x: 100, y: 200 }, { x: 400, y: 600 }, { x: 460, y: 570 }, 0.5),
  ).toEqual({ x: -20, y: 260 });
  expect(
    panCamera({ x: 100, y: 200 }, { x: 400, y: 600 }, { x: 460, y: 570 }, 2),
  ).toEqual({ x: 70, y: 215 });
});
