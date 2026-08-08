// Step 2 of the data pull (see SPEC.md "Core logic").
// For each station in data/raw/stations.json (see that file's _note — it's
// a manual seed standing in for fetch-odpt-stations.js until ODPT access
// lands), queries Overpass for exits, station footprint/platform geometry,
// and notable nearby POIs. This is the actual source for exit geometry and
// nearby-place data — coverage is community-maintained, expect it to vary
// by station. Writes one raw JSON file per station to data/raw/overpass/;
// normalize.js (step 3) turns this into the Station/Exit/POI schema.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STATIONS_PATH = path.join(__dirname, '../data/raw/stations.json')
const OUT_DIR = path.join(__dirname, '../data/raw/overpass')

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
// Overpass's Apache front-end 406s requests with no/generic User-Agent —
// identify this script honestly rather than spoofing a browser.
const USER_AGENT = 'exit-helper-data-pull/0.1 (personal project; https://github.com/scallsen/exit-helper)'

// Entrances are tightened below SPEC.md's ~300m default: testing against
// Ochanomizu showed a 300m radius pulling in entrances that belong to the
// separate, nearby Shin-Ochanomizu Metro station. 200m still covers real
// JR exits with less cross-station bleed, though it isn't a full fix — see
// the caveat logged below. Footprint/platform/POI queries stay at ~300m
// since a building or notable place can legitimately sit farther out.
const EXIT_RADIUS_M = 200
const STRUCTURE_RADIUS_M = 300
const POI_RADIUS_M = 300

// Curated to "notable" categories matching SPEC.md's examples (landmarks,
// schools, hospitals) — an unfiltered shop/amenity/tourism/leisure pull
// returns hundreds of vending machines, benches, and post boxes per
// station, which isn't useful raw material for "nearby places."
const POI_TAG_FILTERS = [
  'tourism~"^(attraction|museum|artwork|viewpoint|gallery)$"',
  'historic',
  'amenity~"^(university|college|hospital|place_of_worship|theatre|cinema|marketplace)$"',
  'leisure~"^(park|garden|amusement_arcade|sports_centre|stadium)$"',
  'shop~"^(department_store|mall|supermarket)$"',
]

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Sequential with backoff, not parallel — the public Overpass instance
// rate-limits concurrent requests per IP, and this is exactly the kind of
// call CLAUDE.md means to keep out of any per-request path: an offline,
// infrequent, considerate pull.
async function overpassFetch(query, { retries = 6 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'User-Agent': USER_AGENT },
      body: new URLSearchParams({ data: query }),
    })
    if (res.ok) return res.json()
    if (attempt === retries || (res.status !== 504 && res.status !== 429)) {
      throw new Error(`Overpass request failed: ${res.status} ${res.statusText}`)
    }
    const backoffMs = attempt * 5000
    console.warn(`  Overpass ${res.status}, retrying in ${backoffMs}ms (attempt ${attempt}/${retries})...`)
    await sleep(backoffMs)
  }
}

function distanceMeters(a, b) {
  const latMetersPerDeg = 110940
  const lonMetersPerDeg = 111320 * Math.cos((a.lat * Math.PI) / 180)
  const dLat = (b.lat - a.lat) * latMetersPerDeg
  const dLon = (b.lon - a.lon) * lonMetersPerDeg
  return Math.sqrt(dLat * dLat + dLon * dLon)
}

// The seed coordinate is only an approximate search anchor, not a
// source-of-truth station point. Resolves the precise one via Overpass:
// prefers a JR East-operated railway=station node, falling back to the
// nearest railway=station node of any operator when JR East isn't tagged
// (observed on Yotsuya, where the JR platform node has no operator tag).
async function resolveStationCenter(station) {
  const query = `
    [out:json][timeout:25];
    (
      node(around:600,${station.lat},${station.lon})[railway=station];
    );
    out body;
  `
  const result = await overpassFetch(query)
  const candidates = result.elements.filter((el) => el.type === 'node')

  if (candidates.length === 0) {
    console.warn('  No railway=station node found near seed point — using seed coordinate as-is.')
    return { lat: station.lat, lon: station.lon, resolvedVia: 'seed-fallback' }
  }

  const jrMatch = candidates.find((el) => (el.tags?.operator ?? '').includes('東日本旅客鉄道'))
  if (jrMatch) {
    return { lat: jrMatch.lat, lon: jrMatch.lon, resolvedVia: 'operator-match' }
  }

  console.warn(
    `  No JR East-tagged station node for ${station.name_en} — falling back to the nearest railway=station node. Operator may be ambiguous (e.g. a connecting Metro line sharing the name).`,
  )
  const nearest = candidates.reduce((best, el) =>
    distanceMeters(station, el) < distanceMeters(station, best) ? el : best,
  )
  return { lat: nearest.lat, lon: nearest.lon, resolvedVia: 'nearest-fallback' }
}

function buildExitsQuery(center) {
  return `
    [out:json][timeout:40];
    (
      node(around:${EXIT_RADIUS_M},${center.lat},${center.lon})[railway=subway_entrance];
      node(around:${EXIT_RADIUS_M},${center.lat},${center.lon})["entrance"];
    );
    out geom;
  `
}

function buildStructureQuery(center) {
  return `
    [out:json][timeout:40];
    (
      way(around:${STRUCTURE_RADIUS_M},${center.lat},${center.lon})[building=train_station];
      way(around:${STRUCTURE_RADIUS_M},${center.lat},${center.lon})[railway=platform];
      node(around:${STRUCTURE_RADIUS_M},${center.lat},${center.lon})[railway=platform];
    );
    out geom;
  `
}

function buildPoiQuery(center) {
  const clauses = POI_TAG_FILTERS.flatMap((filter) => [
    `node(around:${POI_RADIUS_M},${center.lat},${center.lon})[${filter}];`,
    `way(around:${POI_RADIUS_M},${center.lat},${center.lon})[${filter}];`,
  ]).join('\n      ')
  return `
    [out:json][timeout:40];
    (
      ${clauses}
    );
    out geom;
  `
}

async function fetchStation(station) {
  console.log(`\n${station.name_en} (${station.name_ja})`)

  const center = await resolveStationCenter(station)
  console.log(`  resolved center: [${center.lat}, ${center.lon}] via ${center.resolvedVia}`)
  await sleep(2000)

  const exits = await overpassFetch(buildExitsQuery(center))
  await sleep(2000)
  const structure = await overpassFetch(buildStructureQuery(center))
  await sleep(2000)
  const pois = await overpassFetch(buildPoiQuery(center))

  console.log(
    `  entrances: ${exits.elements.length}, footprint/platform elements: ${structure.elements.length}, notable POIs: ${pois.elements.length}`,
  )

  return {
    station_id: station.id,
    resolved_center: center,
    fetched_at: new Date().toISOString(),
    entrances: exits.elements,
    structure: structure.elements,
    pois: pois.elements,
  }
}

async function fetchOverpassExitsAndPois() {
  const seed = JSON.parse(await readFile(STATIONS_PATH, 'utf-8'))
  await mkdir(OUT_DIR, { recursive: true })

  for (const station of seed.stations) {
    const raw = await fetchStation(station)
    const slug = station.id.split('.').pop()
    const outPath = path.join(OUT_DIR, `${slug}.json`)
    await writeFile(outPath, JSON.stringify(raw, null, 2))
    console.log(`  wrote ${path.relative(process.cwd(), outPath)}`)
    await sleep(2000)
  }
}

fetchOverpassExitsAndPois().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
