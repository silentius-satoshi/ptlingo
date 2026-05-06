import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { useUiStore } from '../../store/uiStore'

function TooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1">{d.label}</p>
      <p className="text-teal-400">Scale score: {d.score}</p>
      <p className={d.passed ? 'text-green-400' : 'text-red-400'}>{d.passed ? 'PASS' : 'FAIL'}</p>
    </div>
  )
}

const formatAttemptLabel = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function ScoreTrajectoryChart({ attempts }) {
  const { darkMode } = useUiStore()
  const axisStyle  = { fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }
  const gridStroke = darkMode ? '#334155' : '#e2e8f0'

  const data = attempts.map((a) => ({
    label:  `Att${a.attempt_number} ${formatAttemptLabel(a.exam_date)}`,
    score:  a.scale_score,
    passed: a.passed,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 24, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.4} />
        <XAxis dataKey="label" tick={axisStyle} />
        <YAxis domain={[400, 750]} tick={axisStyle} />
        <Tooltip content={<TooltipContent />} />
        <ReferenceLine y={600} stroke="#ef4444" strokeDasharray="6 4" label={{ value: 'Pass 600', fill: '#ef4444', fontSize: 10 }} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#14b8a6"
          strokeWidth={2.5}
          dot={{ r: 5, fill: '#14b8a6', strokeWidth: 0 }}
          activeDot={{ r: 7, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
