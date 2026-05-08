import { getLevelTitle, xpProgressInLevel } from '../../lib/xpFormulas'

const TITLE_COLORS = {
  slate:  'text-slate-600  dark:text-slate-300',
  blue:   'text-blue-600   dark:text-blue-400',
  teal:   'text-teal-600   dark:text-teal-400',
  purple: 'text-purple-600 dark:text-purple-400',
  amber:  'text-amber-600  dark:text-amber-400',
  coral:  'text-red-500    dark:text-red-400',
}

const BAR_COLORS = {
  slate:  'bg-slate-500',
  blue:   'bg-blue-500',
  teal:   'bg-teal-500',
  purple: 'bg-purple-500',
  amber:  'bg-amber-500',
  coral:  'bg-red-500',
}

export default function LevelBadge({ level, xp, compact = false }) {
  const titleInfo            = getLevelTitle(level)
  const { current, needed }  = xpProgressInLevel(xp, level)
  const pct                  = needed > 0 ? Math.round((current / needed) * 100) : 100
  const titleColor           = TITLE_COLORS[titleInfo.color] ?? TITLE_COLORS.slate
  const barColor             = BAR_COLORS[titleInfo.color]   ?? BAR_COLORS.slate

  if (compact) {
    return (
      <span className={`text-xs font-bold ${titleColor}`}>Lv{level}</span>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Level {level}</span>
        <span className={`text-[10px] font-semibold ${titleColor}`}>{titleInfo.title}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[9px] text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">
          {current} / {needed}
        </span>
      </div>
    </div>
  )
}
