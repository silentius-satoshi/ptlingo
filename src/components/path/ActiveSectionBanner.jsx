import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ChevronDown } from 'lucide-react'

const CIRCUMFERENCE = 2 * Math.PI * 18

export default function ActiveSectionBanner({
  systemLabel,
  systemColor,
  masteryPct,
  missions,
  missionsOpen,
  onToggleMissions,
  onSwitcherOpen,
  dueCount = 0,
  onReviewTap,
}) {
  const displayMissions = missions.slice(0, 3)

  return (
    <div className="rounded-xl overflow-hidden">

      {/* Banner row */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: systemColor }}
      >
        {/* Left: tappable system info → opens subject switcher */}
        <button
          className="flex-1 text-left active:opacity-70 transition-opacity"
          onClick={onSwitcherOpen}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            BODY SYSTEM
          </p>
          <p className="text-base font-bold text-white leading-tight">
            {systemLabel}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <p
              className="text-xs font-semibold"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              {masteryPct}% mastered
            </p>
            <ChevronDown size={12} style={{ color: 'rgba(255,255,255,0.7)' }} />
          </div>
        </button>

        <div className="w-px self-stretch bg-white/20" />

        {/* Right: missions toggle */}
        <button
          className="rounded-lg p-2.5 bg-white/20 active:opacity-70 transition-opacity"
          onClick={onToggleMissions}
        >
          <BookOpen size={18} color="white" />
        </button>
      </div>

      {/* Missions dropdown */}
      <AnimatePresence>
        {missionsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-3 rounded-b-xl"
              style={{ backgroundColor: '#1C1F2E' }}
            >
              {dueCount > 0 && (
                <button
                  onClick={onReviewTap}
                  className="flex items-center gap-3 w-full py-2.5 border-b border-white/5 text-left active:opacity-70"
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 bg-red-500/20">
                    <span className="text-lg">🔁</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">Due for Review</p>
                    <p className="text-xs text-red-400 mt-0.5">
                      {dueCount} question{dueCount !== 1 ? 's' : ''} waiting
                    </p>
                  </div>
                  <span className="text-slate-400 text-xs">→</span>
                </button>
              )}
              {displayMissions.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">
                  No missions today
                </p>
              ) : (
                displayMissions.map((m, idx) => {
                  const progress = Math.min(m.progress, m.target)
                  const pct = m.target > 0 ? progress / m.target : 0
                  const offset = CIRCUMFERENCE * (1 - pct)
                  const isLast = idx === displayMissions.length - 1
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-3 py-2.5${!isLast ? ' border-b border-white/5' : ''}`}
                    >
                      <svg width="44" height="44" viewBox="0 0 44 44">
                        <circle
                          cx="22" cy="22" r="18"
                          fill="none"
                          stroke="rgba(255,255,255,0.15)"
                          strokeWidth="3"
                        />
                        <circle
                          cx="22" cy="22" r="18"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={CIRCUMFERENCE}
                          strokeDashoffset={offset}
                          transform="rotate(-90 22 22)"
                          style={{ transition: 'stroke-dashoffset 400ms ease' }}
                        />
                        <text
                          x="22" y="22"
                          dominantBaseline="middle"
                          textAnchor="middle"
                          fill="white"
                          fontSize="9"
                          fontWeight="bold"
                        >
                          {progress}
                        </text>
                      </svg>

                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">{m.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {m.progress} / {m.target}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
