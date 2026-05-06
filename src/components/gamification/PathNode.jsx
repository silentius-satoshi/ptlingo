import { useNavigate } from 'react-router-dom'
import { masteryColor, MASTERY_STROKE } from '../../lib/xpFormulas'

const SIZE = 64
const R    = (SIZE - 8) / 2
const CIRC = 2 * Math.PI * R

export default function PathNode({ subject, masteryPct = 0, isFocus = false, isLocked = false, onClick }) {
  const color  = isLocked ? 'slate' : masteryColor(masteryPct)
  const stroke = isLocked ? '#94a3b8' : MASTERY_STROKE[color]
  const filled = CIRC * (masteryPct / 100)
  const abbr   = subject.split(/[\s/]/)[0].slice(0, 3).toUpperCase()

  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={`flex items-center gap-4 w-full px-4 py-3 rounded-2xl transition-colors text-left ${
        isLocked
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      } ${isFocus ? 'ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-slate-950' : ''}`}
    >
      {/* Ring */}
      <div className="relative flex-shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="rotate-[-90deg]">
          <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="currentColor"
            strokeWidth={5} className="text-slate-100 dark:text-slate-800" />
          <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
            stroke={stroke} strokeWidth={5}
            strokeDasharray={`${filled} ${CIRC - filled}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isLocked ? (
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ) : (
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{abbr}</span>
          )}
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{subject}</p>
          {isFocus && (
            <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              Focus
            </span>
          )}
        </div>
        {isLocked ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">Reach 60%+ in all subjects to unlock</p>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${masteryPct}%`, backgroundColor: stroke }}
                />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">{masteryPct}%</span>
            </div>
            {masteryPct < 100 && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {Math.ceil((100 - masteryPct) / 10) * 10 - (100 - masteryPct)} questions to next 10%
              </p>
            )}
          </>
        )}
      </div>
    </button>
  )
}

// Hexagon Mock Exam node
export function HexNode({ label, locked, badge, onClick }) {
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
