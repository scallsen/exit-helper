import { useMemo } from 'react'
import { nearestExitsForPois } from '../lib/ranking.js'
import './ExitOverview.css'

// Tier 1 (station only, SPEC.md): all exits + a short list of notable
// nearby places per exit.
export default function ExitOverview({ exits, pois }) {
  const byExit = useMemo(() => nearestExitsForPois(exits, pois), [exits, pois])

  return (
    <ul className="exit-overview">
      {exits.map((exit) => {
        const nearby = byExit.get(exit.id) ?? []
        return (
          <li key={exit.id} className="exit-overview-item">
            <div className="exit-overview-header">
              <span className="exit-overview-badge">{exit.label}</span>
              {exit.notes && <span className="exit-overview-note">{exit.notes}</span>}
            </div>
            {nearby.length > 0 ? (
              <ul className="exit-overview-nearby">
                {nearby.map(({ poi }) => (
                  <li key={poi.id}>{poi.name}</li>
                ))}
              </ul>
            ) : (
              <p className="exit-overview-empty">No nearby places recorded yet</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
