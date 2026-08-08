import { distanceMeters, walkMinutes } from './geo.js'

// ~150m / ~2min walking, per SPEC.md's rank_exits tolerance.
const ALTERNATE_TOLERANCE_M = 150

// rank_exits(station_id, destination): straight-line distance from every
// exit to the destination, closest wins, anything within tolerance of the
// winner rides along as an alternate. Deliberate v1 simplification — see
// CLAUDE.md on why this isn't real indoor routing.
export function rankExits(stationExits, destination) {
  if (!stationExits.length) return { primary: null, alternates: [] }

  const ranked = stationExits
    .map((exit) => {
      const meters = distanceMeters(exit, destination)
      return { exit, distanceMeters: meters, walkMinutes: walkMinutes(meters) }
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters)

  const [primary, ...rest] = ranked
  const alternates = rest
    .filter((r) => r.distanceMeters - primary.distanceMeters <= ALTERNATE_TOLERANCE_M)
    .map((r) => ({
      ...r,
      deltaMeters: Math.round(r.distanceMeters - primary.distanceMeters),
      deltaMinutes: Math.max(0, r.walkMinutes - primary.walkMinutes),
    }))

  return { primary, alternates }
}

// Assigns each POI to its nearest exit — used for the station-only tier
// ("all exits + a short list of notable nearby places per exit"). Computed
// client-side here for the placeholder dataset; SPEC.md notes this would
// normally be computed at ingest time and cached in the POI record.
export function nearestExitsForPois(stationExits, stationPois, { limit = 3 } = {}) {
  const byExit = new Map(stationExits.map((exit) => [exit.id, []]))

  for (const poi of stationPois) {
    let closest = null
    let closestDist = Infinity
    for (const exit of stationExits) {
      const d = distanceMeters(exit, poi)
      if (d < closestDist) {
        closestDist = d
        closest = exit
      }
    }
    if (closest) {
      byExit.get(closest.id).push({ poi, distanceMeters: closestDist })
    }
  }

  for (const list of byExit.values()) {
    list.sort((a, b) => a.distanceMeters - b.distanceMeters)
    list.length = Math.min(list.length, limit)
  }

  return byExit
}
