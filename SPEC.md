# Station Exit Finder — SPEC.md

## What this is

A lightweight web tool that tells you which station exit to use for a given
destination — without needing to enter a full itinerary. Built to replace the
"pick a fake destination in Google Maps just to see the exit" workaround.

Public-facing, shareable. Piloting on the JR Chuo-Sōbu line before expanding.

## Core principle: progressive disclosure

The tool must be useful at every input level — never gate the basic case
behind data that isn't there yet.

| Input given | Output |
|---|---|
| Station only | Station map: all exits plotted + a short list of notable nearby places per exit |
| Station + destination | Ranked exit recommendation (primary + close alternates) |
| Station + destination + incoming line | Same, filtered to exits reachable without backtracking across the platform |
| Any of the above, "share" mode | Same computation, framed as a shareable pin/link for meeting someone |

Each tier is additive — more input sharpens the answer, it never becomes
a hard requirement.

## v1 scope

- **Geography**: JR Chuo-Sōbu line stations only (Simon's commute + testable
  range). Architecture should not hardcode this, but data pull targets this
  line first.
- **No line-filtering yet** — validate whether it's needed on this line
  (long platforms, e.g. Shinjuku) before building it. Ship distance-ranking
  first.
- **No accessibility layer yet** — add if/when a v1 station happens to be
  covered by MLIT's Hokonavi indoor dataset (see Data Sources). Don't block
  on it.
- **No "optimal car" feature yet** — this isn't available as open data
  anywhere (Jorudan/NAVITIME/Yahoo Transit maintain it as proprietary
  platform survey data). Treat as a manually-curatable field per station,
  not a computed one, and only add once the core exit-ranking works.
- **No user-submitted corrections yet** — schema should allow attaching a
  note/correction to an exit later without a migration, but the submission
  flow itself is a v2 concern.

## Data sources

### 1. ODPT (Public Transportation Open Data Center)
- Register: https://developer.odpt.org — free, manual approval (~1-2
  business days)
- Provides: `odpt:Station` (name, coordinates, operator), `odpt:Railway`
  (line/operator metadata)
- Does **not** reliably provide exit/entrance data — this was dropped from
  the unified API around the 2022 Tokyo Metro migration and doesn't appear
  to be back for most operators as of 2026. Use ODPT for station identity
  only, not exits.
- Auth: consumer key in query string. Cache aggressively — static data
  (station/line info) is explicitly permitted to be cached per ODPT's
  developer guidelines; don't hit the API live per request.

### 2. OpenStreetMap / Overpass API
- No registration required
- Provides: exit nodes (`railway=subway_entrance` / `entrance=yes`, often
  tagged with `ref` = exit number/letter) and POIs (shops, landmarks) near
  each station, queryable by radius around station coordinates
- This is the actual source for exit geometry and nearby-place data.
  Coverage is community-maintained — expect it to be strong at major
  stations, thinner elsewhere. Chuo-Sōbu stations should have reasonable
  coverage given how central the line is.

### 3. MLIT Hokonavi (ほこナビ) — optional, narrow coverage
- https://www.hokonavi.go.jp/opendata/
- Indoor pedestrian network data (node/link graph) with barrier-free
  attributes (steps, ramps, width) for a limited set of stations (12 Toei
  Ōedo Line stations + ~28 municipal areas as of the 2025-2026 open data
  release). Check station-by-station whether a Chuo-Sōbu stop is covered
  before building against this — likely not for most v1 stations, but
  worth checking Shinjuku/Yotsuya-adjacent areas.

## Data model

```
Station {
  id: string            // e.g. "odpt.Station:JR-East.ChuoSobuLine.Ochanomizu"
  name_en: string
  name_ja: string
  lat: number
  lon: number
  line_ids: string[]
}

Exit {
  id: string
  station_id: string
  label: string          // e.g. "Exit 1" / "A3" — whatever the operator uses
  lat: number
  lon: number
  notes?: string          // curated, e.g. "elevator access" — manual for v1
}

POI {
  name: string
  lat: number
  lon: number
  category?: string
  nearest_exit_id?: string   // computed at ingest time, not stored source-of-truth
}
```

Schema stays flat and additive on purpose — a `notes` or `tags` field on
`Exit` is where accessibility info or crowd corrections attach later
without restructuring.

## Core logic

**Data pull** (offline/periodic script, not a live per-request call):
1. Query ODPT for Chuo-Sōbu station list → names, coordinates, line
2. For each station, query Overpass for exits + POIs within ~300m
3. Normalize into the schema above, write to local JSON (or SQLite if the
   POI volume makes JSON unwieldy)

**Ranking function** (runs client-side or in a thin API layer, against the
local dataset — no live external calls per lookup):
```
rank_exits(station_id, destination_lat_lon):
  for each exit of station:
    compute straight-line distance to destination
  sort ascending
  primary = closest exit
  alternates = any exit within TOLERANCE (~150m / ~2min walking) of primary
  return { primary, alternates }
```
Straight-line distance is the deliberate v1 simplification — station
concourses don't have public indoor routing data at scale (see Hokonavi
coverage above), so true walking-path distance isn't achievable everywhere
yet. Note this as a known approximation, not a bug.

## Frontend (v1)

- Station search/select (autocomplete against local station list)
- Destination: text search against local POI list, or drop a pin on a map
- Result: primary exit highlighted, alternates listed with their time/
  distance delta ("+2 min, but step-free")
- Map view: works standalone with just a station selected — all exits +
  POIs plotted, no destination required
- "Share" affordance: generate a link/pin for the recommended exit, usable
  even by someone who didn't build the tool

No framework mandate — Vite + React (JS, no TypeScript) matches how other
personal tools have been built, but this repo is independent and the stack
choice is open if there's a reason to deviate.

## Explicit non-goals for v1

- Multi-line transfer logic
- Real-time train/platform data
- Nationwide coverage
- Optimal car / boarding position
- User accounts or submitted corrections