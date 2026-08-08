import { useId, useState } from 'react'
import { searchPois } from '../data/dataset.js'
import './DestinationSearch.css'

export default function DestinationSearch({ stationId, selectedPoi, onSelect, onClear }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const listboxId = useId()

  const results = open ? searchPois(stationId, query) : []

  if (selectedPoi && !open) {
    return (
      <div className="destination-search destination-search-summary">
        <div className="destination-search-summary-label">Destination</div>
        <div className="destination-search-summary-value">
          <span>{selectedPoi.name}</span>
          <button
            type="button"
            className="destination-search-clear"
            onClick={() => {
              onClear()
              setQuery('')
            }}
          >
            Clear
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="destination-search">
      <label className="destination-search-label" htmlFor="destination-search">
        Destination <span className="destination-search-optional">(optional)</span>
      </label>
      <input
        id="destination-search"
        className="destination-search-input"
        type="text"
        inputMode="search"
        autoComplete="off"
        placeholder="Where are you headed?"
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
        <ul className="destination-search-list" id={listboxId} role="listbox">
          {results.length === 0 && (
            <li className="destination-search-empty">No places match "{query}"</li>
          )}
          {results.map((poi) => (
            <li key={poi.id} role="option">
              <button
                type="button"
                className="destination-search-option"
                onClick={() => {
                  onSelect(poi)
                  setOpen(false)
                  setQuery('')
                }}
              >
                <span>{poi.name}</span>
                <span className="destination-search-option-category">{poi.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
