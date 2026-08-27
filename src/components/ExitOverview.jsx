import { useMemo } from 'react'
import { nearestExitsForPois } from '../lib/ranking.js'
import ExitCard from './ExitCard.jsx'
import './ExitOverview.css'

// Tier 1 (station only, SPEC.md): all exits + a short list of notable
// nearby places per exit. Neutral card state — no destination data yet.
export default function ExitOverview({ exits, pois }) {
  const byExit = useMemo(() => nearestExitsForPois(exits, pois), [exits, pois])

  return (
    <ul className="exit-overview">
      {exits.map((exit) => (
        <li key={exit.id}>
          <ExitCard exit={exit} state="neutral" nearby={byExit.get(exit.id) ?? []} />
        </li>
      ))}
    </ul>
  )
}
