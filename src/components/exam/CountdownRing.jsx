export default function CountdownRing({
  total,
  remaining,
  color = 'teal',
  size = 192,
  strokeWidth = 10,
  children,
}) {
  const r = (size - strokeWidth) / 2
  const c = size / 2
  const circumference = 2 * Math.PI * r
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0
  const offset = circumference * (1 - pct)

  const trackClass = 'stroke-slate-200 dark:stroke-slate-700 fill-none'
  const progressClass =
    color === 'teal'  ? 'stroke-teal-600 dark:stroke-teal-500 fill-none' :
    color === 'amber' ? 'stroke-amber-500 dark:stroke-amber-400 fill-none' :
    color === 'red'   ? 'stroke-red-500 dark:stroke-red-400 fill-none' :
                        'stroke-slate-400 dark:stroke-slate-500 fill-none'

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={c}
          cy={c}
          r={r}
          strokeWidth={strokeWidth}
          className={trackClass}
        />
        {/* Progress arc — rotated so 0% starts at 12 o'clock */}
        <circle
          cx={c}
          cy={c}
          r={r}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={progressClass}
          transform={`rotate(-90 ${c} ${c})`}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>

      {/* Centered slot */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}
