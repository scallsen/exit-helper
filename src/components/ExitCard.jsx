import './ExitCard.css'

// Shared exit-card presentation. Same card, three states, per CLAUDE.md's
// progressive disclosure principle — it gets sharper as more input arrives:
//   - neutral: no destination yet — nearby places, no distance data.
//   - promoted: the one recommendation once a destination narrows things
//     down — full yellow panel, largest type.
//   - low-priority: every other exit once ranked — nearby places are
//     replaced by distance data, same bordered chrome as neutral.
export default function ExitCard({
  exit,
  state = 'neutral',
  eyebrow,
  meta,
  nearby,
  selected = false,
  onSelect,
  action,
}) {
  const clickable = typeof onSelect === 'function'
  const className = ['exit-card', `exit-card--${state}`, selected && 'exit-card--selected']
    .filter(Boolean)
    .join(' ')

  const header = (
    <>
      {eyebrow && <span className="exit-card-eyebrow">{eyebrow}</span>}
      {state === 'promoted' ? (
        <span className="exit-card-label">{exit.label}</span>
      ) : (
        <span className="exit-card-badge">{exit.label}</span>
      )}
      {exit.notes && <span className="exit-card-note">{exit.notes}</span>}
    </>
  )

  return (
    <div className={className}>
      {clickable ? (
        <button type="button" className="exit-card-trigger" onClick={onSelect}>
          {header}
        </button>
      ) : (
        <div className="exit-card-trigger">{header}</div>
      )}

      {meta && <div className="exit-card-meta">{meta}</div>}

      {nearby !== undefined &&
        (nearby.length > 0 ? (
          <ul className="exit-card-nearby">
            {nearby.map(({ poi }) => (
              <li key={poi.id}>{poi.name}</li>
            ))}
          </ul>
        ) : (
          <p className="exit-card-empty">No nearby places recorded yet</p>
        ))}

      {selected && action && <div className="exit-card-action">{action}</div>}
    </div>
  )
}
