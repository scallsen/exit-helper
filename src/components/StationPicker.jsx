import { useId, useState } from 'react'
import { searchStations } from '../data/fixtures.js'
import './StationPicker.css'

export default function StationPicker({ selectedStation, onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const listboxId = useId()

  const results = open ? searchStations(query) : []

  if (selectedStation && !open) {
    return (
      <div className="station-picker station-picker-summary">
        <div className="station-picker-summary-label">Station</div>
        <button
          type="button"
          className="station-picker-summary-value"
          onClick={() => {
            setQuery('')
            setOpen(true)
          }}
        >
          <span>{selectedStation.name_en}</span>
          <span className="station-picker-summary-ja">{selectedStation.name_ja}</span>
          <span className="station-picker-change">Change</span>
        </button>
      </div>
    )
  }

  return (
    <div className="station-picker">
      <label className="station-picker-label" htmlFor="station-search">
        Station
      </label>
      <input
        id="station-search"
        className="station-picker-input"
        type="text"
        inputMode="search"
        autoComplete="off"
        placeholder="Search a Chuo-Sōbu station..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
      />
      {open && (
        <ul className="station-picker-list" id={listboxId} role="listbox">
          {results.length === 0 && (
            <li className="station-picker-empty">No stations match "{query}"</li>
          )}
          {results.map((station) => (
            <li key={station.id} role="option" aria-selected={selectedStation?.id === station.id}>
              <button
                type="button"
                className="station-picker-option"
                onClick={() => {
                  onSelect(station)
                  setOpen(false)
                  setQuery('')
                }}
              >
                <span className="station-picker-option-en">{station.name_en}</span>
                <span className="station-picker-option-ja">{station.name_ja}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
