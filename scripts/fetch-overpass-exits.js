// Step 2 of the data pull (see SPEC.md "Core logic").
// For each station from fetch-odpt-stations.js, queries Overpass for exits
// (railway=subway_entrance / entrance=yes) and POIs within ~300m.
// This is the actual source for exit geometry and nearby-place data —
// coverage is community-maintained, expect it to vary by station.

async function fetchOverpassExitsAndPois() {
  throw new Error('not implemented yet')
}

fetchOverpassExitsAndPois()
