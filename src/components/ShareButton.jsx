import { useState } from 'react'
import './ShareButton.css'

// Mock share affordance (SPEC.md tier 4): same computation, framed as a
// shareable pin/link. No backend in this UX pass — builds a fake URL
// client-side and copies it, standing in for a real short-link service.
export default function ShareButton({ station, exit, destination }) {
  const [copied, setCopied] = useState(false)

  const params = new URLSearchParams({ exit: exit.id })
  if (destination) params.set('to', destination.id)
  const fakeUrl = `https://exithelper.app/s/${encodeURIComponent(station.id.split('.').pop())}?${params.toString()}`

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(fakeUrl)
    } catch {
      // clipboard API unavailable (e.g. insecure context) — link is still shown below
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="share-button">
      <button type="button" className="share-button-action" onClick={handleShare}>
        {copied ? 'Link copied' : 'Share this exit'}
      </button>
      <code className="share-button-url">{fakeUrl}</code>
    </div>
  )
}
