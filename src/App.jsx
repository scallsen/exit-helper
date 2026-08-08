import { useMemo, useState } from 'react'
import Logo from './components/Logo.jsx'
import StationPicker from './components/StationPicker.jsx'
// StationMap is temporarily not rendered — the schematic footprint still
// doesn't look right (verified via bounding-box checks that the data is at
// least co-located, but the shape itself is under dispute). See
// MAP_EXPLORATION.md for what's been tried and the leading hypothesis.
// import StationMap from './components/StationMap.jsx'
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

        <main className="app-main">
          {station && (
            <>
              {destination ? (
                <ResultPanel
                  station={station}
                  destination={destination}
                  primary={ranked.primary}
                  alternates={ranked.alternates}
                  farther={ranked.farther}
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
