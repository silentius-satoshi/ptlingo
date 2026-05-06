export default function StreakBadge({ streak, compact = false }) {
  if (compact) {
    return (
      <span className="flex items-center gap-1 text-sm font-semibold text-orange-500">
        🔥 <span className="tabular-nums">{streak}</span>
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xl">🔥</span>
      <div>
        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-none tabular-nums">
          {streak}-day streak
        </p>
      </div>
    </div>
  )
}
