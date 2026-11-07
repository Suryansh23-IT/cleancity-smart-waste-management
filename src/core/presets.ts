import { City, clone, defaults, defaultTruckCapacity } from "./model";
export function random(seed: number) {
  let a = seed | 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function blankCity(): City {
  return {
    version: 1,
    id: "blank",
    name: "Untitled city",
    description: "Your own municipal network",
    width: 1100,
    height: 720,
    nodes: [],
    roads: [],
    bins: [],
    zones: [],
    trucks: [
      {
        id: "truck-1",
        label: "Truck 01",
        capacityBinUnits: defaultTruckCapacity,
        speedGrade: 2,
        available: true,
      },
    ],
    settings: clone(defaults),
  };
}
export function preset(count: number): City {
  const c = blankCity(),
    rand = random(count);
  c.id = `preset-${count}`;
  c.name = count <= 20 ? "Riverton District" : "Newhaven Metro";
  c.description =
    count <= 20
      ? "A riverside ring and connected neighbourhood streets"
      : "A municipal grid with one-way local streets";
  c.preset = count;
  const cols = Math.ceil(Math.sqrt(count)),
    rows = Math.ceil(count / cols);
  for (let i = 0; i < count; i++) {
    const ring = count <= 20,
      angle = (i / count) * Math.PI * 2;
    c.nodes.push({
      id: `n${i}`,
      label: `Junction ${i + 1}`,
      x: ring
        ? 550 + 420 * Math.cos(angle)
        : 100 + ((i % cols) * 900) / Math.max(1, cols - 1),
      y: ring
        ? 360 + 270 * Math.sin(angle)
        : 90 + (Math.floor(i / cols) * 540) / Math.max(1, rows - 1),
      type: "INTERSECTION",
    });
    const fill = Math.floor(rand() * 101);
    c.bins.push({
      id: `b${i}`,
      name: `BIN-${String(i + 1).padStart(3, "0")}`,
      roadNodeId: `n${i}`,
      fillPercent: fill,
      capacityBinUnits: 1,
      source: "SIMULATED",
      history: [0, 1, 2, 3, 4].map((h) => ({
        time: h * 3600000,
        fill: Math.max(0, fill - (4 - h) * 3),
      })),
    });
  }
  const add = (a: number, b: number, km: number) => {
    if (
      !c.roads.some((r) => r.fromNodeId === `n${a}` && r.toNodeId === `n${b}`)
    )
      c.roads.push({
        id: `r${a}-${b}`,
        fromNodeId: `n${a}`,
        toNodeId: `n${b}`,
        distanceKm: km,
        name: "Municipal road",
      });
  };
  // Directed Hamiltonian ring ensures every preset has a legal return path.
  for (let i = 0; i < count; i++) {
    add(i, (i + 1) % count, 0.25 + Math.round(rand() * 50) / 100);
    if (i % 3 === 0) add((i + 1) % count, i, 0.4);
    if (count > 20 && i + cols < count) {
      add(i, i + cols, 0.6);
      add(i + cols, i, 0.6);
    }
    if (count <= 20 && i % 4 === 0) {
      add(i, (i + Math.floor(count / 2)) % count, 0.9);
      add((i + Math.floor(count / 2)) % count, i, 0.9);
    }
  }
  [0, Math.floor(count / 3), Math.floor((count * 2) / 3), count - 1].forEach(
    (i) => {
      c.nodes[i].type = "HEAD";
      c.nodes[i].label = `Head ${i + 1}`;
    },
  );
  c.trucks = [0, 1].map((i) => ({
    id: `truck-${i + 1}`,
    label: `Truck 0${i + 1}`,
    capacityBinUnits: defaultTruckCapacity,
    speedGrade: 2 + i,
    available: true,
  }));
  return c;
}
export function randomize(c: City, overflow = false): City {
  const rand = random(c.settings.seed),
    time =
      Math.max(0, ...c.bins.flatMap((b) => b.history.map((h) => h.time))) +
      3600000;
  return {
    ...c,
    bins: c.bins.map((b) => {
      const fill = overflow
        ? 90 + Math.floor(rand() * 11)
        : Math.floor(rand() * 101);
      return {
        ...b,
        fillPercent: fill,
        history: [...b.history, { time, fill }].slice(-5),
      };
    }),
  };
}
export function infeasiblePreset(): City {
  const c = preset(10);
  c.id = "infeasible";
  c.name = "Disconnected test district";
  c.roads = c.roads.filter((r) => r.fromNodeId !== "n9" && r.toNodeId !== "n9");
  c.nodes[9].type = "INTERSECTION";
  c.bins[9].fillPercent = 100;
  return c;
}
