import { useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from 'recharts'
import { useUiStore } from '../../store/uiStore'

const SYSTEMS = [
  { key: 'cardiopulmonary', label: 'Cardio/Pulmonary',  color: '#14b8a6' },
  { key: 'musculoskeletal', label: 'Musculoskeletal',   color: '#8b5cf6' },
  { key: 'neuromuscular',   label: 'Neuromuscular',     color: '#f59e0b' },
  { key: 'integumentary',   label: 'Integumentary',     color: '#ef4444' },
  { key: 'other',           label: 'Other Systems',     color: '#64748b' },
]

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="mt-0.5">{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

const formatAttemptLabel = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function BodySystemTrendsChart({ attempts }) {
  const { darkMode } = useUiStore()
  const [hidden, setHidden] = useState(new Set())
  const axisStyle  = { fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }
  const gridStroke = darkMode ? '#334155' : '#e2e8f0'

  const data = attempts.map((a) => {
    const row = {
      label: `Att${a.attempt_number} ${formatAttemptLabel(a.exam_date)}`,
    }
    SYSTEMS.forEach(({ key }) => {
      const b = a.body?.find((x) => x.system === key)
      row[key] = b?.scale_score ?? null
    })
    return row
  })

  const toggle = (key) => setHidden((prev) => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 24, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.4} />
          <XAxis dataKey="label" tick={axisStyle} />
          <YAxis domain={[400, 750]} tick={axisStyle} />
          <Tooltip content={<TooltipContent />} />
          <ReferenceLine y={600} stroke="#ef4444" strokeDasharray="6 4" />
          {SYSTEMS.map(({ key, label, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stroke={color}
              strokeWidth={hidden.has(key) ? 0 : 2}
              strokeOpacity={hidden.has(key) ? 0 : 1}
              dot={hidden.has(key) ? false : { r: 4, fill: color, strokeWidth: 0 }}
              activeDot={hidden.has(key) ? false : { r: 6, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {/* Custom legend (clickable) */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-2">
        {SYSTEMS.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`flex items-center gap-1.5 text-xs transition-opacity ${hidden.has(key) ? 'opacity-35' : 'opacity-100'}`}
          >
            <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: color }} />
            <span className="text-slate-600 dark:text-slate-300">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
