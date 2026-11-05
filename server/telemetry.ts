import { createHash, timingSafeEqual } from "node:crypto";
export interface Payload {
  deviceId: string;
  bootId: string;
  seq: number;
  readings: { binId: string; distanceCm: number | null }[];
}
export function validatePayload(input: unknown): Payload {
  const p = input as Payload;
  if (
    !p ||
    typeof p !== "object" ||
    !/^device-[a-zA-Z0-9-]{1,48}$/.test(p.deviceId) ||
    !/^[-a-zA-Z0-9]{8,64}$/.test(p.bootId) ||
    !Number.isSafeInteger(p.seq) ||
    p.seq < 0 ||
    !Array.isArray(p.readings) ||
    p.readings.length < 1 ||
    p.readings.length > 4
  )
    throw Error("Invalid device, boot, sequence or readings");
  if (new Set(p.readings.map((r) => r?.binId)).size !== p.readings.length)
    throw Error("Duplicate bin reading");
  for (const r of p.readings)
    if (
      !r ||
      !/^BIN-00[1-4]$/.test(r.binId) ||
      (r.distanceCm !== null &&
        (!Number.isFinite(r.distanceCm) ||
          r.distanceCm < 2 ||
          r.distanceCm > 400))
    )
      throw Error("Distance must be null or 2–400 cm");
  return p;
}
export function tokenMatches(token: string, hash: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(hash) || token.length < 32 || token.length > 256)
    return false;
  return timingSafeEqual(
    createHash("sha256").update(token).digest(),
    Buffer.from(hash, "hex"),
  );
}
export function fillFromDistance(
  distance: number | null,
  empty: number,
  full: number,
): number | null {
  if (distance === null) return null;
  if (!(empty > full && full >= 2 && empty <= 400))
    throw Error("Invalid calibration");
  return Math.max(
    0,
    Math.min(100, ((empty - distance) / (empty - full)) * 100),
  );
}
export async function boundedJson(request: Request): Promise<unknown> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw Error("Use application/json");
  const reader = request.body?.getReader();
  if (!reader) throw Error("Missing body");
  const parts: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) {
      await reader.cancel();
      throw Error("Payload exceeds 8192 bytes");
    }
    parts.push(value);
  }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}
export function databaseReady() {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SECRET_KEY;
}
export async function database(path: string, init: RequestInit = {}) {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    signal: AbortSignal.timeout(10000),
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY!,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) throw Error(`Database request failed (${response.status})`);
  return response.json();
}
export const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
