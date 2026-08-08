// Projects lat/lon points onto a small local SVG viewBox. This is a
// schematic diagram, not a map — see CLAUDE.md on why the map view renders
// a stylized station diagram instead of real basemap tiles.

const LAT_METERS_PER_DEG = 110940

function lonMetersPerDeg(lat) {
  return 111320 * Math.cos((lat * Math.PI) / 180)
}

// Projects points around a center (usually the station) into {x, y} within
// a square viewBox of `size`, padded so markers never sit flush on the edge.
export function projectPoints(center, points, { size = 320, padding = 48 } = {}) {
  const lonScale = lonMetersPerDeg(center.lat)

  const toMeters = (p) => ({
    mx: (p.lon - center.lon) * lonScale,
    my: (p.lat - center.lat) * LAT_METERS_PER_DEG,
  })

  const withMeters = points.map((p) => ({ ...p, ...toMeters(p) }))
  const maxExtent = withMeters.reduce(
    (max, p) => Math.max(max, Math.abs(p.mx), Math.abs(p.my)),
    1,
  )

  const half = size / 2 - padding
  const scale = half / maxExtent

  return withMeters.map((p) => ({
    ...p,
    x: size / 2 + p.mx * scale,
    // screen y grows downward; lat grows north, so flip
    y: size / 2 - p.my * scale,
  }))
}
