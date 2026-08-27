# Exit Helper

Exit Helper is a lightweight web app for finding the best station exit for a
nearby destination. It is designed for the common moment where you already know
which station you are using, but do not want to build a full route in Google
Maps just to learn which exit to take.

The v1 pilot focuses on JR Chuo-Sōbu line stations. The architecture is meant
to be data-driven so more lines can be added later without hardcoding the line
into the app.

See [SPEC.md](./SPEC.md) for the full product spec and [AGENTS.md](./AGENTS.md)
for repo conventions.

## How It Works

The app follows a progressive-disclosure model:

- With only a station selected, it shows cached exits and nearby destinations.
- With a station and destination selected, it recommends the closest exit.
- Future inputs, like incoming line or share mode, should sharpen the answer
  without making the basic station-only case unusable.

Exit recommendations are based on straight-line distance from each cached exit
to the selected destination. This is a deliberate v1 simplification: the app
does not currently calculate indoor routes, walking paths, transfers, platform
position, or real-time train data.

## Data Sources

The app does not call external APIs from the frontend during normal use.
External data is pulled offline or periodically by scripts in `scripts/`, then
written to static JSON files in `data/`.

- **ODPT** provides station identity data: station names, coordinates,
  operators, and line metadata.
- **OpenStreetMap / Overpass API** provides station exit geometry and nearby
  POIs.
- **Local JSON** is the runtime data source for the React app.

Destination search is station-bounded. The frontend searches cached POIs for
the selected station only. It does not use public Nominatim autocomplete or live
Overpass search.

## Tech Stack

- **App framework:** Vite + React
- **Language:** plain JavaScript
- **Styling:** plain CSS with design tokens in `src/styles/tokens.css`
- **Data:** committed JSON files in `data/`
- **Offline scripts:** Node.js scripts in `scripts/`
- **Linting:** oxlint
- **Deploy target:** Vercel
- **Typography:** self-hosted DotGothic16 font files in `public/fonts/`

The visual direction is based on a JR station exit sign at night: a dark app
shell, yellow signage accents, black pictograms/text on yellow sign elements,
blocky shapes, minimal radius, and a custom schematic map rather than real map
tiles.

## Data Pipeline

```sh
npm run data:pull
```

The intended pipeline is:

1. Fetch station metadata from ODPT.
2. Fetch exits and nearby POIs from Overpass around each station.
3. Normalize everything into app-ready JSON under `data/`.

Current scripts:

- `scripts/fetch-odpt-stations.js`
- `scripts/fetch-overpass-exits.js`
- `scripts/normalize.js`

The frontend imports from:

- `data/stations.json`
- `data/exits.json`
- `data/pois.json`

## Dev

Install dependencies and start the dev server:

```
npm install
npm run dev
```

Build for production:

```sh
npm run build
```
