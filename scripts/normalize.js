// Step 3 of the data pull (see SPEC.md "Core logic").
// Normalizes raw Overpass output (data/raw/overpass/*.json, keyed against
// the station seed at data/raw/stations.json — see its _note) into the
// Station/Exit/POI schema from SPEC.md, and writes data/stations.json,
// data/exits.json, data/pois.json.
//
// Also emits `footprint`/`platforms`/`streets` on Station — a schema
// extension not yet in SPEC.md, added while prototyping the schematic map
// (see the note in src/data/fixtures.js). Flat and additive; drop it here
// if it doesn't end up earning its keep in the UI.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { distanceMeters } from '../src/lib/geo.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAW_STATIONS_PATH = path.join(__dirname, '../data/raw/stations.json')
const RAW_OVERPASS_DIR = path.join(__dirname, '../data/raw/overpass')
const OUT_DIR = path.join(__dirname, '../data')

// Entrances that aren't for normal pedestrian use.
const EXCLUDED_ENTRANCE_VALUES = new Set(['emergency'])

// `railway=subway_entrance` is OSM convention for Metro/subway access
// points specifically — JR's own entrances are tagged plain `entrance=*`
// or `railway=train_station_entrance`. All 3 seed stations are JR, so this
// is a real (not string-matched) signal for excluding entrances that
// belong to a different, physically-adjacent operator's station — this is
// exactly what was leaking in from Shin-Ochanomizu Metro at Ochanomizu.
// Revisit if a Metro station is ever added to the seed list.
const METRO_ONLY_RAILWAY_VALUES = new Set(['subway_entrance'])

// Same JR-only assumption applied to structure geometry: Shin-Ochanomizu's
// underground platforms (tagged subway=yes) were showing up in Ochanomizu
// JR's footprint/platform output, with `ref` values colliding with JR's
// own platform numbering (both have a "1" and a "2"). Excluding subway=yes
// ways also tightens the entrance-distance filter below, since those
// underground platforms were themselves close enough to make cross-station
// entrances look "close enough" to count.
function isMetroWay(el) {
  return el.tags?.subway === 'yes'
}

// Secondary spillover filter, kept as defense-in-depth: distance to the
// station's OWN building/platform geometry (which we already fetch). Note
// this alone did NOT catch the Shin-Ochanomizu case above — JR and Metro
// concourses are physically intertwined at some stations, close enough
// that geography alone can't tell them apart. Station name matching
// doesn't help either: real entrances are inconsistently spelled with
// alternate orthography for the same place (e.g. "御茶ノ水" vs "お茶の水"),
// so a substring check throws out legitimate exits as often as it catches
// bad ones.
const MAX_ENTRANCE_TO_STRUCTURE_M = 150

// Overpass's `around` filter includes a whole way if ANY node falls inside
// the query radius, so a street can run well past our 350m pull radius.
// Clip each way's points to this distance instead of relying on the query
// radius for a visual boundary — keeps streets from wildly blowing out the
// map's scale when one end of a long avenue is technically "in range."
const MAX_STREET_POINT_DISTANCE_M = 400

function wayCentroid(geometry) {
  const lat = geometry.reduce((sum, p) => sum + p.lat, 0) / geometry.length
  const lon = geometry.reduce((sum, p) => sum + p.lon, 0) / geometry.length
  return { lat, lon }
}

function nearestStructureDistance(point, structureWays) {
  let min = Infinity
  for (const way of structureWays) {
    for (const node of way.geometry) {
      const d = distanceMeters(point, node)
      if (d < min) min = d
    }
  }
  return min
}

// Bearing from center in degrees, 0 = north, clockwise — used to number
// unnamed exits in spatial order, the way real station exit numbers
// usually run, rather than arbitrary OSM id order.
function bearingFrom(center, point) {
  const dLat = point.lat - center.lat
  const dLon = (point.lon - center.lon) * Math.cos((center.lat * Math.PI) / 180)
  const deg = (Math.atan2(dLon, dLat) * 180) / Math.PI
  return deg < 0 ? deg + 360 : deg
}

function buildExitNotes(tags) {
  const notes = []
  if (tags?.wheelchair === 'yes') notes.push('Step-free access')
  if (tags?.wheelchair === 'no') notes.push('Not step-free')
  if (tags?.tactile_paving === 'yes') notes.push('Tactile paving')
  return notes.length ? notes.join('; ') : undefined
}

function normalizeExits(raw, structureWays, slug, stationId) {
  const center = raw.resolved_center

  const candidates = raw.entrances
    .filter((el) => el.type === 'node')
    .filter((el) => !EXCLUDED_ENTRANCE_VALUES.has(el.tags?.entrance))
    .filter((el) => !METRO_ONLY_RAILWAY_VALUES.has(el.tags?.railway))
    .filter((el) => nearestStructureDistance(el, structureWays) <= MAX_ENTRANCE_TO_STRUCTURE_M)
    .sort((a, b) => bearingFrom(center, a) - bearingFrom(center, b))

  return candidates.map((el, i) => {
    const name = el.tags?.name ?? el.tags?.['name:en']
    const notes = buildExitNotes(el.tags)
    return {
      id: `exit.${slug}.${el.id}`,
      station_id: stationId,
      label: name ?? `Exit ${i + 1}`,
      lat: el.lat,
      lon: el.lon,
      ...(notes ? { notes } : {}),
    }
  })
}

