// Step 1 of the data pull (see SPEC.md "Core logic").
// Station identity (name/coords/line) only — no exit data, see SPEC.md Data
// Sources. Meant to query ODPT, but that developer account is still pending
// approval, so this pulls the same shape of identity data from
// Seo-4d696b75/station_database instead (public, no API key, CC-BY 4.0:
// https://github.com/Seo-4d696b75/station_database). Swap back to a real
// ODPT call once access lands — nothing downstream needs to change shape.
// Run periodically, not per-request.

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_PATH = path.join(__dirname, '../data/raw/stations.json')

const STATION_DATASET_URL =
  'https://raw.githubusercontent.com/Seo-4d696b75/station_database/main/out/main/station.json'

// Which line to pull — "which line" is data/config, not an architectural
// assumption (see CLAUDE.md). JR中央・総武線 (JR Chuo-Sobu local line).
const LINE_CODE = 11313
const LINE_ID = 'odpt.Railway:JR-East.ChuoSobu'

// station_database's `name`/`name_kana` are mechanically-derived kana
// readings — romanizing them programmatically gets long vowels and
// compass-prefix hyphenation wrong often enough to matter for a demo (e.g.
// こうえんじ -> "Kouenji" instead of the real "Koenji", まくはりほんごう ->
// "Makuharihongou" instead of "Makuharihongo", にしおぎくぼ -> missing the
// hyphen in "Nishi-Ogikubo"). Hand-verified against JR East's own English
// signage/Wikipedia instead, keyed by station_database's stable `code`.
const NAME_EN_BY_CODE = {
  1130207: 'Yoyogi',
  1130208: 'Shinjuku',
  1130222: 'Akihabara',
  1130524: 'Nishi-Funabashi',
  1131102: 'Yotsuya',
  1131104: 'Kichijoji',
  1131105: 'Mitaka',
  1131203: 'Ochanomizu',
  1131214: 'Nakano',
  1131215: 'Koenji',
  1131216: 'Asagaya',
  1131217: 'Ogikubo',
  1131218: 'Nishi-Ogikubo',
  1131308: 'Higashi-Nakano',
  1131309: 'Okubo',
  1131312: 'Sendagaya',
  1131313: 'Shinanomachi',
  1131315: 'Ichigaya',
  1131316: 'Iidabashi',
  1131317: 'Suidobashi',
  1131320: 'Asakusabashi',
  1131321: 'Ryogoku',
  1131322: 'Kinshicho',
  1131323: 'Kameido',
  1131324: 'Hirai',
  1131325: 'Shin-Koiwa',
  1131326: 'Koiwa',
  1131327: 'Ichikawa',
  1131328: 'Moto-Yawata',
  1131329: 'Shimousa-Nakayama',
  1131331: 'Funabashi',
  1131332: 'Higashi-Funabashi',
  1131333: 'Tsudanuma',
  1131334: 'Makuharihongo',
  1131335: 'Makuhari',
  1131336: 'Shin-Kemigawa',
  1131337: 'Inage',
  1131338: 'Nishi-Chiba',
  1131339: 'Chiba',
}

function toStationId(nameEn) {
  return `odpt.Station:JR-East.ChuoSobuLine.${nameEn.replace(/-/g, '')}`
}

async function fetchOdptStations() {
  const res = await fetch(STATION_DATASET_URL)
  if (!res.ok) {
    throw new Error(`station_database fetch failed: ${res.status} ${res.statusText}`)
  }
  const allStations = await res.json()
  const onLine = allStations.filter((s) => s.lines?.includes(LINE_CODE))

  const missingNames = onLine.filter((s) => !NAME_EN_BY_CODE[s.code])
  if (missingNames.length > 0) {
    throw new Error(
      `No hand-verified name_en for station code(s): ${missingNames.map((s) => s.code).join(', ')} — add them to NAME_EN_BY_CODE before regenerating.`,
    )
  }

  const stations = onLine
    .map((s) => {
      const name_en = NAME_EN_BY_CODE[s.code]
      return {
        id: toStationId(name_en),
        name_en,
        name_ja: s.original_name,
        lat: s.lat,
        lon: s.lng,
        line_ids: [LINE_ID],
      }
    })
    .sort((a, b) => a.name_en.localeCompare(b.name_en))

  await mkdir(path.dirname(OUT_PATH), { recursive: true })
  await writeFile(
    OUT_PATH,
    JSON.stringify(
      {
        _note:
          'Station identity pulled from Seo-4d696b75/station_database (see scripts/fetch-odpt-stations.js) as a stand-in for the real ODPT call, since the ODPT developer account is still pending approval. lat/lon here are real station coordinates but still treated as approximate search anchors only, NOT the source-of-truth station point — fetch-overpass-exits.js resolves the precise coordinate itself via Overpass. Regenerate via `npm run data:stations` once ODPT access lands; nothing downstream should need to change shape.',
        stations,
      },
      null,
      2,
    ),
  )
  console.log(`Wrote ${stations.length} stations to ${path.relative(process.cwd(), OUT_PATH)}`)
}

fetchOdptStations().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
