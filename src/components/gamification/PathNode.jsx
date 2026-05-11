import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { MascotPNG } from '../mascot'
import confetti from 'canvas-confetti'

export default function PathNode({
  node,
  state,
  section,
  isGlobalActive,
  masteryPct,
  wasLocked,
  sessionsCompleted,
  onPress,
}) {
  const [showLockedTip, setShowLockedTip] = useState(false)
  const nodeRef = useRef(null)

  const size = 56
  const isCompleted = state === 'completed'
  const isActive = state === 'active'
  const isLocked = state === 'locked'

  useEffect(() => {
    if (isGlobalActive && nodeRef.current) {
      nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isGlobalActive])

  const handlePress = () => {
    if (isLocked) {
      setShowLockedTip(true)
      setTimeout(() => setShowLockedTip(false), 1500)
      return
    }
    onPress()
  }

  const nodeColor = isLocked ? '#3D4A6B' : section.color

  const ringCircumference = Math.PI * (size - 6)

  return (
    <div ref={nodeRef} className="relative flex flex-col items-center gap-1">
      {/* START bubble above global active */}
      <AnimatePresence>
        {isGlobalActive && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="rounded-lg px-4 py-1.5 relative"
            style={{ background: '#1C1F2E' }}
          >
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: section.color }}>
              START
            </p>
            <div style={{
              position: 'absolute',
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #1C1F2E',
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        {/* Main node button */}
        <div className="relative flex-shrink-0" style={{ overflow: 'visible' }}>
          <motion.button
            initial={wasLocked ? { scale: 0, rotate: -15, opacity: 0 } : { scale: 1, opacity: 1 }}
            animate={{ scale: 1, rotate: 0, opacity: isLocked ? 0.6 : 1 }}
            transition={wasLocked ? { type: 'spring', stiffness: 260, damping: 14, delay: 0.1 } : {}}
            whileTap={!isLocked ? {
              y: 4,
              boxShadow: `0 2px 0 0 ${section.dark}, 0 4px 8px rgba(0,0,0,0.3)`,
            } : {}}
            onClick={handlePress}
            style={{
              width: size,
              height: size,
              backgroundColor: nodeColor,
              boxShadow: isLocked
                ? '0 6px 0 0 #1E2340, 0 7px 16px rgba(0,0,0,0.4)'
                : isGlobalActive
                ? `0 0 0 4px white, 0 0 0 8px ${section.color}, 0 6px 0 0 ${section.dark}, 0 8px 20px rgba(0,0,0,0.45)`
                : `0 6px 0 0 ${section.dark}, 0 8px 20px rgba(0,0,0,0.45)`,
            }}
            className="rounded-full flex items-center justify-center relative focus:outline-none"
          >
            {/* Pulsing ring for global active */}
            {isGlobalActive && (
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: section.color }}
              />
            )}

            {/* Glossy highlight */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: isLocked
                  ? 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.08) 0%, transparent 60%)'
                  : 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.30) 0%, transparent 60%)',
                zIndex: 5,
              }}
            />

            {/* Icon */}
            {isCompleted ? (
              <svg
                viewBox="0 0 24 24"
                className="w-8 h-8 relative z-10"
                fill="none"
                stroke="white"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <motion.path
                  d="M5 13l4 4L19 7"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </svg>
            ) : isLocked ? (
              <span className="text-slate-400 text-xl relative z-10">⭐</span>
            ) : (
              <span className="text-2xl relative z-10">{section.emoji}</span>
            )}
          </motion.button>

          {/* Mastery progress ring for completed nodes */}
          {isCompleted && (
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              style={{ width: size, height: size }}
              viewBox={`0 0 ${size} ${size}`}
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={size / 2 - 3}
                fill="none"
                stroke="white"
                strokeWidth={3}
                strokeOpacity={0.4}
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringCircumference * (1 - (masteryPct || 0) / 100)}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </svg>
          )}

          {/* Session progress ring for global active node */}
          {isGlobalActive && (() => {
            const ringSize = size + 48
            const cx = ringSize / 2
            const r = ringSize / 2 - 10
            const circ = 2 * Math.PI * r
            const offset = circ * (1 - (sessionsCompleted ?? 0) / 4)
            return (
              <svg
                className="absolute pointer-events-none"
                style={{ top: -24, left: -24, zIndex: 20 }}
                width={ringSize}
                height={ringSize}
                viewBox={`0 0 ${ringSize} ${ringSize}`}
              >
                <circle cx={cx} cy={cx} r={r} fill="none"
                  stroke="rgba(255,255,255,0.28)" strokeWidth={5} />
                <circle cx={cx} cy={cx} r={r} fill="none"
                  stroke="white" strokeWidth={5} strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={offset}
                  transform={`rotate(-90 ${cx} ${cx})`}
                  style={{ transition: 'stroke-dashoffset 600ms ease' }}
                />
              </svg>
            )
          })()}
        </div>

        {/* Mascot beside global active node */}
        <AnimatePresence>
          {isGlobalActive && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
            >
              <MascotPNG mascot={section.mascot} size={64} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* Stars for completed */}
      {isCompleted && (
        <div className="flex gap-0.5 text-amber-400 text-[10px] leading-none">★★★</div>
      )}

      {/* Locked tooltip */}
      <AnimatePresence>
        {showLockedTip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap z-50 border border-slate-600"
          >
            Complete previous topics first
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ChestNode({ unlocked, onClaim, claimed }) {
  const handleClaim = () => {
    if (!unlocked || claimed) return
    confetti({
      particleCount: 60,
      spread: 50,
      origin: { x: 0.5, y: 0.45 },
      colors: ['#f59e0b', '#fbbf24', '#fde68a'],
    })
    onClaim?.()
  }

  return (
    <div className="flex flex-col items-center gap-1 relative">
      <motion.button
        onClick={handleClaim}
        whileTap={unlocked && !claimed ? { scale: 0.9 } : {}}
        animate={unlocked && !claimed
          ? {
              scale: [1, 1.06, 1],
              boxShadow: [
                '0 0 0px rgba(251,191,36,0)',
                '0 0 14px rgba(251,191,36,0.6)',
                '0 0 0px rgba(251,191,36,0)',
              ],
            }
          : {}
        }
        transition={{ duration: 2, repeat: unlocked && !claimed ? Infinity : 0, ease: 'easeInOut' }}
        className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold focus:outline-none ${
          claimed
            ? 'bg-slate-600 text-teal-400'
            : unlocked
            ? 'bg-amber-400 shadow-lg cursor-pointer'
            : 'bg-slate-700 opacity-50 cursor-default'
        }`}
      >
        {claimed ? '✓' : '🎁'}
      </motion.button>
      {unlocked && !claimed && (
        <span className="text-[10px] font-bold text-amber-400">+100 XP</span>
      )}
    </div>
  )
}

export function HexNode({ label, locked, badge, onClick }) {
  const SIZE = 64
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={`flex items-center gap-4 w-full px-4 py-3 rounded-2xl transition-colors text-left ${
        locked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-50 dark:hover:bg-amber-900/10'
      }`}
    >
      <div className="relative flex-shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox="0 0 64 64">
          <polygon
            points="32,4 58,18 58,46 32,60 6,46 6,18"
            fill={locked ? '#94a3b8' : '#f59e0b'}
            opacity={locked ? 0.3 : 0.15}
            stroke={locked ? '#94a3b8' : '#f59e0b'}
            strokeWidth={locked ? 1.5 : 2}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {locked ? (
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
          {!locked && badge && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {locked ? 'Reach 60%+ in all subjects to unlock' : 'Full 225-question mock exam'}
        </p>
      </div>
    </button>
  )
}