function normalizeFootprint(structureWays) {
  const buildingWays = structureWays.filter((el) => el.tags?.building === 'train_station')
  if (buildingWays.length === 0) return undefined
  const largest = buildingWays.reduce((a, b) => (a.geometry.length >= b.geometry.length ? a : b))
  return largest.geometry.map((p) => [p.lat, p.lon])
}

function normalizePlatforms(structureWays, slug) {
  return structureWays
    .filter((el) => el.tags?.railway === 'platform')
    .map((way, i) => ({
      id: `platform.${slug}.${way.tags?.ref ?? i + 1}`,
      points: way.geometry.map((p) => [p.lat, p.lon]),
    }))
}

// Points that fall outside the clip distance are dropped, not the whole
// way — a street that exits and re-enters range would draw a straight
// jump across the gap. Rare at this scale, and preferable to losing the
// whole segment.
function normalizeStreets(rawStreets, center, slug) {
  return rawStreets
    .filter((el) => el.type === 'way' && el.geometry?.length)
    .map((way) => ({
      way,
      points: way.geometry.filter((p) => distanceMeters(center, p) <= MAX_STREET_POINT_DISTANCE_M),
    }))
    .filter(({ points }) => points.length >= 2)
    .map(({ way, points }) => {
      const name = way.tags?.name ?? way.tags?.['name:en']
      return {
        id: `street.${slug}.${way.id}`,
        ...(name ? { name } : {}),
        points: points.map((p) => [p.lat, p.lon]),
      }
    })
}

function normalizePois(raw, slug, stationId) {
  return raw.pois
    .filter((el) => el.tags?.name || el.tags?.['name:en'])
    .map((el) => {
      const point = el.type === 'way' && el.geometry?.length ? wayCentroid(el.geometry) : el
      const category =
        el.tags.tourism ?? el.tags.historic ?? el.tags.amenity ?? el.tags.leisure ?? el.tags.shop ?? 'other'
      return {
        id: `poi.${slug}.${el.id}`,
        station_id: stationId,
        name: el.tags['name:en'] ?? el.tags.name,
        lat: point.lat,
        lon: point.lon,
        category,
      }
    })
}

function attachNearestExit(pois, exits) {
  if (exits.length === 0) return
  for (const poi of pois) {
    let nearest = exits[0]
    let nearestDist = distanceMeters(poi, nearest)
    for (const exit of exits.slice(1)) {
      const d = distanceMeters(poi, exit)
      if (d < nearestDist) {
        nearest = exit
        nearestDist = d
      }
    }
    poi.nearest_exit_id = nearest.id
  }
}

function normalizeStation(seedStation, raw) {
  const slug = seedStation.id.split('.').pop()
  const structureWays = raw.structure.filter(
    (el) => el.type === 'way' && el.geometry?.length && !isMetroWay(el),
  )

  const exits = normalizeExits(raw, structureWays, slug, seedStation.id)
  const pois = normalizePois(raw, slug, seedStation.id)
  attachNearestExit(pois, exits)

  const footprint = normalizeFootprint(structureWays)
  const platforms = normalizePlatforms(structureWays, slug)
  const streets = normalizeStreets(raw.streets ?? [], raw.resolved_center, slug)

  const station = {
    id: seedStation.id,
    name_en: seedStation.name_en,
    name_ja: seedStation.name_ja,
    lat: raw.resolved_center.lat,
    lon: raw.resolved_center.lon,
    line_ids: seedStation.line_ids,
    ...(footprint ? { footprint } : {}),
    ...(platforms.length ? { platforms } : {}),
    ...(streets.length ? { streets } : {}),
  }

  return { station, exits, pois }
}

async function normalize() {
  const seed = JSON.parse(await readFile(RAW_STATIONS_PATH, 'utf-8'))

  const allStations = []
  const allExits = []
  const allPois = []

  for (const seedStation of seed.stations) {
    const slug = seedStation.id.split('.').pop()
    const rawPath = path.join(RAW_OVERPASS_DIR, `${slug}.json`)

    let raw
    try {
      raw = JSON.parse(await readFile(rawPath, 'utf-8'))
    } catch {
      console.warn(`Skipping ${seedStation.name_en} — no raw Overpass pull at ${rawPath}. Run npm run data:exits first.`)
      continue
    }

    const { station, exits, pois } = normalizeStation(seedStation, raw)
    allStations.push(station)
    allExits.push(...exits)
    allPois.push(...pois)

    console.log(
      `${station.name_en}: ${exits.length} exits, ${pois.length} POIs, footprint=${Boolean(station.footprint)}, platforms=${station.platforms?.length ?? 0}, streets=${station.streets?.length ?? 0}`,
    )
  }

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(path.join(OUT_DIR, 'stations.json'), JSON.stringify(allStations, null, 2))
  await writeFile(path.join(OUT_DIR, 'exits.json'), JSON.stringify(allExits, null, 2))
  await writeFile(path.join(OUT_DIR, 'pois.json'), JSON.stringify(allPois, null, 2))
  console.log('\nWrote data/stations.json, data/exits.json, data/pois.json')
}

normalize().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
