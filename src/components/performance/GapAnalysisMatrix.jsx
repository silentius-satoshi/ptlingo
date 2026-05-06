import { computeGapMatrix } from '../../lib/insightEngine'

const PRIORITY_STYLES = {
  Critical: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  Focus:    'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  Near:     'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  Passing:  'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
}

const TREND_ICON = {
  up:   { icon: '↑', color: 'text-green-600 dark:text-green-400' },
  down: { icon: '↓', color: 'text-red-600 dark:text-red-400' },
  flat: { icon: '→', color: 'text-slate-400 dark:text-slate-500' },
}

function ScoreCell({ score }) {
  const c = score >= 600 ? 'text-green-600 dark:text-green-400'
    : score >= 560 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'
  return <span className={`font-semibold tabular-nums ${c}`}>{score}</span>
}

export default function GapAnalysisMatrix({ attempts }) {
  const rows = computeGapMatrix(attempts)
  if (!rows.length) return null

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          {['Body System', 'Scale Score', 'Gap from 600', 'Trend', 'Priority'].map((h) => (
            <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0)).map((r) => {
          const { icon, color } = TREND_ICON[r.trend] || TREND_ICON.flat
          return (
            <tr key={r.system} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{r.label}</td>
              <td className="px-4 py-3"><ScoreCell score={r.score} /></td>
              <td className={`px-4 py-3 tabular-nums font-medium ${r.gap >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {r.gap >= 0 ? `+${r.gap}` : r.gap}
              </td>
              <td className={`px-4 py-3 text-lg font-bold ${color}`}>{icon}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_STYLES[r.priority]}`}>
                  {r.priority}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
