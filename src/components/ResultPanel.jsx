import ShareButton from './ShareButton.jsx'
import './ResultPanel.css'

// Tier 2 (station + destination, SPEC.md): ranked exit recommendation —
// primary + close alternates.
export default function ResultPanel({ station, destination, primary, alternates }) {
  if (!primary) return null

  return (
    <div className="result-panel">
      <div className="result-panel-primary">
        <div className="result-panel-primary-label">Use</div>
        <div className="result-panel-primary-exit">{primary.exit.label}</div>
        <div className="result-panel-primary-meta">
          ≈{primary.distanceMeters < 1000 ? `${Math.round(primary.distanceMeters)}m` : `${(primary.distanceMeters / 1000).toFixed(1)}km`}
          {' · '}
          {primary.walkMinutes} min walk
        </div>
      </div>

      {alternates.length > 0 && (
        <div className="result-panel-alternates">
          <div className="result-panel-alternates-label">Also close</div>
          <ul>
            {alternates.map((alt) => (
              <li key={alt.exit.id}>
                <span className="result-panel-alt-name">{alt.exit.label}</span>
                <span className="result-panel-alt-delta">
                  +{alt.deltaMeters}m
                  {alt.exit.notes ? ` · ${alt.exit.notes}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="result-panel-caveat">
        Straight-line distance, not a routed walking path — treat as an estimate.
      </p>

      <ShareButton station={station} exit={primary.exit} destination={destination} />
    </div>
  )
}
