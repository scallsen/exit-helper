import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { computeScale, projectWithScale, snapToGrid } from '../lib/projection.js'
import './StationMap.css'

const SIZE = 320
const PADDING = 40

const MIN_ZOOM = 0.6
const MAX_ZOOM = 6
const BUTTON_ZOOM_FACTOR = 1.5
const WHEEL_ZOOM_FACTOR = 1.15
// How close to zoom in when auto-centering on the chosen exit — tuned to
// still show a little surrounding context (nearby POIs), not just the pin.
const FOCUS_ZOOM = 2.5
const DEFAULT_VIEW = { zoom: 1, panX: 0, panY: 0 }

// Real OSM data names anywhere from a handful to 100+ ways per station —
// far too many to label at once without burying the exits/POIs the map is
// actually for. Mimic how a real map fades minor roads in as you zoom: major
// roads (trunk/primary/secondary) can label as soon as they're legibly long
// on screen; everything else (residential streets, pedestrian paths, and
// anything OSM left unclassified) only earns a label once the rider has
// zoomed in past FOCUS_ZOOM-ish, when there's room to read them.
const MAJOR_HIGHWAY_CLASSES = new Set(['motorway', 'trunk', 'primary', 'secondary'])
const MINOR_STREET_LABEL_MIN_ZOOM = 2
const STREET_LABEL_MIN_SCREEN_LENGTH = 36

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

// Snapping independently can put two adjacent-but-distinct vertices in the
// same grid cell (common on dense real OSM outlines) — drop consecutive
// duplicates so those collapse into a clean vertex instead of a
// zero-length edge, which is what was distorting real footprints (see
// MAP_EXPLORATION.md and snapToGrid's comment).
function toSvgPoints(pts) {
  const snapped = pts.map((p) => [snapToGrid(p.x), snapToGrid(p.y)])
  const deduped = snapped.filter((p, i) => i === 0 || p[0] !== snapped[i - 1][0] || p[1] !== snapped[i - 1][1])
  return deduped.map(([x, y]) => `${x},${y}`).join(' ')
}

