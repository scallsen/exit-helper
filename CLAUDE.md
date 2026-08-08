# CLAUDE.md

Guidance for working in this repo. Full product spec lives in [SPEC.md](./SPEC.md) — read that first for data sources, schema, and v1 scope. This file is the *rules*, not the *what*.

## Guiding principles

**Progressive disclosure is the law.** Every feature must be useful at the "station only" input level and get sharper as more input arrives — station+destination, +incoming line, +share mode. Never gate the basic case behind data that isn't there yet. If a feature can't degrade gracefully to zero extra input, reconsider it.

**No live external calls per request.** ODPT and Overpass are hit by offline/periodic scripts in `scripts/`, writing normalized JSON to `data/`. The app and its ranking function run against that local dataset only — never call ODPT/Overpass from the frontend or from a per-request API path.

**Schema stays flat and additive.** `Exit.notes` (and similar loose fields) exist so accessibility info, curated "optimal car," or crowd corrections can attach later without a migration. Don't normalize these into new tables/relations preemptively — wait until there's a real second field that needs it.

**Straight-line distance is a deliberate v1 simplification, not a bug.** Don't build real indoor/walking-path routing to "fix" it. If it needs a caveat in the UI, add a caveat — don't add pathfinding.

**Don't hardcode the Chuo-Sōbu line into the architecture**, even though v1 data only covers it. Station/line/operator IDs, data pull scripts, and schema should all treat "which line" as data, not as an assumption baked into code.

**v1 non-goals — don't build these unless the spec changes:** multi-line transfer logic, real-time train/platform data, nationwide coverage, optimal-car/boarding-position computation, user accounts or submission flows.

## Visual identity

The theme is a real JR station exit sign at night — the sign is the one thing that should read as "signage," everything else recedes.

- **Surface**: dark app shell (`--color-bg` in `src/styles/tokens.css`, currently `#101014`). This is not a light/dark toggle — the dark shell is the identity, so it doesn't need a light-mode variant.
- **Signage accent**: yellow backdrop + black text/pictogram (`--color-sign-yellow` / `--color-sign-black`), used the way a real exit panel is used — as a discrete element (logo bar, primary CTA, exit markers), not a wash across the UI. Don't let yellow become a general "brand color" applied everywhere; it should stay legible as *a sign*.
- **Typography**: two fonts, split by language, matching real JR/Metro signage practice (Shin Go for Japanese, Frutiger/Frutiger-derived faces for Latin text on wayfinding signs). We don't hold licenses for the real Shin Go or Frutiger, so this uses open-license lookalikes instead, self-hosted via `@fontsource` (bundled at build time — no runtime CDN calls, consistent with "no live external calls"): `Fira Sans` (`--font-display` / `--font-body` in `src/styles/tokens.css`) for English/UI text, and `Noto Sans JP` (`--font-ja`) for `name_ja` and other Japanese text. Apply `--font-ja` explicitly to any element rendering Japanese — it isn't the default stack. This replaced the earlier single-font `DotGothic16` pixel treatment; the dot-matrix "departure board" look is no longer the typographic identity.
- **Shapes**: blocky, minimal radius (`--radius-sm`/`--radius-md` are 2–4px) — no soft/rounded corners, that breaks the pixel-art read.
- **Map view**: stylized schematic rendering of the station (exits as pixel icons on a custom diagram), not real basemap tiles. Real OSM/Leaflet tiles would clash with the retro aesthetic — Overpass data is still the geometry source, it's just rendered as a diagram, not a slippy map.
- **Mobile-first**: this is for people on the go. Design and build for a phone viewport first; tap targets should meet `--tap-target-min` (44px). Desktop is a secondary concern, not the design target.

The current logo (`src/components/Logo.jsx`) — a yellow horizontal bar with "Exit Helper" — is an explicit placeholder, not a final mark. Replace freely once real identity work happens.

## Stack

- Vite + React, plain JS (no TypeScript) — matches how other personal tools are built. Open to revisiting if there's a concrete reason, per SPEC.md.
- No CSS framework — plain CSS with design tokens in `src/styles/tokens.css`, keeps the pixel aesthetic from fighting a utility-class system.
- Deploy target: Vercel.

## Repo structure

```
src/            React app (Vite)
  components/   UI components
  styles/       design tokens (tokens.css)
scripts/        offline data pull: ODPT -> Overpass -> normalize -> data/
data/           generated JSON output of the pull — committed, since the app
                reads it as a static local dataset (see "no live calls" above)
SPEC.md         product spec — source of truth for scope and data model
```

`npm run data:pull` runs the three-step pipeline (`data:stations` → `data:exits` → `data:normalize`); each script is currently a stub (see SPEC.md "Core logic" for what each step should do).
