import { useMemo, useState } from 'react'
import { projectPoints } from '../lib/projection.js'
import './StationMap.css'

const SIZE = 320

// Stylized schematic diagram of a station — exits and POIs as pixel-style
// markers on a local plot, not real basemap tiles. See CLAUDE.md: real
// OSM/Leaflet tiles would clash with the retro sign aesthetic.
export default function StationMap({
  station,
  exits,
  pois,
  destination,
  primaryExitId,
  alternateExitIds = [],
}) {
  const [activeId, setActiveId] = useState(null)

  const projected = useMemo(() => {
    const points = [
      ...exits.map((e) => ({ ...e, kind: 'exit' })),
      ...pois.map((p) => ({ ...p, kind: 'poi' })),
      ...(destination ? [{ ...destination, kind: 'destination' }] : []),
    ]
    return projectPoints(station, points, { size: SIZE, padding: 40 })
  }, [station, exits, pois, destination])

  const exitPoints = projected.filter((p) => p.kind === 'exit')
  const poiPoints = projected.filter((p) => p.kind === 'poi')
  const destPoint = projected.find((p) => p.kind === 'destination')
  const primaryPoint = exitPoints.find((p) => p.id === primaryExitId)

  return (
    <div className="station-map">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="station-map-svg"
        role="img"
        aria-label={`Schematic map of ${station.name_en} station exits`}
      >
        <defs>
          <pattern id="station-map-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" className="station-map-grid-dot" />
          </pattern>
        </defs>
        <rect width={SIZE} height={SIZE} fill="url(#station-map-grid)" />

        {/* straight-line path to destination — deliberately not a routed path */}
        {destPoint && primaryPoint && (
          <line
            className="station-map-path"
            x1={primaryPoint.x}
            y1={primaryPoint.y}
            x2={destPoint.x}
            y2={destPoint.y}
          />
        )}

        {/* station center */}
        <rect
          x={SIZE / 2 - 7}
          y={SIZE / 2 - 7}
          width="14"
          height="14"
          className="station-map-center"
        />
        <text x={SIZE / 2} y={SIZE / 2 + 24} textAnchor="middle" className="station-map-center-label">
          {station.name_en}
        </text>

        {poiPoints.map((p) => (
          <g
            key={p.id}
            className={`station-map-poi ${activeId === p.id ? 'is-active' : ''}`}
            onClick={() => setActiveId((cur) => (cur === p.id ? null : p.id))}
          >
            <circle cx={p.x} cy={p.y} r="3.5" />
            {activeId === p.id && (
              <text x={p.x} y={p.y - 8} textAnchor="middle" className="station-map-poi-label">
                {p.name}
              </text>
            )}
          </g>
        ))}

        {destPoint && (
          <g className="station-map-destination">
            <circle cx={destPoint.x} cy={destPoint.y} r="6" />
            <text x={destPoint.x} y={destPoint.y - 12} textAnchor="middle" className="station-map-destination-label">
              {destPoint.name}
            </text>
          </g>
        )}

        {exitPoints.map((e) => {
          const isPrimary = e.id === primaryExitId
          const isAlternate = alternateExitIds.includes(e.id)
          return (
            <g
              key={e.id}
              className={[
                'station-map-exit',
                isPrimary && 'is-primary',
                isAlternate && 'is-alternate',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <rect x={e.x - 8} y={e.y - 8} width="16" height="16" />
              <text x={e.x} y={e.y + 22} textAnchor="middle" className="station-map-exit-label">
                {e.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
