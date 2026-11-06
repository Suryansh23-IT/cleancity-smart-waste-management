import type { ShowcaseSnapshot } from './showcase';
export type NodeType = "INTERSECTION" | "HEAD" | "OPTIONAL_UNLOADING_POINT";
export interface RoadNode {
  id: string;
  label: string;
  x: number;
  y: number;
  type: NodeType;
}
export interface Road {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  distanceKm: number;
  speedGrade?: number;
  roadClass?: "ARTERIAL" | "LOCAL";
  name?: string;
}
export interface Reading {
  time: number;
  fill: number;
}
export interface Bin {
  id: string;
  name: string;
  roadNodeId: string;
  position?: { x: number; y: number };
  fillPercent: number;
  capacityBinUnits: number;
  source: "SIMULATED";
  history: Reading[];
}
export interface Zone {
  id: string;
  name: string;
  color: string;
  headNodeId: string;
  nodeIds: string[];
  binIds: string[];
  manual: boolean;
}
export interface Truck {
  id: string;
  label: string;
  capacityBinUnits: number;
  speedGrade: number;
  zoneId?: string;
  available: boolean;
}
export interface Settings {
  strictZoneRouting?: boolean;
  zoneCount: number;
  pickupThreshold: number;
  urgentThreshold: number;
  costPerKmINR: number;
  costPerHourINR: number;
  speeds: number[];
  serviceMinutes: number;
  unloadingMinutes: number;
  seed: number;
}
export interface City {
  showcase?: boolean;
  showcaseSnapshot?: ShowcaseSnapshot;
  version: 1;
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  nodes: RoadNode[];
  roads: Road[];
  bins: Bin[];
  zones: Zone[];
  trucks: Truck[];
  settings: Settings;
  preset?: number;
}
export const colors = [
  "#62d7af",
  "#9d9aff",
  "#ffbc70",
  "#66b9ff",
  "#f189ad",
  "#d1d77a",
];
export const defaults: Settings = {
  zoneCount: 3,
  pickupThreshold: 80,
  urgentThreshold: 90,
  costPerKmINR: 18,
  costPerHourINR: 100,
  speeds: [10, 15, 20, 25, 30],
  serviceMinutes: 2,
  unloadingMinutes: 5,
  seed: 42,
};
export const uid = (prefix: string) =>
  `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
export const clone = <T>(x: T): T => structuredClone(x);
export function status(
  fill: number | null,
  settings = defaults,
  stale = false,
) {
  return stale
    ? "STALE"
    : fill === null || !Number.isFinite(fill) || fill < 0 || fill > 100
      ? "UNKNOWN"
      : fill >= settings.urgentThreshold
        ? "URGENT"
        : fill >= settings.pickupThreshold
          ? "COLLECTION_NEEDED"
          : "NORMAL";
}
export function validateCity(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object") return ["City must be an object"];
  const c = value as City;
  if (c.version !== 1) errors.push("Unsupported city version");
  if (c.preset !== undefined && ![10, 20, 50, 100].includes(c.preset))
    errors.push("Unsupported preset reference");
  const label = (s: unknown) =>
    typeof s === "string" && s.trim().length > 0 && s.length <= 160;
  if (
    !label(c.id) ||
    !label(c.name) ||
    typeof c.description !== "string" ||
    c.description.length > 2000
  )
    errors.push("Invalid city identity/description");
  if (
    ![c.width, c.height].every(
      (v) => Number.isFinite(v) && v >= 100 && v <= 10000,
    )
  )
    errors.push("Canvas dimensions must be 100–10000");
  for (const key of ["nodes", "roads", "bins", "zones", "trucks"] as const) {
    if (
      !Array.isArray(c[key]) ||
      c[key].length > (key === "roads" ? 10000 : 1000)
    )
      errors.push(`Invalid or oversized ${key}`);
  }
  if (errors.length) return errors;
  for (const key of ["nodes", "roads", "bins", "zones", "trucks"] as const) {
    const ids = c[key].map((x) => x?.id);
    if (ids.some((x) => !label(x)) || new Set(ids).size !== ids.length)
      errors.push(`Invalid/duplicate ${key} IDs`);
    if (c[key].some((x) => !x || typeof x !== "object"))
      return [...errors, `Invalid ${key} entry`];
  }
  const nodes = new Set(c.nodes.map((x) => x.id)),
    bins = new Set(c.bins.map((x) => x.id)),
    zones = new Set(c.zones.map((x) => x.id));
  c.nodes.forEach((n) => {
    if (
      !label(n.label) ||
      !["INTERSECTION", "HEAD", "OPTIONAL_UNLOADING_POINT"].includes(n.type) ||
      !Number.isFinite(n.x) ||
      !Number.isFinite(n.y) ||
      n.x < 0 ||
      n.y < 0 ||
      n.x > c.width ||
      n.y > c.height
    )
      errors.push(`Invalid node ${n.id}`);
  });
  c.roads.forEach((r) => {
    if (
      (r.roadClass !== undefined &&
        !["ARTERIAL", "LOCAL"].includes(r.roadClass)) ||
      (r.name !== undefined &&
        (typeof r.name !== "string" || r.name.length > 160)) ||
      !nodes.has(r.fromNodeId) ||
      !nodes.has(r.toNodeId) ||
      r.fromNodeId === r.toNodeId ||
      !Number.isFinite(r.distanceKm) ||
      r.distanceKm <= 0 ||
      r.distanceKm > 10000 ||
      (r.speedGrade !== undefined &&
        (!Number.isInteger(r.speedGrade) ||
          r.speedGrade < 0 ||
          r.speedGrade > 4))
    )
      errors.push(`Invalid road ${r.id}`);
  });
  c.bins.forEach((b) => {
    if (
      (b.position !== undefined &&
        (!b.position ||
          !Number.isFinite(b.position.x) ||
          !Number.isFinite(b.position.y) ||
          b.position.x < 0 ||
          b.position.y < 0 ||
          b.position.x > c.width ||
          b.position.y > c.height)) ||
      !label(b.name) ||
      !nodes.has(b.roadNodeId) ||
      b.source !== "SIMULATED" ||
      !Number.isFinite(b.fillPercent) ||
      b.fillPercent < 0 ||
      b.fillPercent > 100 ||
      !Number.isFinite(b.capacityBinUnits) ||
      b.capacityBinUnits <= 0 ||
      !Array.isArray(b.history) ||
      b.history.length > 100 ||
      b.history.some(
        (r) =>
          !r ||
          !Number.isFinite(r.time) ||
          !Number.isFinite(r.fill) ||
          r.fill < 0 ||
          r.fill > 100,
      )
    )
      errors.push(`Invalid bin ${b.id}`);
  });
  const assigned = new Set<string>();
  c.zones.forEach((z) => {
    if (
      !label(z.name) ||
      !/^#[0-9a-f]{6}$/i.test(z.color) ||
      !c.nodes.some((n) => n.id === z.headNodeId && n.type === "HEAD") ||
      !Array.isArray(z.nodeIds) ||
      !Array.isArray(z.binIds) ||
      typeof z.manual !== "boolean"
    ) {
      errors.push(`Invalid zone ${z.id}`);
      return;
    }
    if (
      z.nodeIds.some((id) => !nodes.has(id)) ||
      z.binIds.some((id) => !bins.has(id)) ||
      new Set(z.binIds).size !== z.binIds.length ||
      new Set(z.nodeIds).size !== z.nodeIds.length
    )
      errors.push(`Invalid zone references ${z.id}`);
    z.binIds.forEach((id) => {
      if (assigned.has(id)) errors.push(`Bin ${id} belongs to multiple zones`);
      assigned.add(id);
    });
  });
  if (new Set(c.zones.map((z) => z.headNodeId)).size !== c.zones.length)
    errors.push("Zone heads must be distinct");
  c.trucks.forEach((t) => {
    if (
      !label(t.label) ||
      !Number.isFinite(t.capacityBinUnits) ||
      t.capacityBinUnits <= 0 ||
      !Number.isInteger(t.speedGrade) ||
      t.speedGrade < 0 ||
      t.speedGrade > 4 ||
      typeof t.available !== "boolean" ||
      (t.zoneId && !zones.has(t.zoneId))
    )
      errors.push(`Invalid truck ${t.id}`);
  });
  const s = c.settings;
  if(s?.strictZoneRouting!==undefined && typeof s.strictZoneRouting!=='boolean')errors.push('Invalid strict zone routing policy');
  if (
    !s ||
    !Number.isInteger(s.zoneCount) ||
    s.zoneCount < 1 ||
    s.zoneCount > 6 ||
    !Number.isFinite(s.pickupThreshold) ||
    !Number.isFinite(s.urgentThreshold) ||
    s.pickupThreshold < 1 ||
    s.pickupThreshold > s.urgentThreshold ||
    s.urgentThreshold > 100 ||
    ![
      s.costPerKmINR,
      s.costPerHourINR,
      s.serviceMinutes,
      s.unloadingMinutes,
    ].every((v) => Number.isFinite(v) && v >= 0) ||
    !Array.isArray(s.speeds) ||
    s.speeds.length !== 5 ||
    !s.speeds.every((v) => Number.isFinite(v) && v > 0 && v <= 120) ||
    !Number.isSafeInteger(s.seed)
  )
    errors.push("Invalid city settings");
  if (c.showcase !== undefined && typeof c.showcase !== 'boolean') errors.push('Invalid showcase marker');
  const snap = c.showcaseSnapshot;
  if (snap) {
    if (snap.version !== 1 || !['TEST','PHYSICAL'].includes(snap.mode) || !Number.isFinite(Date.parse(snap.capturedAt)) ||
      !Array.isArray(snap.readings) || snap.readings.length !== 4 || new Set(snap.readings.map(r=>r?.id)).size !== 4 ||
      snap.readings.some(r=>!r || !/^BIN-00[1-4]$/.test(r.id) || r.status !== 'VALID' || r.distanceCm === null || !Number.isFinite(r.distanceCm) || r.fillPercent === null || !Number.isFinite(r.fillPercent) || !Number.isFinite(Date.parse(r.receivedAt??'')) || !r.calibration) ||
      !snap.fills || Object.keys(snap.fills).length !== 10 || Object.entries(snap.fills).some(([id,v])=>!c.bins.some(b=>b.id===id) || !Number.isFinite(v) || v<0 || v>100)) errors.push('Invalid showcase provenance');
  }
  return errors;
}
export function parseCity(json: string): City {
  if (json.length > 2_000_000) throw Error("File exceeds 2 MB");
  const c: unknown = JSON.parse(json);
  const e = validateCity(c);
  if (e.length) throw Error(e.slice(0, 8).join("; "));
  return c as City;
}
export function removeNode(c: City, id: string): City {
  if (
    c.roads.some((r) => r.fromNodeId === id || r.toNodeId === id) ||
    c.bins.some((b) => b.roadNodeId === id) ||
    c.zones.some((z) => z.headNodeId === id || z.nodeIds.includes(id))
  )
    throw Error(
      "Remove connected roads, relocate bins and regenerate/delete the zone before removing this node.",
    );
  return { ...c, nodes: c.nodes.filter((n) => n.id !== id) };
}
