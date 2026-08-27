const EARTH_RADIUS_M = 6371000
const WALK_METERS_PER_MIN = 80 // ~4.8km/h, a common casual-walking estimate

function toRad(deg) {
  return (deg * Math.PI) / 180
}

export function distanceMeters(a, b) {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

export function walkMinutes(meters) {
  return Math.max(1, Math.round(meters / WALK_METERS_PER_MIN))
}
