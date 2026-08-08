import { useEffect, useState } from 'react'
import ExitCard from './ExitCard.jsx'
import ShareButton from './ShareButton.jsx'
import './ResultPanel.css'

function formatDistance(meters) {
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`
}

function alternateMeta(ranked) {
  return `+${ranked.deltaMeters}m · ${ranked.walkMinutes} min walk${
    ranked.exit.notes ? ` · ${ranked.exit.notes}` : ''
  }`
}

// Tier 2 (station + destination, SPEC.md): ranked exit recommendation.
// Primary renders as the promoted card, everything else as low-priority
// cards ranked by distance (see ExitCard for what each state means).
//
// The share button follows whichever exit is selected — primary by
// default, but clicking any other exit card makes it the share target
// instead, so "share the exit I'm actually using" isn't locked to whatever
// the ranking picked.
export default function ResultPanel({ station, destination, primary, alternates, farther = [] }) {
  const [selectedExitId, setSelectedExitId] = useState(primary?.exit.id ?? null)

  useEffect(() => {
    if (primary) setSelectedExitId(primary.exit.id)
  }, [primary])

  if (!primary) return null

  function renderCard(ranked, state, extra = {}) {
    return (
      <ExitCard
        key={ranked.exit.id}
        exit={ranked.exit}
        state={state}
        selected={selectedExitId === ranked.exit.id}
        onSelect={() => setSelectedExitId(ranked.exit.id)}
        action={<ShareButton station={station} exit={ranked.exit} destination={destination} />}
        {...extra}
      />
    )
  }

  return (
    <div className="result-panel">
      <div className="result-panel-section">
        <div className="result-panel-section-label">Recommended</div>
        {renderCard(primary, 'promoted', {
          meta: `≈${formatDistance(primary.distanceMeters)} · ${primary.walkMinutes} min walk`,
        })}
      </div>

      {alternates.length > 0 && (
        <div className="result-panel-section">
          <div className="result-panel-section-label">Also close</div>
          <ul className="result-panel-list">
            {alternates.map((alt) => (
              <li key={alt.exit.id}>{renderCard(alt, 'low-priority', { meta: alternateMeta(alt) })}</li>
            ))}
          </ul>
        </div>
      )}

      {farther.length > 0 && (
        <details className="result-panel-more">
          <summary>
            {farther.length} more exit{farther.length > 1 ? 's' : ''} further away
          </summary>
          <ul className="result-panel-list">
            {farther.map((alt) => (
              <li key={alt.exit.id}>{renderCard(alt, 'low-priority', { meta: alternateMeta(alt) })}</li>
            ))}
          </ul>
        </details>
      )}

      <p className="result-panel-caveat">
        Straight-line distance, not a routed walking path — treat as an estimate.
      </p>
    </div>
  )
}
