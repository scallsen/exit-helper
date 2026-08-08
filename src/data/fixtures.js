// Placeholder dataset for UX development while the ODPT developer account is
// pending approval. This is hand-authored fake data shaped like the schema
// in SPEC.md — it is NOT the output of scripts/, and does not belong in
// data/ (which is reserved for the committed output of the real pull
// pipeline). Swap this module out once data/ has real content; nothing in
// src/ outside this file and its consumers should need to change.
//
// Coordinates are approximate (rounded from real station locations) and
// exit/POI placements are illustrative, not surveyed — good enough to
// exercise search, the schematic map, and the ranking function.

export const stations = [
  {
    id: 'odpt.Station:JR-East.ChuoSobuLine.Ochanomizu',
    name_en: 'Ochanomizu',
    name_ja: 'お茶の水',
    lat: 35.6995,
    lon: 139.7649,
    line_ids: ['odpt.Railway:JR-East.ChuoSobu'],
  },
  {
    id: 'odpt.Station:JR-East.ChuoSobuLine.Suidobashi',
    name_en: 'Suidobashi',
    name_ja: '水道橋',
    lat: 35.702,
    lon: 139.753,
    line_ids: ['odpt.Railway:JR-East.ChuoSobu'],
  },
  {
    id: 'odpt.Station:JR-East.ChuoSobuLine.Yotsuya',
    name_en: 'Yotsuya',
    name_ja: '四ツ谷',
    lat: 35.6857,
    lon: 139.73,
    line_ids: ['odpt.Railway:JR-East.ChuoSobu'],
  },
]

export const exits = [
  // Ochanomizu
  {
    id: 'exit.Ochanomizu.1',
    station_id: 'odpt.Station:JR-East.ChuoSobuLine.Ochanomizu',
    label: 'Hijiribashi Exit',
    lat: 35.70058,
    lon: 139.76562,
  },
  {
    id: 'exit.Ochanomizu.2',
    station_id: 'odpt.Station:JR-East.ChuoSobuLine.Ochanomizu',
    label: 'Denki-gai Exit',
    lat: 35.6986,
    lon: 139.76623,
  },
  {
    id: 'exit.Ochanomizu.3',
    station_id: 'odpt.Station:JR-East.ChuoSobuLine.Ochanomizu',
    label: 'Juntendo Exit',
    lat: 35.69978,
    lon: 139.76338,
    notes: 'Elevator access',
  },
  // Suidobashi
  {
    id: 'exit.Suidobashi.1',
    station_id: 'odpt.Station:JR-East.ChuoSobuLine.Suidobashi',
    label: 'West Exit',
    lat: 35.70234,
    lon: 139.75178,
  },
  {
    id: 'exit.Suidobashi.2',
    station_id: 'odpt.Station:JR-East.ChuoSobuLine.Suidobashi',
    label: 'East Exit',
    lat: 35.70163,
    lon: 139.75431,
  },
  {
    id: 'exit.Suidobashi.3',
    station_id: 'odpt.Station:JR-East.ChuoSobuLine.Suidobashi',
    label: 'Mizumachi Exit',
    lat: 35.7009,
    lon: 139.75268,
    notes: 'Elevator access',
  },
  // Yotsuya
  {
    id: 'exit.Yotsuya.1',
    station_id: 'odpt.Station:JR-East.ChuoSobuLine.Yotsuya',
    label: 'Akasaka Exit',
    lat: 35.68611,
    lon: 139.73129,
  },
  {
    id: 'exit.Yotsuya.2',
    station_id: 'odpt.Station:JR-East.ChuoSobuLine.Yotsuya',
    label: 'Shinjuku-dori Exit',
    lat: 35.68498,
    lon: 139.72913,
  },
  {
    id: 'exit.Yotsuya.3',
    station_id: 'odpt.Station:JR-East.ChuoSobuLine.Yotsuya',
    label: 'Sophia University Exit',
    lat: 35.68625,
    lon: 139.72908,
  },
]

