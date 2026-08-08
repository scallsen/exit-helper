// Real data, produced by the scripts/ pipeline (data:exits -> data:normalize)
// against live Overpass output — see data/raw/ for the raw pull and
// scripts/normalize.js for the transform. Same function API as
// fixtures.js on purpose, so switching between them is just an import path
// change in the components that consume this.

import stations from '../../data/stations.json'
import exits from '../../data/exits.json'
import pois from '../../data/pois.json'

export function stationsList() {
  return stations
}

export function findStation(stationId) {
  return stations.find((s) => s.id === stationId) ?? null
}

export function exitsForStation(stationId) {
  return exits.filter((e) => e.station_id === stationId)
}

export function poisForStation(stationId) {
  return pois.filter((p) => p.station_id === stationId)
}

export function searchStations(query) {
  const q = query.trim().toLowerCase()
  if (!q) return stations
  return stations.filter(
    (s) => s.name_en.toLowerCase().includes(q) || s.name_ja.includes(q),
  )
}

export function searchPois(stationId, query) {
  const q = query.trim().toLowerCase()
  const scoped = poisForStation(stationId)
  if (!q) return scoped
  return scoped.filter((p) => p.name.toLowerCase().includes(q))
}
