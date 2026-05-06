import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { useUiStore } from '../../store/uiStore'

const PWA = [
  { key: 'pt_exam',       label: 'PT Examination', color: '#14b8a6' },
  { key: 'foundations',   label: 'Foundations',    color: '#8b5cf6' },
  { key: 'interventions', label: 'Interventions',  color: '#ef4444' },
  { key: 'nonsystem',     label: 'Nonsystem',      color: '#f59e0b' },
]

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="mt-0.5">{p.name}: {p.value}%</p>
      ))}
    </div>
  )
}

const formatAttemptLabel = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function WorkActivityChart({ attempts }) {
  const { darkMode } = useUiStore()
  const axisStyle  = { fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }
  const gridStroke = darkMode ? '#334155' : '#e2e8f0'

  const data = attempts.map((a) => {
    const row = {
      label: `Att${a.attempt_number} ${formatAttemptLabel(a.exam_date)}`,
    }
    PWA.forEach(({ key }) => {
      const p = a.pwa?.find((x) => x.activity === key)
      row[key] = p && p.total_items ? Math.round(p.items_correct / p.total_items * 100) : null
    })
    return row
  })

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 24, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.4} />
          <XAxis dataKey="label" tick={axisStyle} />
          <YAxis domain={[0, 100]} tick={axisStyle} unit="%" />
          <Tooltip content={<TooltipContent />} />
          <ReferenceLine y={67} stroke="#ef4444" strokeDasharray="6 4" label={{ value: '~67% pass benchmark', fill: '#ef4444', fontSize: 10 }} />
          {PWA.map(({ key, label, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 4, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-2">
        {PWA.map(({ key, label, color }) => (
          <span key={key} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
