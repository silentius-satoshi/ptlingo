import { useState, useEffect } from 'react'
import Lottie from 'lottie-react'

const BODY_PATH = 'M 4 24 H 60 V 48 Q 60 52 56 52 H 8 Q 4 52 4 48 Z'
const LID_PATH  = 'M 2 24 H 62 L 58 12 H 6 Z'

const COLORS = {
  locked:   { body: '#2A2D3A', lid: '#222630', latch: '#1a1d26', shadow: '#1a1d26' },
  unlocked: { body: '#F59E0B', lid: '#FBBF24', latch: '#92400E', shadow: '#B45309' },
  opened:   { body: '#374151', lid: '#4B5563', latch: '#4B5563', shadow: '#1a1d26' },
}

export default function TreasureChest({ state, onClaim }) {
  const [opening, setOpening]       = useState(false)
  const [showLottie, setShowLottie] = useState(false)
  const [coinsAnim, setCoinsAnim]   = useState(null)

  useEffect(() => {
    fetch('/animations/coins_burst.json')
      .then(r => r.json())
      .then(setCoinsAnim)
      .catch(() => {})
  }, [])

  const handleClick = () => {
    if (state !== 'unlocked' || opening) return
    setOpening(true)
    if (coinsAnim) {
      setShowLottie(true)
      setTimeout(() => setShowLottie(false), 1500)
    }
    setTimeout(() => setOpening(false), 400)
    onClaim?.()
  }

  const isOpen = state === 'opened' || opening
  const c = COLORS[state] ?? COLORS.locked

  return (
    <div className="relative flex items-center justify-center" style={{ width: 64 }}>
      {state === 'unlocked' && (
        <style>{`
          @keyframes chestGlow {
            0%, 100% { filter: drop-shadow(0 0 6px rgba(245,158,11,0.4)); }
            50%       { filter: drop-shadow(0 0 16px rgba(245,158,11,0.85)); }
          }
        `}</style>
      )}

      <button
        onClick={handleClick}
        disabled={state !== 'unlocked'}
        className="relative focus:outline-none"
        style={{ cursor: state === 'unlocked' ? 'pointer' : 'default' }}
      >
        <svg
          viewBox="0 0 64 52"
          width={64}
          height={52}
          style={{ animation: state === 'unlocked' ? 'chestGlow 2s ease-in-out infinite' : 'none' }}
        >
          {/* Drop shadow */}
          <rect x={6} y={48} width={52} height={4} rx={2} fill={c.shadow} opacity={0.5} />

          {/* Body */}
          <path d={BODY_PATH} fill={c.body} />

          {/* Body highlight band */}
          {state !== 'opened' && (
            <rect x={8} y={28} width={48} height={4} rx={2} fill="rgba(255,255,255,0.15)" />
          )}

          {/* Star inside body when opened */}
          {state === 'opened' && (
            <text x={32} y={44} textAnchor="middle" fontSize="14" fill="#6B7280">★</text>
          )}

          {/* Lid — rotates open */}
          <g style={{
            transformBox: 'fill-box',
            transformOrigin: 'top center',
            transform: isOpen ? 'rotate(-115deg)' : 'rotate(0deg)',
            transition: 'transform 400ms ease-in-out',
          }}>
            <path d={LID_PATH} fill={c.lid} />
          </g>

          {/* Latch on body */}
          <circle cx={32} cy={24} r={5} fill={c.latch} />
        </svg>

        {/* ! badge */}
        {state === 'unlocked' && (
          <div className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center pointer-events-none">
            <span className="text-white text-[10px] font-black leading-none">!</span>
          </div>
        )}
      </button>

      {/* Lottie coins burst overlay */}
      {showLottie && coinsAnim && (
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <Lottie animationData={coinsAnim} loop={false} style={{ width: 120, height: 120 }} />
        </div>
      )}
    </div>
  )
}
