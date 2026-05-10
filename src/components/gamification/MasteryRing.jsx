import { masteryColor, MASTERY_STROKE } from '../../lib/xpFormulas'

export default function MasteryRing({ pct = 0, size = 64, label, sublabel, accentColor }) {
  const r           = (size - 8) / 2
  const circ        = 2 * Math.PI * r
  const filled      = circ * (pct / 100)
  const color       = masteryColor(pct)
  const strokeColor = accentColor ?? MASTERY_STROKE[color]

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={5}
            className="text-slate-100 dark:text-slate-800"
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth={5}
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {pct}%
          </span>
        </div>
      </div>
      {label && (
        <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 text-center leading-tight max-w-[72px]">
          {label}
        </p>
      )}
      {sublabel && (
        <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center">
          {sublabel}
        </p>
      )}
    </div>
  )
}
