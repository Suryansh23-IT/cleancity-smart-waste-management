import { describe, it, expect } from "vitest";
import { parsePhysical, staleReading } from "./physical";
describe("physical response handling", () => {
  const bin = {
    id: "BIN-001",
    label: "Lab 1",
    deviceId: "device-lab",
    distanceCm: 10,
    fillPercent: 50,
    receivedAt: "2026-11-05T10:00:00Z",
    history: [],
  };
  it("accepts only validated physical records, not simulation or malformed history", () => {
    expect(parsePhysical({ source: "PHYSICAL", bins: [bin] })).toEqual([bin]);
    expect(() => parsePhysical({ source: "SIMULATED", bins: [bin] })).toThrow();
    expect(() =>
      parsePhysical({
        source: "PHYSICAL",
        bins: [{ ...bin, fillPercent: 150 }],
      }),
    ).toThrow();
    expect(() =>
      parsePhysical({ source: "PHYSICAL", bins: [{ ...bin, history: null }] }),
    ).toThrow();
  });
  it("treats missing, invalid, old and future timestamps as stale", () => {
    const now = Date.parse("2026-11-05T10:00:20Z");
    expect(staleReading(bin.receivedAt, now)).toBe(false);
    expect(staleReading(null, now)).toBe(true);
    expect(staleReading("invalid", now)).toBe(true);
    expect(staleReading("2026-11-05T09:58:00Z", now)).toBe(true);
    expect(staleReading("2026-11-05T10:01:00Z", now)).toBe(true);
  });
});
