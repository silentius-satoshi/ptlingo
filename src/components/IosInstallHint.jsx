import { useEffect, useState } from 'react'

export default function IosInstallHint() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const ua = window.navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches
    const dismissed = localStorage.getItem('ios-install-hint-dismissed') === 'true'
    if (isIOS && !isStandalone && !dismissed) setShow(true)
  }, [])

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-slate-200">
          <strong className="block text-white mb-1">Install NPTE Prep</strong>
          Tap Share, then "Add to Home Screen" for the full app experience.
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem('ios-install-hint-dismissed', 'true')
            setShow(false)
          }}
          className="text-slate-400 hover:text-white text-lg leading-none"
          aria-label="Dismiss"
        >×</button>
      </div>
    </div>
  )
}
