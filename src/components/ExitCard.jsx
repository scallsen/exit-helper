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

  const triggerClassName = ['exit-card-trigger', clickable && 'exit-card-trigger--clickable']
    .filter(Boolean)
    .join(' ')

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  const body = (
    <>
      <div className="exit-card-header">
        {eyebrow && <span className="exit-card-eyebrow">{eyebrow}</span>}
        {state === 'promoted' ? (
          <span className="exit-card-label">{exit.label}</span>
        ) : (
          <span className="exit-card-badge">{exit.label}</span>
        )}
        {exit.notes && <span className="exit-card-note">{exit.notes}</span>}
      </div>

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
    </>
  )

  return (
    <div className={className}>
      {clickable ? (
        // Whole card (header, meta, nearby list) is one tap target — a
        // <button> can't be used here since the action slot below may
        // render its own button (ShareButton), and buttons can't nest.
        <div
          className={triggerClassName}
          role="button"
          tabIndex={0}
          onClick={onSelect}
          onKeyDown={handleKeyDown}
        >
          {body}
        </div>
      ) : (
        <div className={triggerClassName}>{body}</div>
      )}

      {selected && action && <div className="exit-card-action">{action}</div>}
    </div>
  )
}
