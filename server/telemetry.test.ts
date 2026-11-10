import { afterEach, describe, it, expect, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  boundedJson,
  fillFromDistance,
  tokenMatches,
  validatePayload,
} from "./telemetry";
import ingest from "../api/ingest";
import physical from "../api/physical";
const payload = {
  deviceId: "device-lab",
  bootId: "boot-123456",
  seq: 1,
  readings: [{ binId: "BIN-001", distanceCm: 10 }],
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("physical boundary", () => {
  it("keeps public physical reads disabled unless explicitly configured", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "server-only-test-value");
    vi.stubEnv("PUBLIC_PHYSICAL_DEMO", "false");
    const mock = vi.fn();
    vi.stubGlobal("fetch", mock);
    expect((await physical.fetch(new Request("http://local"))).status).toBe(
      503,
    );
    expect(mock).not.toHaveBeenCalled();
    vi.stubEnv("PUBLIC_PHYSICAL_DEMO", "true");
    mock.mockResolvedValue(Response.json([]));
    const response = await physical.fetch(new Request("http://local"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ source: "PHYSICAL", bins: [] });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("validates ranges, duplicate bins and sequence", () => {
    expect(validatePayload(payload)).toEqual(payload);
    expect(() =>
      validatePayload({
        ...payload,
        readings: [...payload.readings, ...payload.readings],
      }),
    ).toThrow();
    expect(() => validatePayload({ ...payload, seq: -1 })).toThrow();
    expect(() =>
      validatePayload({
        ...payload,
        readings: [{ binId: "BIN-001", distanceCm: 401 }],
      }),
    ).toThrow();
    expect(
      validatePayload({
        ...payload,
        readings: [{ binId: "BIN-001", distanceCm: null }],
      }).readings[0].distanceCm,
    ).toBe(null);
  });
  it("calibrates, clamps, and leaves invalid measurements unknown", () => {
    expect(fillFromDistance(23, 23, 2)).toBe(0);
    expect(fillFromDistance(12.5, 23, 2)).toBe(50);
    expect(fillFromDistance(2, 23, 2)).toBe(100);
    expect(fillFromDistance(20, 20, 4)).toBe(0);
    expect(fillFromDistance(4, 20, 4)).toBe(100);
    expect(fillFromDistance(12, 20, 4)).toBe(50);
    expect(fillFromDistance(2, 20, 4)).toBe(100);
    expect(fillFromDistance(null, 20, 4)).toBe(null);
    expect(() => fillFromDistance(4, 4, 20)).toThrow();
  });
  it("uses token hashes with constant-time comparison", () => {
    const token = "a".repeat(40),
      hash = createHash("sha256").update(token).digest("hex");
    expect(tokenMatches(token, hash)).toBe(true);
    expect(tokenMatches("b".repeat(40), hash)).toBe(false);
    expect(tokenMatches("short", hash)).toBe(false);
  });
  it("bounds bodies and content type", async () => {
    await expect(
      boundedJson(
        new Request("http://local", {
          method: "POST",
          body: "x".repeat(9000),
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ).rejects.toThrow("8192");
    await expect(
      boundedJson(new Request("http://local", { method: "POST", body: "{}" })),
    ).rejects.toThrow("application/json");
  });
  it("fails closed when unconfigured and rejects unsupported methods", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    expect(
      (await ingest.fetch(new Request("http://local", { method: "POST" })))
        .status,
    ).toBe(503);
    expect((await ingest.fetch(new Request("http://local"))).status).toBe(405);
    expect((await physical.fetch(new Request("http://local"))).status).toBe(
      503,
    );
  });
  it("requires device authentication and stores only through server RPC", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "server-only-test-value");
    const token = "a".repeat(40),
      hash = createHash("sha256").update(token).digest("hex"),
      mock = vi
        .fn()
        .mockResolvedValueOnce(
          Response.json([{ token_hash: hash, enabled: true }]),
        )
        .mockResolvedValueOnce(Response.json({ stored: true }));
    vi.stubGlobal("fetch", mock);
    const response = await ingest.fetch(
      new Request("http://local", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    );
    expect(response.status).toBe(200);
    expect(mock.mock.calls[1][0]).toContain("rpc/ingest_readings");
    expect((await response.json()).source).toBe("PHYSICAL");
  });
  it("rejects wrong device tokens without RPC writes", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "server-only-test-value");
    const mock = vi
      .fn()
      .mockResolvedValue(
        Response.json([{ token_hash: "0".repeat(64), enabled: true }]),
      );
    vi.stubGlobal("fetch", mock);
    expect(
      (
        await ingest.fetch(
          new Request("http://local", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${"b".repeat(40)}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }),
        )
      ).status,
    ).toBe(401);
    expect(mock).toHaveBeenCalledTimes(1);
  });
});
