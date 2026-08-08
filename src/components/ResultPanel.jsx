import ShareButton from './ShareButton.jsx'
import './ResultPanel.css'

function formatDistance(meters) {
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`
}

function SecondaryExit({ alt }) {
  return (
    <li className="result-panel-secondary-item">
      <span className="result-panel-secondary-badge">{alt.exit.label}</span>
      <span className="result-panel-secondary-meta">
        +{alt.deltaMeters}m · {alt.walkMinutes} min walk
        {alt.exit.notes ? ` · ${alt.exit.notes}` : ''}
      </span>
    </li>
  )
}

// Tier 2 (station + destination, SPEC.md): ranked exit recommendation.
// Primary is the single closest exit, shown big. `alternates` are close
// enough to still surface by default; anything farther still exists as a
// station exit, so it stays reachable — just collapsed behind a disclosure
// instead of dropped from the UI.
export default function ResultPanel({ station, destination, primary, alternates, farther = [] }) {
  if (!primary) return null

  return (
    <div className="result-panel">
      <div className="result-panel-primary">
        <div className="result-panel-primary-label">Use</div>
        <div className="result-panel-primary-exit">{primary.exit.label}</div>
        <div className="result-panel-primary-meta">
          ≈{formatDistance(primary.distanceMeters)} · {primary.walkMinutes} min walk
        </div>
      </div>

      {alternates.length > 0 && (
        <div className="result-panel-secondary">
          <div className="result-panel-secondary-label">Also close</div>
          <ul>
            {alternates.map((alt) => (
              <SecondaryExit key={alt.exit.id} alt={alt} />
            ))}
          </ul>
        </div>
      )}

      {farther.length > 0 && (
        <details className="result-panel-more">
          <summary>
            {farther.length} more exit{farther.length > 1 ? 's' : ''} further away
          </summary>
          <ul>
            {farther.map((alt) => (
              <SecondaryExit key={alt.exit.id} alt={alt} />
            ))}
          </ul>
        </details>
      )}

      <p className="result-panel-caveat">
        Straight-line distance, not a routed walking path — treat as an estimate.
      </p>

      <ShareButton station={station} exit={primary.exit} destination={destination} />
    </div>
  )
}
