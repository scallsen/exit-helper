import './NavigateLink.css'

// Real walking-directions deep links — no API key needed, work everywhere
// (open the respective Maps app on mobile, web Maps on desktop). Built
// entirely from coordinates already in the local dataset, so these are
// just outbound links, not a live call the app makes.
//
// Origin/destination are plain lat/lon pins, so Maps can't route through
// the exit gate specifically — but real street-level routing for that last
// leg covers exactly where the app's straight-line distance simplification
// is weakest (see CLAUDE.md). Both Google and Apple are offered since
// there's no reliable way to know which app a visitor prefers without
// fragile user-agent sniffing.
const PROVIDERS = {
  google: {
    label: 'Google Maps',
    buildUrl: (exit, destination) =>
      `https://www.google.com/maps/dir/?api=1&origin=${exit.lat},${exit.lon}&destination=${destination.lat},${destination.lon}&travelmode=walking`,
  },
  apple: {
    label: 'Apple Maps',
    buildUrl: (exit, destination) =>
      `https://maps.apple.com/?saddr=${exit.lat},${exit.lon}&daddr=${destination.lat},${destination.lon}&dirflg=w`,
  },
}

export default function NavigateLink({ exit, destination, provider }) {
  const { label, buildUrl } = PROVIDERS[provider]

  return (
    <a className="navigate-link" href={buildUrl(exit, destination)} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  )
}
