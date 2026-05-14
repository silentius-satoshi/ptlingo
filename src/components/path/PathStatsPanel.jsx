import { useNavigate } from 'react-router-dom'
import useGamificationStore from '../../stores/gamificationStore'
import { useAuthStore } from '../../store/authStore'

const CIRCUMFERENCE = 2 * Math.PI * 18

export default function PathStatsPanel({ visibleSection, masteryPct, missions, dueCount, onReviewTap, isAnonymous }) {
  const navigate = useNavigate()
  const displayMissions = (missions || []).slice(0, 3)
  const { streak, coins, energy } = useGamificationStore(s => ({
    streak: s.streak ?? 0,
    coins: s.coins ?? 0,
    energy: s.energy ?? 0,
  }))
  const examDate = useAuthStore(s => s.profile?.exam_date)
  const daysLeft = examDate
    ? Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="flex flex-col gap-3">

      {/* Stats row */}
      <div
        className="flex items-center justify-around rounded-2xl p-3"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {[
          { emoji: '🔥', value: streak, label: 'Streak' },
          { emoji: '💎', value: coins,  label: 'Gems'   },
          { emoji: '⚡', value: energy, label: 'Energy' },
        ].map(({ emoji, value, label }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <span className="text-lg">{emoji}</span>
            <span className="text-white font-black text-sm">{value}</span>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider">{label}</span>
          </div>
        ))}
      </div>

      {/* Exam countdown */}
      {daysLeft !== null && daysLeft >= 0 && (
        <div
          className="rounded-2xl px-4 py-3 text-center"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-white font-black text-xl">{daysLeft} days to exam</p>
          <p className="text-slate-400 text-xs mt-0.5">
            {new Date(examDate).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </p>
        </div>
      )}

      {/* Card 1 — Current section */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: `${visibleSection.color}22`,
          border: `1px solid ${visibleSection.color}44`,
        }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-1"
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          Current Section
        </p>
        <p className="text-white font-bold text-sm mb-3">{visibleSection.label}</p>
        <div
          className="h-1.5 rounded-full overflow-hidden mb-1.5"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${masteryPct}%`, background: visibleSection.color }}
          />
        </div>
        <p className="text-xs font-semibold" style={{ color: visibleSection.color }}>
          {masteryPct}% mastered
        </p>
      </div>

      {/* Card 2 — Daily Missions */}
      <div
        className="rounded-2xl p-4"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-xs font-semibold text-slate-300 mb-3">Daily Missions</p>
        {displayMissions.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-2">No missions today</p>
        ) : (
          <div>
            {displayMissions.map((m, idx) => {
              const progress = Math.min(m.progress, m.target)
              const pct = m.target > 0 ? progress / m.target : 0
              const offset = CIRCUMFERENCE * (1 - pct)
              const isLast = idx === displayMissions.length - 1
              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 py-2.5${!isLast ? ' border-b border-white/5' : ''}`}
                >
                  <svg width="40" height="40" viewBox="0 0 44 44" className="flex-shrink-0">
                    <circle cx="22" cy="22" r="18" fill="none"
                      stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                    <circle cx="22" cy="22" r="18" fill="none"
                      stroke="white" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
                      transform="rotate(-90 22 22)"
                      style={{ transition: 'stroke-dashoffset 400ms ease' }} />
                    <text x="22" y="22" dominantBaseline="middle" textAnchor="middle"
                      fill="white" fontSize="9" fontWeight="bold">
                      {progress}
                    </text>
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium leading-snug">{m.description}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{m.progress} / {m.target}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Card 3 — Due for Review (conditional) */}
      {dueCount > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-300">Due for Review</p>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
              {dueCount}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            {dueCount} question{dueCount !== 1 ? 's' : ''} ready to review
          </p>
          <button
            onClick={onReviewTap}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-black"
            style={{ background: '#F59E0B' }}
          >
            Review Now
          </button>
        </div>
      )}

      {/* Card 4 — Anonymous CTA (conditional) */}
      {isAnonymous && (
        <div
          className="rounded-2xl p-4"
          style={{ background: '#1C1F2E', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-white font-bold text-xs mb-3">
            Create a profile to save your progress!
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/auth?upgrade=true')}
              className="flex-1 py-2 rounded-xl text-white text-xs font-bold"
              style={{ background: '#22C55E' }}
            >
              Create a Profile
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="flex-1 py-2 rounded-xl text-white text-xs font-bold"
              style={{ background: '#38BDF8' }}
            >
              Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
