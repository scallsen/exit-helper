# Schematic map exploration — status notes

Working notes on the "show the station structure on a stylized map" thread.
The map is currently **hidden from the main view** (see "Where things stand"
below) pending a reassessment — this file exists so that reassessment
doesn't have to start from zero.

## Goal

Per `CLAUDE.md`'s visual identity section: render the station as a stylized
schematic diagram (exits as pixel icons on a custom diagram), not real
basemap tiles — real OSM/Leaflet tiles would clash with the retro sign
aesthetic. This thread explored how much real structure (building
footprint, platforms, streets) we could add to that diagram using data
alone, and where a hand-drawn/data-driven schematic stops being viable
(see the embedded-map-vs-custom-schematic discussion below).

## What's built

**Data pipeline** (`scripts/fetch-overpass-exits.js` → `scripts/normalize.js`):

- `data/raw/stations.json` — manual seed standing in for `fetch-odpt-stations.js`
  (still a stub; ODPT account pending). Anchor coordinates only, not
  source-of-truth.
- `fetch-overpass-exits.js` resolves each station's precise point via
  Overpass (JR-East operator match, falling back to nearest
  `railway=station` node), then pulls, per station:
  - entrances (`railway=subway_entrance` / `entrance=*`), 200m radius
  - footprint + platforms (`building=train_station`, `railway=platform`), 300m radius
  - streets (`highway=motorway`…`pedestrian`), 350m radius, clipped to 400m
    in normalize since Overpass's `around` filter includes a whole way if
    even one node is in range
  - curated "notable" POIs (tourism/historic/amenity/leisure/shop, narrowed
    list — an unfiltered pull returns hundreds of vending machines and
    benches per station), 300m radius
  - Raw output per station: `data/raw/overpass/{slug}.json`
- `normalize.js` transforms raw Overpass elements into SPEC.md's
  Station/Exit/POI schema, plus a schema extension not yet in SPEC.md:
  `Station.footprint` (polygon), `Station.platforms` (named line strings),
  `Station.streets` (named/unnamed line strings) — flat, additive, optional.
  Output: `data/stations.json`, `data/exits.json`, `data/pois.json`.
- `src/data/dataset.js` — adapter with the same function API as
  `src/data/fixtures.js` (the original hand-authored fake data, still in
  the repo, currently unused), sourced from the real `data/*.json`. The app
  (`App.jsx`, `StationPicker.jsx`, `DestinationSearch.jsx`) currently
  imports from `dataset.js`, i.e. it's running on real data, not fixtures.

**Rendering** (`src/components/StationMap.jsx`, `src/lib/projection.js`):

- Lat/lon → local SVG projection (`computeScale` + `projectWithScale`,
  split on purpose): the map scale is fit to the station's own content
  (exits/POIs/footprint/platforms/destination), and streets reuse that same
  scale rather than joining the auto-fit — otherwise a distant avenue would
  zoom out the whole map and shrink the actual exit signage. Streets that
  fall outside the viewBox at that scale are simply clipped by the SVG
  boundary.
- `snapToGrid` (8px) applied to footprint/platform/street points only (not
  exit/POI markers) to get the blocky, dot-matrix look instead of smooth
  OSM curves.
- Exit labels show only for the recommended exit (always) or on tap
  (matching how POI labels already worked) — always-on labels for every
  exit collided badly once real entrance clustering showed up (e.g.
  Suidobashi has 8 entrances within a few meters of each other).

## Bugs found and fixed along the way

Useful to know for next time, since the pattern kept repeating — **JR and
the physically-adjacent Metro station are intertwined enough that naive
radius/distance filtering doesn't separate them**, at least at Ochanomizu
(Shin-Ochanomizu Metro) and Yotsuya (Tokyo Metro):

1. Metro entrances leaking into the exit list → fixed by excluding
   `railway=subway_entrance` (Metro-specific OSM convention; JR entrances
   use `entrance=*` / `railway=train_station_entrance`).
