// Step 1 of the data pull (see SPEC.md "Core logic").
// Queries ODPT for Chuo-Sōbu station list -> names, coordinates, line.
// ODPT gives station identity only (no exit data) — see SPEC.md Data Sources.
// Requires ODPT_CONSUMER_KEY (see .env.example). Run periodically, not per-request.

async function fetchOdptStations() {
  throw new Error('not implemented yet')
}

fetchOdptStations()
