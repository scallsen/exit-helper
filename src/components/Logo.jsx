import './Logo.css'

/**
 * Placeholder logo: a horizontal exit-sign bar carrying the app name.
 * Standing in for a real mark until the visual identity is designed.
 */
export default function Logo() {
  return (
    <div className="logo-bar" role="img" aria-label="Exit Helper">
      <span className="logo-bar-text">
        Exit <span className="logo-bar-highlight">Helper</span>
      </span>
    </div>
  )
}