// Stylized schematic diagram of a station — exits and POIs as pixel-style
// markers on a local plot, not real basemap tiles. See CLAUDE.md: real
// OSM/Leaflet tiles would clash with the retro sign aesthetic. Footprint,
// platform, and street geometry (if present) are context shapes, not a
// floor plan or a navigable map — see the note in fixtures.js on why real
// indoor walls aren't available.
//
// Pan/zoom: single-finger/mouse drag to pan, wheel or +/- buttons to zoom
// (anchored at the cursor for wheel, at the current view center for the
// buttons), plus a Fit button back to the auto-fit view. Deliberately no
// pinch-to-zoom gesture — the zoom buttons already give touch users a
// 44px-min tap target for zoom (per CLAUDE.md's tap-target rule), and
// pinch's two-pointer math isn't worth the added risk for what this is
// meant to be: basic movement controls, not a full map-gesture library.
export default function StationMap({
  station,
  exits,
  pois,
  destination,
  primaryExitId,
  alternateExitIds = [],
  focusExitId = null,
  onExitFocus,
}) {
  const [activeId, setActiveId] = useState(null)
  const [view, setView] = useState(DEFAULT_VIEW)
  const svgRef = useRef(null)
  const draggingPointerIdRef = useRef(null)
  const lastPointerPosRef = useRef(null)

  const footprint = useMemo(() => station.footprint ?? [], [station])
  const platforms = useMemo(() => station.platforms ?? [], [station])
  const streets = useMemo(() => station.streets ?? [], [station])

  // Scale is fit to the station's own content (exits/POIs/footprint/
  // platforms) only. Streets reuse this same scale rather than joining the
  // fit — they can run much farther out than the station itself, and
  // letting them into the auto-fit would shrink the actual signage to make
  // room for a distant avenue. Streets that land outside the viewBox at
  // this scale just get clipped, which is the right behavior for "context
  // that runs off-frame."
  const corePoints = useMemo(
    () => [
      ...exits.map((e) => ({ ...e, kind: 'exit' })),
      ...pois.map((p) => ({ ...p, kind: 'poi' })),
      ...(destination ? [{ ...destination, kind: 'destination' }] : []),
      ...footprint.map(([lat, lon], i) => ({ id: `footprint-${i}`, lat, lon, kind: 'footprint' })),
      ...platforms.flatMap((platform, pIdx) =>
        platform.points.map(([lat, lon], i) => ({
          id: `platform-${pIdx}-${i}`,
          lat,
          lon,
          kind: 'platform',
          platformIdx: pIdx,
        })),
      ),
    ],
    [exits, pois, destination, footprint, platforms],
  )

  const scale = useMemo(
    () => computeScale(station, corePoints, { size: SIZE, padding: PADDING }),
    [station, corePoints],
  )
  const projected = useMemo(
    () => projectWithScale(station, corePoints, scale, SIZE),
    [station, corePoints, scale],
  )

  const streetPointsRaw = useMemo(
    () =>
      streets.flatMap((street, sIdx) =>
        street.points.map(([lat, lon], i) => ({ id: `street-${sIdx}-${i}`, lat, lon, streetIdx: sIdx })),
      ),
    [streets],
  )
  const projectedStreets = useMemo(
    () => projectWithScale(station, streetPointsRaw, scale, SIZE),
    [station, streetPointsRaw, scale],
  )
  const streetLines = streets.map((_, sIdx) => projectedStreets.filter((p) => p.streetIdx === sIdx))

  // One label per street name, not per way — OSM often splits a single
  // named street into several ways (intersections, jurisdiction changes),
  // and labeling every segment would repeat the same name down its length.
  // Keep whichever segment is longest so the label lands somewhere with
  // room for it.
  const namedStreetLabels = useMemo(() => {
    const byName = new Map()
    streets.forEach((street, sIdx) => {
      if (!street.name) return
      const pts = projectedStreets.filter((p) => p.streetIdx === sIdx)
      if (pts.length < 2) return
      let worldLength = 0
      for (let i = 1; i < pts.length; i += 1) {
        worldLength += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
      }
      const mid = pts[Math.floor(pts.length / 2)]
      const existing = byName.get(street.name)
      if (!existing || worldLength > existing.worldLength) {
        byName.set(street.name, { name: street.name, isMajor: MAJOR_HIGHWAY_CLASSES.has(street.class), mid, worldLength })
      }
    })
    return [...byName.values()]
  }, [streets, projectedStreets])

  const exitPoints = projected.filter((p) => p.kind === 'exit')
  const poiPoints = projected.filter((p) => p.kind === 'poi')
  const destPoint = projected.find((p) => p.kind === 'destination')
  const primaryPoint = exitPoints.find((p) => p.id === primaryExitId)
  const footprintPoints = projected.filter((p) => p.kind === 'footprint')
  const platformLines = platforms.map((_, pIdx) =>
    projected.filter((p) => p.kind === 'platform' && p.platformIdx === pIdx),
  )

  // --- pan/zoom helpers -----------------------------------------------
  // View state maps a "world" point (the plain projected x/y computed
  // above) to a viewBox point as: viewBoxPoint = world * zoom + pan. All
  // the anchoring math below is just that equation solved for whichever
  // side is unknown.

  const viewBoxPointFromClient = useCallback((clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect()
    const factor = SIZE / rect.width
    return { x: (clientX - rect.left) * factor, y: (clientY - rect.top) * factor }
  }, [])

  const worldPointFromViewBox = useCallback(
    (viewBoxPoint, currentView) => ({
      x: (viewBoxPoint.x - currentView.panX) / currentView.zoom,
      y: (viewBoxPoint.y - currentView.panY) / currentView.zoom,
    }),
    [],
  )

  // Inverse of worldPointFromViewBox — used for icon markers (exits, POIs,
  // destination), which are rendered outside the zoomed <g> below so they
  // stay a constant screen size at any zoom, but still need to track pan
  // and zoom for their position.
  function toScreen(worldPoint) {
    return { x: worldPoint.x * view.zoom + view.panX, y: worldPoint.y * view.zoom + view.panY }
  }

  // Zooms to `targetZoom` while keeping whatever world point sits under
  // `viewBoxAnchor` fixed in place on screen — this is what makes
  // cursor-anchored wheel zoom (and button zoom, anchored at the view
  // center) feel stable instead of the view jumping around.
  const zoomTo = useCallback((targetZoomOrFn, viewBoxAnchor) => {
    setView((current) => {
      const targetZoom = clamp(
        typeof targetZoomOrFn === 'function' ? targetZoomOrFn(current.zoom) : targetZoomOrFn,
        MIN_ZOOM,
        MAX_ZOOM,
      )
      const anchorWorld = worldPointFromViewBox(viewBoxAnchor, current)
      return {
        zoom: targetZoom,
        panX: viewBoxAnchor.x - anchorWorld.x * targetZoom,
        panY: viewBoxAnchor.y - anchorWorld.y * targetZoom,
      }
    })
  }, [worldPointFromViewBox])

  const zoomByFactorAtCenter = useCallback(
    (factor) => zoomTo((z) => z * factor, { x: SIZE / 2, y: SIZE / 2 }),
    [zoomTo],
  )

  const resetView = useCallback(() => setView(DEFAULT_VIEW), [])

  const centerOnWorldPoint = useCallback((worldPoint, targetZoom) => {
    const zoom = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM)
    setView({
      zoom,
      panX: SIZE / 2 - worldPoint.x * zoom,
      panY: SIZE / 2 - worldPoint.y * zoom,
    })
  }, [])

  // Auto-center/zoom on whichever exit is "chosen" (the ranked
  // recommendation by default, or whatever the rider tapped instead —
  // see App.jsx, which lifts this state so ResultPanel and the map agree).
  // Overrides any manual pan/zoom, on purpose: picking a different exit is
  // a deliberate action that should always bring it into focus.
  useEffect(() => {
    if (!focusExitId) {
      resetView()
      return
    }
    const point = exitPoints.find((p) => p.id === focusExitId)
    if (point) centerOnWorldPoint(point, FOCUS_ZOOM)
    // exitPoints is recomputed every render but only actually changes
    // identity when station/exits/scale change — station.id captures that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusExitId, station.id, centerOnWorldPoint, resetView])

  // Wheeling over the map should zoom it, not scroll the page underneath.
  // Browsers default wheel listeners to passive (for scroll performance),
  // which silently ignores preventDefault() — attaching this natively with
  // { passive: false } (rather than via JSX onWheel, which can't
  // reliably opt out of that default) is what actually stops the page
  // scroll.
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    function handleNativeWheel(event) {
      event.preventDefault()
      const factor = event.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR
      zoomTo((z) => z * factor, viewBoxPointFromClient(event.clientX, event.clientY))
    }
    el.addEventListener('wheel', handleNativeWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleNativeWheel)
  }, [zoomTo, viewBoxPointFromClient])

  function handlePointerDown(event) {
    if (draggingPointerIdRef.current !== null) return
    draggingPointerIdRef.current = event.pointerId
    lastPointerPosRef.current = { x: event.clientX, y: event.clientY }
    svgRef.current.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event) {
    if (draggingPointerIdRef.current !== event.pointerId) return
    const rect = svgRef.current.getBoundingClientRect()
    const factor = SIZE / rect.width
    const dx = (event.clientX - lastPointerPosRef.current.x) * factor
    const dy = (event.clientY - lastPointerPosRef.current.y) * factor
    lastPointerPosRef.current = { x: event.clientX, y: event.clientY }
    setView((v) => ({ ...v, panX: v.panX + dx, panY: v.panY + dy }))
  }

  function handlePointerUp(event) {
    if (draggingPointerIdRef.current !== event.pointerId) return
    draggingPointerIdRef.current = null
    lastPointerPosRef.current = null
  }

  function selectExit(id) {
    setActiveId((cur) => (cur === id ? null : id))
    onExitFocus?.(id)
  }

  return (
    <div className="station-map">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="station-map-svg"
        role="img"
        aria-label={`Schematic map of ${station.name_en} station exits`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          <pattern id="station-map-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" className="station-map-grid-dot" />
          </pattern>
        </defs>
        {/* Oversized relative to the viewBox so panning doesn't run out of
            background before it runs out of content. */}
        <rect
          x={-SIZE * 2}
          y={-SIZE * 2}
          width={SIZE * 5}
          height={SIZE * 5}
          fill="url(#station-map-grid)"
        />

        <g transform={`translate(${view.panX} ${view.panY}) scale(${view.zoom})`}>
          {streetLines.map((pts, idx) =>
            pts.length > 1 ? (
              <polyline key={idx} className="station-map-street" points={toSvgPoints(pts)} />
            ) : null,
          )}

          {footprintPoints.length > 2 && (
            <polygon className="station-map-footprint" points={toSvgPoints(footprintPoints)} />
          )}

          {platformLines.map((pts, idx) =>
            pts.length > 1 ? (
              <polyline key={idx} className="station-map-platform" points={toSvgPoints(pts)} />
            ) : null,
          )}

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

          {/* station center — no text label: the station name is already
              shown in the picker above the map, and the label collided with
              exit markers whenever entrances cluster near the center */}
          <rect
            x={SIZE / 2 - 5}
            y={SIZE / 2 - 5}
            width="10"
            height="10"
            className="station-map-center"
          />
        </g>

        {/* Icon markers (POIs, destination, exits) are deliberately OUTSIDE
            the zoomed group above and positioned by hand via toScreen —
            they're pins you tap and read, not map content, so they should
            stay a constant, legible size at any zoom instead of ballooning
            or shrinking with the surrounding geometry. */}
        {namedStreetLabels.map((s) => {
          const screenLength = s.worldLength * view.zoom
          if (screenLength < STREET_LABEL_MIN_SCREEN_LENGTH) return null
          if (!s.isMajor && view.zoom < MINOR_STREET_LABEL_MIN_ZOOM) return null
          const screen = toScreen(s.mid)
          return (
            <text key={s.name} x={screen.x} y={screen.y} className="station-map-street-label">
              {s.name}
            </text>
          )
        })}

        {poiPoints.map((p) => {
          const screen = toScreen(p)
          return (
            <g
              key={p.id}
              className={`station-map-poi ${activeId === p.id ? 'is-active' : ''}`}
              onClick={() => setActiveId((cur) => (cur === p.id ? null : p.id))}
            >
              <circle cx={screen.x} cy={screen.y} r="3.5" />
              {activeId === p.id && (
                <text x={screen.x} y={screen.y - 8} textAnchor="middle" className="station-map-poi-label">
                  {p.name}
                </text>
              )}
            </g>
          )
        })}

        {destPoint &&
          (() => {
            const screen = toScreen(destPoint)
            return (
              <g className="station-map-destination">
                <circle cx={screen.x} cy={screen.y} r="6" />
                <text x={screen.x} y={screen.y - 12} textAnchor="middle" className="station-map-destination-label">
                  {destPoint.name}
                </text>
              </g>
            )
          })()}

        {/* Numbered in the same order as data/exits.json (bearing order
            from normalize.js), matching how a real station numbers its
            exits. */}
        {exitPoints.map((e, index) => {
          const isPrimary = e.id === primaryExitId
          const isAlternate = alternateExitIds.includes(e.id)
          // Real entrances often cluster 15-40m apart — always-on labels
          // for every exit collide into an unreadable pile. Only the
          // recommended exit gets a standing label (it's the answer);
          // everything else reveals on tap, same as POIs below. The full
          // list with names still lives in ExitOverview under the map.
          const showLabel = isPrimary || activeId === e.id
          const screen = toScreen(e)
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
              onClick={() => selectExit(e.id)}
            >
              <rect x={screen.x - 8} y={screen.y - 8} width="16" height="16" />
              <text x={screen.x} y={screen.y} textAnchor="middle" dominantBaseline="central" className="station-map-exit-number">
                {index + 1}
              </text>
              {showLabel && (
                <text x={screen.x} y={screen.y + 22} textAnchor="middle" className="station-map-exit-label">
                  {e.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <div className="station-map-controls">
        <button type="button" aria-label="Zoom in" onClick={() => zoomByFactorAtCenter(BUTTON_ZOOM_FACTOR)}>
          +
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomByFactorAtCenter(1 / BUTTON_ZOOM_FACTOR)}>
          −
        </button>
        <button type="button" aria-label="Reset view" onClick={resetView} className="station-map-control-fit">
          Fit
        </button>
      </div>
    </div>
  )
}
