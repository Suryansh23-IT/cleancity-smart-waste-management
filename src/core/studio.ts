import { City, uid, validateCity } from "./model";
import { blankCity, random } from "./presets";
// Only fields consumed by zoning, planning and playback invalidate a plan.
export function operationalChanged(a: City, b: City) {
  const signature = (c: City) =>
    JSON.stringify({
      nodes: c.nodes.map((n) => [n.id, n.type]),
      roads: c.roads.map((r) => [
        r.id,
        r.fromNodeId,
        r.toNodeId,
        r.distanceKm,
        r.speedGrade,
      ]),
      bins: c.bins.map((b) => [
        b.id,
        b.roadNodeId,
        b.fillPercent,
        b.capacityBinUnits,
      ]),
      zones: c.zones.map((z) => [z.id, z.headNodeId, z.nodeIds, z.binIds]),
      trucks: c.trucks.map((t) => [
        t.id,
        t.capacityBinUnits,
        t.speedGrade,
        t.zoneId,
        t.available,
      ]),
      settings: c.settings,
    });
  return signature(a) !== signature(b);
}
export function routingGraphChanged(a: City, b: City) {
  return (
    JSON.stringify(a.nodes.map((n) => [n.id, n.type]).sort()) !==
      JSON.stringify(b.nodes.map((n) => [n.id, n.type]).sort()) ||
    JSON.stringify(
      a.roads
        .map((r) => [
          r.id,
          r.fromNodeId,
          r.toNodeId,
          r.distanceKm,
          r.speedGrade,
        ])
        .sort(),
    ) !==
      JSON.stringify(
        b.roads
          .map((r) => [
            r.id,
            r.fromNodeId,
            r.toNodeId,
            r.distanceKm,
            r.speedGrade,
          ])
          .sort(),
      )
  );
}
export function batchBins(c: City, count: number, fill: number, capacity = 1) {
  if (!c.nodes.length) throw Error("Add road nodes first");
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 200 ||
    !Number.isFinite(fill) ||
    fill < 0 ||
    fill > 100 ||
    !Number.isFinite(capacity) ||
    capacity <= 0
  )
    throw Error("Use 1–200 bins, fill 0–100 and positive capacity");
  return {
    ...c,
    bins: [
      ...c.bins,
      ...Array.from({ length: count }, (_, i) => ({
        id: uid("bin"),
        name: `BIN-${c.bins.length + i + 1}`,
        roadNodeId: c.nodes[i % c.nodes.length].id,
        fillPercent: fill,
        capacityBinUnits: capacity,
        source: "SIMULATED" as const,
        history: [],
      })),
    ],
  };
}
export interface GeneratorOptions {
  name: string;
  junctions: number;
  bins: number;
  districts: number;
  scale: number;
  density: number;
  oneWay: number;
  seed: number;
}
export function generateCity(o: GeneratorOptions): City {
  if (
    !Number.isInteger(o.junctions) ||
    o.junctions < 6 ||
    o.junctions > 160 ||
    !Number.isInteger(o.bins) ||
    o.bins < 1 ||
    o.bins > 200 ||
    !Number.isInteger(o.districts) ||
    o.districts < 1 ||
    o.districts > 6 ||
    o.districts > o.junctions ||
    ![o.scale, o.density, o.oneWay, o.seed].every(Number.isFinite) ||
    o.scale <= 0 ||
    o.density < 0 ||
    o.density > 1 ||
    o.oneWay < 0 ||
    o.oneWay > 1
  )
    throw Error("Invalid generator parameters");
  const c = blankCity(),
    rand = random(o.seed);
  c.id = `generated-${o.seed}-${o.junctions}-${o.bins}`;
  c.name = o.name;
  c.description =
    "Seeded irregular districts; contextual shapes are non-routing";
  c.settings = { ...c.settings, seed: o.seed, zoneCount: o.districts };
  // Irregular radial districts, not a jittered rectangular lattice.
  for (let i = 0; i < o.junctions; i++) {
    const district = i % o.districts,
      angle = (district / o.districts) * Math.PI * 2,
      local = Math.floor(i / o.districts),
      theta = rand() * Math.PI * 2,
      radius = local === 0 ? 0 : 45 + rand() * 150;
    c.nodes.push({
      id: `j${i}`,
      label:
        local === 0 ? `District ${district + 1} head` : `Junction ${i + 1}`,
      x: Math.max(
        35,
        Math.min(1065, 550 + 290 * Math.cos(angle) + radius * Math.cos(theta)),
      ),
      y: Math.max(
        40,
        Math.min(680, 360 + 190 * Math.sin(angle) + radius * Math.sin(theta)),
      ),
      type: local === 0 ? "HEAD" : "INTERSECTION",
    });
  }
  const add = (a: number, b: number, major = false) => {
    if (
      a === b ||
      c.roads.some((r) => r.fromNodeId === `j${a}` && r.toNodeId === `j${b}`)
    )
      return;
    const x = c.nodes[a],
      y = c.nodes[b];
    c.roads.push({
      id: `street-${a}-${b}`,
      fromNodeId: x.id,
      toNodeId: y.id,
      distanceKm: Math.max(
        0.02,
        Math.round((Math.hypot(x.x - y.x, x.y - y.y) / 1100) * o.scale * 100) /
          100,
      ),
      name: major ? "District connector" : "Local street",
      roadClass: major ? "ARTERIAL" : "LOCAL",
    });
  };
  // Directed backbone guarantees round trips; local branches have optional reverse links.
  for (let i = 0; i < o.districts; i++) add(i, (i + 1) % o.districts, true);
  if (o.districts === 1) {
    for (let i = 0; i < o.junctions; i++) add(i, (i + 1) % o.junctions, true);
  }
  for (let i = o.districts; i < o.junctions; i++) {
    const parent = c.nodes
      .slice(0, i)
      .map((n, k) => ({
        k,
        d: Math.hypot(n.x - c.nodes[i].x, n.y - c.nodes[i].y),
      }))
      .filter((n) => n.k % o.districts === i % o.districts)
      .sort((a, b) => a.d - b.d)[0].k;
    add(parent, i);
    add(i, parent);
    if (rand() < o.density) {
      const candidates = c.nodes
        .map((n, k) => ({
          k,
          d: Math.hypot(n.x - c.nodes[i].x, n.y - c.nodes[i].y),
        }))
        .filter(
          (x) =>
            x.k !== i &&
            !c.roads.some(
              (r) => r.fromNodeId === `j${i}` && r.toNodeId === `j${x.k}`,
            ),
        )
        .sort((a, b) => a.d - b.d);
      if (candidates.length) {
        add(i, candidates[0].k);
        if (rand() > o.oneWay) add(candidates[0].k, i);
      }
    }
  }
  c.bins = Array.from({ length: o.bins }, (_, i) => ({
    id: `bin-${i}`,
    name: `BIN-${String(i + 1).padStart(3, "0")}`,
    roadNodeId: `j${i % o.junctions}`,
    fillPercent: Math.floor(rand() * 101),
    capacityBinUnits: 1,
    source: "SIMULATED",
    history: [],
  }));
  const errors = validateCity(c);
  if (errors.length) throw Error(errors.join("; "));
  return c;
}
