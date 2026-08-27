// Projects lat/lon points onto a small local SVG viewBox. This is a
// schematic diagram, not a map — see CLAUDE.md on why the map view renders
// a stylized station diagram instead of real basemap tiles.

const LAT_METERS_PER_DEG = 110940

function lonMetersPerDeg(lat) {
  return 111320 * Math.cos((lat * Math.PI) / 180)
}

function toMeters(center, p) {
  return {
    mx: (p.lon - center.lon) * lonMetersPerDeg(center.lat),
    my: (p.lat - center.lat) * LAT_METERS_PER_DEG,
  }
}

// Scale (px per meter) that fits `points` within a square viewBox of
// `size`, padded so markers never sit flush on the edge. Computed
// separately from projectWithScale so a wider, lower-priority point set
// (e.g. streets, which can run much farther out than the station's own
// exits/POIs) can be projected at the SAME scale as the primary content
// without being allowed to zoom it out — see StationMap.jsx.
export function computeScale(center, points, { size = 320, padding = 48 } = {}) {
  const maxExtent = points.reduce((max, p) => {
    const { mx, my } = toMeters(center, p)
    return Math.max(max, Math.abs(mx), Math.abs(my))
  }, 1)
  return (size / 2 - padding) / maxExtent
}

// Projects points around a center (usually the station) into {x, y} at a
// given scale. Points that land outside the viewBox are left as-is — the
// SVG element clips them visually (default UA overflow:hidden on <svg>).
export function projectWithScale(center, points, scale, size = 320) {
  return points.map((p) => {
    const { mx, my } = toMeters(center, p)
    return {
      ...p,
      x: size / 2 + mx * scale,
      // screen y grows downward; lat grows north, so flip
      y: size / 2 - my * scale,
    }
  })
}

// Convenience: auto-fits `points` to the viewBox and projects them in one
// call. Use computeScale + projectWithScale directly when a second, wider
// point set needs to share the same scale without influencing it.
export function projectPoints(center, points, opts = {}) {
  const scale = computeScale(center, points, opts)
  return projectWithScale(center, points, scale, opts.size ?? 320)
}

// Snaps a projected coordinate to a small grid so structural shapes
// (building footprint, platforms, streets) read as blocky/stepped rather
// than smooth OSM curves — reinforces the dot-matrix identity (see
// CLAUDE.md).  Exit/POI markers are NOT snapped — only context geometry.
//
// Step was originally 8px, which for a real (not hand-drawn) OSM building
// outline collapses too many adjacent vertices onto the same grid cell —
// verified against real footprint data: an 8px step made 38-64% of a
// station's outline points duplicate their neighbor, which is what was
// making real footprints look wrong (see MAP_EXPLORATION.md). 4px keeps the
// blocky read while preserving enough of the outline to stay recognizable.
export function snapToGrid(value, step = 4) {
  return Math.round(value / step) * step
}
