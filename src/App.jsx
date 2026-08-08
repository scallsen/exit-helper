import { useMemo, useState } from 'react'
import Logo from './components/Logo.jsx'
import StationPicker from './components/StationPicker.jsx'
import StationMap from './components/StationMap.jsx'
import ExitOverview from './components/ExitOverview.jsx'
import DestinationSearch from './components/DestinationSearch.jsx'
import ResultPanel from './components/ResultPanel.jsx'
import { exitsForStation, poisForStation } from './data/fixtures.js'
import { rankExits } from './lib/ranking.js'
import './App.css'

function App() {
  const [station, setStation] = useState(null)
  const [destination, setDestination] = useState(null)

  const stationExits = useMemo(() => (station ? exitsForStation(station.id) : []), [station])
  const stationPois = useMemo(() => (station ? poisForStation(station.id) : []), [station])

  const ranked = useMemo(() => {
    if (!destination || stationExits.length === 0) return { primary: null, alternates: [] }
    return rankExits(stationExits, destination)
  }, [destination, stationExits])

  function handleSelectStation(next) {
    setStation(next)
    setDestination(null)
  }

  return (
    <div className="app">
      <Logo />
      <div className="app-databadge">Preview data — ODPT account pending, exits/places shown here are placeholders</div>
      <main className="app-main">
        <div className="app-search-group">
          <StationPicker selectedStation={station} onSelect={handleSelectStation} />

          {station && (
            <DestinationSearch
              stationId={station.id}
              selectedPoi={destination}
              onSelect={setDestination}
              onClear={() => setDestination(null)}
            />
          )}
        </div>

        {station && (
          <>
            <StationMap
              station={station}
              exits={stationExits}
              pois={stationPois}
              destination={destination}
              primaryExitId={ranked.primary?.exit.id}
              alternateExitIds={ranked.alternates.map((a) => a.exit.id)}
            />

            {destination ? (
              <ResultPanel
                station={station}
                destination={destination}
                primary={ranked.primary}
                alternates={ranked.alternates}
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
  )
}

export default App
