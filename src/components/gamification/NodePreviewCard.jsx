import { motion } from 'framer-motion'
import useGamificationStore from '../../stores/gamificationStore'
export default function NodePreviewCard({ section, masteryPct, onStart, onDismiss }) {
  const sessionSize = useGamificationStore(s => {
    const levels = s.pathNodeLevels ?? {}
    const level = levels[section?.masteryKey?.toLowerCase()] ?? 0
    return level === 0 ? 2 : level === 1 ? 5 : level === 2 ? 10 : 15
  })

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onDismiss} />

      {/* Card */}
      <motion.div
        className="relative z-50 w-full max-w-xs rounded-2xl p-6"
        style={{ background: section.color }}
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.1 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <img
            src={section.mascot?.startsWith('/') ? section.mascot : `/mascots/${section.mascot}.png`}
            alt=""
            style={{ width: 130, height: 130, objectFit: 'contain' }}
          />
          <div>
            <p className="text-white font-bold text-lg leading-tight">{section.label}</p>
            <p className="text-sm text-white/70">{sessionSize} questions</p>
          </div>
        </div>

        {/* Mastery bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-1.5">
            <span className="text-xs font-medium text-white/70">Mastery</span>
            <span className="text-xs font-bold text-white">{Math.round(masteryPct ?? 0)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.25)' }}>
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${Math.round(masteryPct ?? 0)}%` }}
            />
          </div>
        </div>

        {/* START button */}
        <button
          onClick={onStart}
          className="w-full py-3 rounded-xl font-bold text-base tracking-wide bg-white"
          style={{ color: section.color }}
        >
          Start Session
        </button>
      </motion.div>
    </div>
  )
}
