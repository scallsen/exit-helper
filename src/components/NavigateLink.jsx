import './NavigateLink.css'

// Real walking-directions deep link — no API key needed, works everywhere
// (opens the Maps app on mobile, web Maps on desktop). Built entirely from
// coordinates already in the local dataset, so it's just an outbound link,
// not a live call the app makes.
//
// Origin/destination are plain lat/lon pins, so Maps can't route through
// the exit gate specifically — but real street-level routing for that last
// leg covers exactly where the app's straight-line distance simplification
// is weakest (see CLAUDE.md).
export default function NavigateLink({ exit, destination }) {
  const url = `https://www.google.com/maps/dir/?api=1&origin=${exit.lat},${exit.lon}&destination=${destination.lat},${destination.lon}&travelmode=walking`

  return (
    <a className="navigate-link" href={url} target="_blank" rel="noopener noreferrer">
      Walking directions →
    </a>
  )
}
