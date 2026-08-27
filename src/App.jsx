import { useEffect, useMemo, useState } from 'react'
import Logo from './components/Logo.jsx'
import StationPicker from './components/StationPicker.jsx'
import StationMap from './components/StationMap.jsx'
import ExitOverview from './components/ExitOverview.jsx'
import DestinationSearch from './components/DestinationSearch.jsx'
import ResultPanel from './components/ResultPanel.jsx'
import { exitsForStation, poisForStation } from './data/dataset.js'
import { rankExits } from './lib/ranking.js'
import './App.css'

function App() {
  const [station, setStation] = useState(null)
  const [destination, setDestination] = useState(null)

  const stationExits = useMemo(() => (station ? exitsForStation(station.id) : []), [station])
  const stationPois = useMemo(() => (station ? poisForStation(station.id) : []), [station])

  const ranked = useMemo(() => {
    if (!destination || stationExits.length === 0) return { primary: null, alternates: [], farther: [] }
    return rankExits(stationExits, destination)
  }, [destination, stationExits])

  // Which exit is "chosen" — the ranked recommendation by default, or
  // whatever the rider tapped instead (an alternate's card, or a marker on
  // the map directly). Lifted up here, rather than kept local to
  // ResultPanel, so the map can auto-center/zoom on it too (see
  // StationMap's focusExitId prop) and both stay in sync.
  const [selectedExitId, setSelectedExitId] = useState(null)

  useEffect(() => {
    setSelectedExitId(ranked.primary?.exit.id ?? null)
  }, [ranked.primary?.exit.id])

  function handleSelectStation(next) {
    setStation(next)
    setDestination(null)
  }

  return (
    <div className="app">
      <Logo />
      <div className="app-content">
        <header className="app-header">
          <StationPicker selectedStation={station} onSelect={handleSelectStation} />

          {station && (
            <DestinationSearch
              stationId={station.id}
              selectedPoi={destination}
              onSelect={setDestination}
              onClear={() => setDestination(null)}
            />
          )}
        </header>

        <hr className="app-divider" />

        <main className="app-main">
          {station && (
            <>
              <StationMap
                station={station}
                exits={stationExits}
                pois={stationPois}
                destination={destination}
                primaryExitId={ranked.primary?.exit.id ?? null}
                alternateExitIds={ranked.alternates.map((alt) => alt.exit.id)}
                focusExitId={selectedExitId}
                onExitFocus={setSelectedExitId}
              />

              {destination ? (
                <ResultPanel
                  station={station}
                  destination={destination}
                  primary={ranked.primary}
                  alternates={ranked.alternates}
                  farther={ranked.farther}
                  selectedExitId={selectedExitId}
                  onSelectExit={setSelectedExitId}
                />
              ) : (
                <ExitOverview exits={stationExits} pois={stationPois} />
              )}
            </>
          )}

          {!station && (
            <p className="app-hint">Pick a station to see its exits — add a destination once you have one.</p>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