2. Metro's underground platforms leaking into the platform list, with `ref`
   values colliding with JR's own numbering → fixed by excluding
   `subway=yes` ways from structure geometry generally.
3. Yotsuya's footprint picked a Tokyo Metro building (more nodes) over the
   real JR one, plus two ~230m unlabeled "buildings" that are almost
   certainly OSM mapping artifacts got through untouched → fixed with an
   operator filter + a 150m span sanity cap.
4. Exit label collision (not a data bug, a rendering one) → tap-to-reveal.

All of these were verified by rendering the actual component output to a
static PNG outside the browser (`qlmanage -t` on a hand-built SVG that
mirrors `StationMap.jsx`'s logic exactly), since the Chrome extension
wouldn't connect in this session. That script is not checked in — it lived
at `/Users/simoncallsen/.claude/jobs/6ca1fa73/tmp/render-map.mjs` — but is
short and worth recreating rather than digging up if this thread resumes.

## Where things stand

After fix #3 above, the footprint's *bounding box* now correctly overlaps
the exits' bounding box for all three stations (verified numerically) — but
the user reports the map **still doesn't look right** even after that fix.
That report came without further detail on what specifically looks wrong,
and wasn't debugged further before pausing this thread.

**Leading unverified hypothesis**, worth checking first on resumption:
`snapToGrid` quantizes each footprint/platform/street point *independently*
to the nearest 8px grid cell. For a real, complex building outline —
Ochanomizu's building is a 26-point winding shape following the elevated
track viaduct, not a simple rectangle — independently snapping each vertex
can push two originally-distinct points to the same or crossing grid cells,
turning a valid simple polygon into a self-intersecting one (edges crossing
each other, "bowtie" artifacts). The static PNG renders I checked *looked*
like a plausible irregular building outline, but I didn't specifically test
whether snapping breaks polygon simplicity — that's the first thing to
check before trying anything else. Quick way to check: log/compare the
un-snapped vs. snapped footprint polygon area (a naive shoelace-formula
area check), or just try disabling `snapToGrid` for the footprint only and
compare.

Other things not yet ruled out:
- Whether "largest building by point count" is still the right selection
  heuristic even after the operator/span filters — it wasn't re-examined
  for Ochanomizu/Suidobashi beyond confirming their candidates were already
  compact and JR-owned.
- Whether the footprint really is "the wrong shape for a station" in a way
  that's specific to how OSM mapped these particular buildings (elevated
  viaduct stations can have genuinely unusual footprints), vs. an actual
  rendering bug — i.e. whether user expectation ("should look like a
  station") is even achievable from this data source, or whether the
  footprint concept needs to be simplified (e.g. convex hull instead of
  the raw OSM outline) rather than debugged.

## Where things are hidden

`src/components/StationMap.jsx` is no longer rendered from `App.jsx` (see
the commit that added this file) — commented out with a pointer back here.
Nothing else changed: `ExitOverview` and `ResultPanel` still work exactly
as before, ranking/data pipeline is untouched, ExitOverview's
tap-to-reveal / dataset.js / all the data work above stays intact and is
still worth having regardless of what happens with the map specifically.

## Bigger-picture note (not yet acted on)

Separately discussed but not started: whether real street/building tiles
(Leaflet + OSM) with our pixel-art station diagram as a georeferenced
overlay is worth doing instead of a fully hand-built schematic. Current
read: that's a real visual-identity decision (CLAUDE.md explicitly rules
out real basemap tiles for exactly this reason), not just an implementation
detail — worth deciding on purpose later, not sliding into.

## How to resume

```
npm run data:exits       # re-pull from Overpass (~3-5 min, public instance is often slow/rate-limited)
npm run data:normalize   # re-run the transform
npm run dev               # StationMap.jsx is currently commented out in App.jsx — re-enable to iterate
```
