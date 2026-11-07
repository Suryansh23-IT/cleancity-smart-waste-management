import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CityCanvas from "./CityCanvas";
import {
  streetsFor,
  landParcels,
  footprints,
  distanceToSegment,
  binLayout,
} from "./mapGeometry";
import { blankCity, preset } from "../core/presets";
import { generateCity } from "../core/studio";
import { autoZone } from "../core/zoning";
import { planCollection } from "../core/routing";
import { startSimulation, tripState } from "../core/simulation";
import { createCuratedCities } from "../core/curated";
import { createReadyCities } from "../core/readyCities";
import { captureSnapshot, showcaseCity, testReadings } from "../core/showcase";
const point = (c: ReturnType<typeof blankCity>) => (id: string) =>
  c.nodes.find((n) => n.id === id)!;
describe("urban map rendering contracts", () => {
  it("declutters implicit bin markers without moving explicit positions or changing access nodes", () => {
    const c = generateCity({
      name: "Marker spacing",
      junctions: 60,
      bins: 100,
      districts: 3,
      scale: 8,
      density: 0.5,
      oneWay: 0.5,
      seed: 42,
    });
    c.bins[0].position = { x: 44, y: 55 };
    const before = structuredClone(c),
      layout = binLayout(c, point(c));
    expect(layout.get(c.bins[0].id)).toEqual({ x: 44, y: 55 });
    const positions = [...layout.values()];
    for (let i = 0; i < positions.length; i++)
      for (let j = i + 1; j < positions.length; j++)
        expect(
          Math.hypot(
            positions[i].x - positions[j].x,
            positions[i].y - positions[j].y,
          ),
        ).toBeGreaterThanOrEqual(26.99);
    c.bins = c.bins.map((b) => ({ ...b, fillPercent: 0 }));
    expect([...binLayout(c, point(c))]).toEqual([...layout]);
    expect(before.bins.map((b) => b.roadNodeId)).toEqual(
      c.bins.map((b) => b.roadNodeId),
    );
  });
  it("paints paired directed edges as one street without altering either edge", () => {
    const c = blankCity();
    c.nodes = [
      { id: "a|b", label: "A", x: 100, y: 100, type: "HEAD" },
      { id: "c", label: "B", x: 400, y: 100, type: "INTERSECTION" },
    ];
    c.roads = [
      { id: "out", fromNodeId: "a|b", toNodeId: "c", distanceKm: 2 },
      { id: "back", fromNodeId: "c", toNodeId: "a|b", distanceKm: 3 },
    ];
    const before = structuredClone(c),
      streets = streetsFor(c, point(c));
    expect(streets).toHaveLength(1);
    expect(streets[0].roads.map((r) => r.distanceKm)).toEqual([2, 3]);
    expect(c).toEqual(before);
    const html = renderToStaticMarkup(
      <CityCanvas
        city={c}
        plan={null}
        simulation={null}
        selection={null}
        editing={false}
        onMove={() => {}}
        onCreate={() => {}}
        onSelect={() => {}}
      />,
    );
    expect(html.match(/class="road"/g) || []).toHaveLength(2);
    expect(html.match(/data-street=/g) || []).toHaveLength(1);
    expect(html).not.toContain("direction-chevron");
    expect(html).not.toContain("marker-end");
  });
  it("gaps non-connected crossings but keeps actual graph junctions continuous", () => {
    const c = blankCity();
    c.nodes = [
      ["a", 0, 100],
      ["b", 200, 100],
      ["c", 100, 0],
      ["d", 100, 200],
    ].map(([id, x, y]) => ({
      id: String(id),
      label: String(id),
      x: Number(x),
      y: Number(y),
      type: "INTERSECTION",
    }));
    c.roads = [
      { id: "ab", fromNodeId: "a", toNodeId: "b", distanceKm: 1 },
      { id: "cd", fromNodeId: "c", toNodeId: "d", distanceKm: 1 },
    ];
    expect(streetsFor(c, point(c))[0].path.match(/M/g)).toHaveLength(2);
    expect(c.nodes).toHaveLength(4);
    c.roads[1].fromNodeId = "b";
    expect(streetsFor(c, point(c))[0].path.match(/M/g)).toHaveLength(1);
  });
  it("derives stable parcels and road-aligned clear footprints without changing city data", () => {
    const c = generateCity({
        name: "Visual fixture",
        junctions: 60,
        bins: 100,
        districts: 3,
        scale: 8,
        density: 0.5,
        oneWay: 0.5,
        seed: 42,
      }),
      before = structuredClone(c),
      streets = streetsFor(c, point(c));
    expect(landParcels(c)).toEqual(landParcels(structuredClone(c)));
    expect(landParcels(c).some((p) => p.park)).toBe(true);
    const buildings = footprints(c, streets);
    expect(buildings.length).toBeGreaterThan(10);
    for (const b of buildings) {
      const center = {
        x: b.points.reduce((s, p) => s + p.x, 0) / 4,
        y: b.points.reduce((s, p) => s + p.y, 0) / 4,
      };
      expect(
        streets.every((s) => distanceToSegment(center, s.a, s.b) >= 19),
      ).toBe(true);
    }
    expect(c).toEqual(before);
    expect(landParcels(blankCity())).toEqual([]);
  });
  it("keeps Engineering chevrons and node handles separate from City and Simulation layers", () => {
    const c = preset(10);
    c.zones = autoZone(c, ["n0", "n3", "n6"]).zones;
    const plan = planCollection(c),
      simulation = startSimulation(c, plan),
      props = {
        city: c,
        plan,
        simulation: null,
        selection: null,
        onMove: () => {},
        onCreate: () => {},
        onSelect: () => {},
      };
    const view = renderToStaticMarkup(
        <CityCanvas {...props} editing={false} />,
      ),
      edit = renderToStaticMarkup(<CityCanvas {...props} editing />),
      sim = renderToStaticMarkup(
        <CityCanvas
          {...props}
          simulation={simulation}
          editing={false}
          simulationView
        />,
      );
    expect(edit.match(/class="direction-chevron"/g)).toHaveLength(
      c.roads.length,
    );
    expect(view).not.toContain("direction-chevron");
    expect(sim).not.toContain("direction-chevron");
    expect(view).not.toContain("route-highlight");
    expect(edit.match(/class="map-node"/g)).toHaveLength(10);
    expect(view.match(/class="map-node"/g)).toHaveLength(
      c.nodes.filter((n) => n.type === "HEAD").length,
    );
    expect(sim.match(/class="route-highlight"/g)).toHaveLength(
      new Set(plan.trips.map(t=>t.truckId)).size,
    );
    for(const id of new Set(plan.trips.map(t=>t.truckId)))expect(sim).toContain(`data-truck-id="${id}"`);
    expect(sim).toContain("active-road");
    expect(sim.match(/class="map-bin"/g)).toHaveLength(10);
  });
  it("aligns truck playback and the active SVG leg with the graph on every retained map", () => {
    const now = Date.UTC(2026, 10, 7);
    const cities = [
      ...createCuratedCities(),
      ...createReadyCities(),
      captureSnapshot(showcaseCity(), testReadings(now), "TEST", now),
    ];
    expect(cities).toHaveLength(12);
    for (const city of cities) {
      const plan = planCollection(city);
      const simulation = startSimulation(city, plan);
      const node = point(city);
      let checkedSvg = false;
      for (const trip of plan.trips) {
        let start = trip.start;
        for (const segment of trip.segments) {
          const end = start + segment.duration;
          if (segment.duration > 0) {
            const midpoint = start + segment.duration / 2;
            const state = tripState(trip, midpoint);
            expect([state.from, state.to], city.name).toEqual([segment.from, segment.to]);
            expect(state.state).toBe(segment.kind);
            expect(state.fraction).toBeCloseTo(0.5, 8);
            if (!checkedSvg && segment.from !== segment.to) {
              const a = node(segment.from);
              const b = node(segment.to);
              const html = renderToStaticMarkup(
                <CityCanvas city={city} plan={plan} simulation={{ ...simulation, time: midpoint }}
                  selection={null} editing={false} simulationView
                  onMove={() => {}} onCreate={() => {}} onSelect={() => {}} />,
              );
              const truck = html.match(/<g [^>]*class="map-truck"[^>]*>/g)?.find((tag) =>
                tag.includes(`data-truck-id="${trip.truckId}"`));
              expect(truck, city.name).toContain(`data-from="${a.id}" data-to="${b.id}"`);
              const coords = truck!.match(/translate\(([^,]+),([^)]+)\)/)!;
              expect(Number(coords[1])).toBeCloseTo((a.x + b.x) / 2, 8);
              expect(Number(coords[2])).toBeCloseTo((a.y + b.y) / 2, 8);
              expect(html).toContain(`M${a.x},${a.y} L${b.x},${b.y}`);
              checkedSvg = true;
            }
          }
          start = end;
        }
        expect(tripState(trip, trip.end)).toMatchObject({
          from: trip.head, to: trip.head, load: 0, state: "COMPLETED",
        });
      }
      if (plan.trips.some((trip) => trip.distance > 0)) expect(checkedSvg).toBe(true);
    }
  });
});
