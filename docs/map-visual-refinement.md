# Municipal map visual refinement — 5 November 2026

Continued from `68331d0`, branch `codex/municipal-platform`. This is a presentation-only refinement after Upgrade A. Routing, zoning, scheduling, forecasting, city generation, CRUD and persisted data formats are unchanged. No dependencies, map APIs, cloud, hardware or deployment work.

## What visibly changed

- **Roads:** opposite directed edges share one visible street. All green-gray casings render before pale inner surfaces, with rounded ends and connected junctions. Arterials are wider than local streets and have restrained center detail and street names. Every directed edge retains its own keyboard/click inspection target, original distance, endpoints and direction. Engineering uses small interior chevrons rather than large arrow-ended lines.
- **Connectivity:** ordinary crossings between streets without shared graph node IDs receive a visible gap on the lower stroke. They are schematic overpasses, not new junctions or claims that a physical bridge exists. Only actual graph edges are painted. Selected roads and route highlights use the same street geometry, including crossing gaps.
- **Land:** deterministic clipped parcels derived from the existing junction positions replace isolated context rectangles and the dotted engineering background. Muted cream blocks, green open-space parcels and small road-aligned building footprints create a continuous urban ground plane. Building centers are kept clear of streets. Decorative layers never intercept map gestures and can be hidden independently.
- **Markers:** round status badges, solid normal/pickup/urgent bin glyphs, recognizable depot buildings and individually colored, numbered truck glyphs. Default bin positions are spaced deterministically; explicit user positions remain exact, access-node IDs remain untouched, and fill updates do not reshuffle markers. Engineering retains access-node connector lines. Head labels use a pale halo rather than repeated technical context labels.
- **Modes:** City View hides technical directions/handles and unselected route overlays. Engineering exposes node handles, small directions, access links and selected road weights. Simulation shows the selected vehicle's route with a stronger current-segment highlight; truck motion continues to use the existing trip state.
- **Camera:** the viewBox follows the actual rendered aspect ratio instead of letterboxing a fixed canvas rectangle. Fit includes visual bin positions and reserves space for measured controls and the legend. Initial auto-fit does not override search zoom when an inspector opens. Mobile canvas height is 440 px to leave usable space between controls and the longer legend.

## Actual graphical browser checks

Used the local production preview in the in-app graphical browser; inspected screenshots, not just source or automated DOM output. Existing saved QA cities were reused rather than regenerated or rewritten.

| Check | Actual observation |
| --- | --- |
| Irregular 40-bin city | Three heads/zones, five trucks. City, Engineering and Simulation reviewed. Connected cased streets replace paired arrows; head labels and status markers remain inspectable. |
| 100-bin city | 60 junctions, 132 directed edges painted as 71 street corridors. All 100 bins remain rendered. Engineering retains a separate target and chevron for each directed road. |
| Motion and routes | Started/paused the existing collection, selected Truck 5 and stepped a minute. Its SVG transform changed from `(343.7563, 94.4717)` to `(311.2588, 62.0784)`; its route and current segment were visible, with no direction glyphs in Simulation. Reset restored original demand, then the scenario was saved. Existing plan still reports three trips / 6.67 km / zero pending. |
| Camera/selection | Desktop and mobile drag-to-pan changed the viewBox. Search selected BIN-100 at 180%; opening the inspector preserved 180%. Selected a directed road by keyboard and inspected its properties. Fit and zoomed inspection used the same underlying graph. |
| Layers | Turning context off removed the decorative land group while retaining 71 street surfaces and all 100 bins. Restored context afterward. |
| Responsive | Desktop 1440×1000; mobile 390×844. Mobile document width 375 px: no horizontal overflow. City, Engineering/search and actual Simulation reviewed on the mobile viewport. No physical touchscreen test claimed. |
| Legend clearance | Browser QA found a mobile Simulation overlap and prompted measured fit padding. Final 40-bin check: lowest marker/head bottom 665.61 px, legend top 696.65 px, zero covered objects. Final 100-bin check also found zero bin/head objects covered by the legend after fit. |
| Console | Final production browser log contained no captured warnings or errors. Temporary viewport override reset. |

## Screenshot evidence

Saved outside Git in `C:/Users/asus/.codex/visualizations/2026/11/05/01a1ab02-2d00-7850-a335-15132eb3a090/`:

- **Before:** `upgrade-a-desktop.png` — the preceding checkpoint's 100-bin Engineering map.
- **After, same saved 100-bin city:** `map-refinement-100-engineering.png` and `map-refinement-100-city.png`.
- `map-refinement-100-mobile.png` — final mobile City View.
- `map-refinement-40-simulation.png` and `map-refinement-40-mobile-simulation.png` — route/vehicle views.
- `map-refinement-40-city.png` — additional City View inspection.

These document real rendered views; camera framing differs between captures. The screenshots and local browser scenarios are excluded from the source checkpoint.

## Verification and limits

- `npm test`: **75 passing tests**, nine files, final run 26.07 seconds. All preceding 69 tests remain intact. Six added cases cover shared street rendering without edge loss, non-connected crossing gaps, deterministic clear context geometry, mode-specific rendering, stable bin spacing with exact explicit coordinates, and search zoom after inspector resizing. Server-rendered SVG title warnings exposed by the new tests were corrected with single-string tooltips.
- `npm run typecheck`: passed.
- `npm run build`: passed, 1,598 transformed modules. JS 326.15 kB / 102.97 kB gzip; CSS 33.90 kB / 8.02 kB gzip.
- `git diff --check`: passed before staging. Only map presentation, its tests and verification documentation are included.

The existing straight-edge geometry and genuine sparse areas remain; no extra streets or connectivity were fabricated to make the map denser. Land parcels, buildings and zone hulls are illustrative, not geography or exact coverage. Highly coincident/collinear custom graphs can remain visually ambiguous; use Engineering inspection for their topology. Explicitly overlapping user-positioned bins are preserved, and extreme densities can exhaust the default spacing search. There is no clustering or physical touch verification; mobile overview is for status/orientation, with search/zoom for detail. Upgrade B and C remain outside this checkpoint.