export const pois = [
  // Ochanomizu
  { id: 'poi.Ochanomizu.1', station_id: 'odpt.Station:JR-East.ChuoSobuLine.Ochanomizu', name: 'Nikolai Cathedral', lat: 35.70012, lon: 139.76508, category: 'landmark' },
  { id: 'poi.Ochanomizu.2', station_id: 'odpt.Station:JR-East.ChuoSobuLine.Ochanomizu', name: 'Hijiribashi Bridge', lat: 35.70089, lon: 139.76601, category: 'landmark' },
  { id: 'poi.Ochanomizu.3', station_id: 'odpt.Station:JR-East.ChuoSobuLine.Ochanomizu', name: 'Meiji University', lat: 35.69912, lon: 139.76301, category: 'school' },
  { id: 'poi.Ochanomizu.4', station_id: 'odpt.Station:JR-East.ChuoSobuLine.Ochanomizu', name: 'Juntendo Hospital', lat: 35.70021, lon: 139.76276, category: 'hospital' },
  { id: 'poi.Ochanomizu.5', station_id: 'odpt.Station:JR-East.ChuoSobuLine.Ochanomizu', name: 'Akihabara Electric Town (edge)', lat: 35.69798, lon: 139.76689, category: 'shopping' },
  { id: 'poi.Ochanomizu.6', station_id: 'odpt.Station:JR-East.ChuoSobuLine.Ochanomizu', name: 'Kanda River Walk', lat: 35.69921, lon: 139.76589, category: 'landmark' },
  // Suidobashi
  { id: 'poi.Suidobashi.1', station_id: 'odpt.Station:JR-East.ChuoSobuLine.Suidobashi', name: 'Tokyo Dome', lat: 35.70567, lon: 139.75189, category: 'landmark' },
  { id: 'poi.Suidobashi.2', station_id: 'odpt.Station:JR-East.ChuoSobuLine.Suidobashi', name: 'Korakuen Amusement Park', lat: 35.70456, lon: 139.75234, category: 'entertainment' },
  { id: 'poi.Suidobashi.3', station_id: 'odpt.Station:JR-East.ChuoSobuLine.Suidobashi', name: 'LaQua Spa', lat: 35.70389, lon: 139.75298, category: 'entertainment' },
  { id: 'poi.Suidobashi.4', station_id: 'odpt.Station:JR-East.ChuoSobuLine.Suidobashi', name: 'Chuo University (law campus)', lat: 35.70201, lon: 139.7549, category: 'school' },
  { id: 'poi.Suidobashi.5', station_id: 'odpt.Station:JR-East.ChuoSobuLine.Suidobashi', name: 'Koishikawa Botanical Garden (edge)', lat: 35.70678, lon: 139.75102, category: 'landmark' },
  // Yotsuya
  { id: 'poi.Yotsuya.1', station_id: 'odpt.Station:JR-East.ChuoSobuLine.Yotsuya', name: 'Sophia University', lat: 35.68651, lon: 139.7288, category: 'school' },
  { id: 'poi.Yotsuya.2', station_id: 'odpt.Station:JR-East.ChuoSobuLine.Yotsuya', name: 'Yotsuya Station Tower', lat: 35.68512, lon: 139.73021, category: 'shopping' },
  { id: 'poi.Yotsuya.3', station_id: 'odpt.Station:JR-East.ChuoSobuLine.Yotsuya', name: 'Akasaka Palace (guest house edge)', lat: 35.68398, lon: 139.7325, category: 'landmark' },
  { id: 'poi.Yotsuya.4', station_id: 'odpt.Station:JR-East.ChuoSobuLine.Yotsuya', name: 'Sanshu-en Garden', lat: 35.68679, lon: 139.73158, category: 'landmark' },
  { id: 'poi.Yotsuya.5', station_id: 'odpt.Station:JR-East.ChuoSobuLine.Yotsuya', name: 'Yotsuya Kojimachi Post Office', lat: 35.68579, lon: 139.72851, category: 'other' },
]

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
