import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts'
import { useUiStore } from '../../store/uiStore'
import { SUBJECT_TO_SYSTEM } from '../../lib/insightEngine'

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.fill }} className="mt-0.5">
          {p.name}: {p.value ?? '—'}%
        </p>
      ))}
    </div>
  )
}

export default function PracticeVsRealChart({ practiceAccuracy, latestAttempt }) {
  const { darkMode } = useUiStore()
  const axisStyle  = { fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }
  const gridStroke = darkMode ? '#334155' : '#e2e8f0'

  const SUBJECTS = [
    'Musculoskeletal',
    'Neuromuscular',
    'Cardiovascular and Pulmonary',
    'Integumentary',
    'Other',
  ]

  const SHORT = {
    'Musculoskeletal':              'Musc',
    'Neuromuscular':                'Neuro',
    'Cardiovascular and Pulmonary': 'Cardio',
    'Integumentary':                'Integum',
    'Other':                        'Other',
  }

  const practiceMap = Object.fromEntries((practiceAccuracy || []).map((p) => [p.subject, p.accuracy]))

  const data = SUBJECTS
    .map((subj) => {
      const sysKey = SUBJECT_TO_SYSTEM[subj]
      const bodyRow = latestAttempt?.body?.find((b) => b.system === sysKey)
      const npteScore = bodyRow
        ? Math.round(bodyRow.items_correct / bodyRow.total_items * 100)
        : null
      const practice = practiceMap[subj] != null ? Math.round(practiceMap[subj] * 100) : null
      return { subject: SHORT[subj], practice, npte: npteScore }
    })
    .filter((d) => d.practice != null || d.npte != null)

  if (!data.length) return (
    <div className="flex items-center justify-center h-[220px]">
      <p className="text-sm text-slate-400 dark:text-slate-500 italic">No data to compare yet.</p>
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.4} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={axisStyle} unit="%" />
        <YAxis type="category" dataKey="subject" tick={axisStyle} width={58} />
        <Tooltip content={<TooltipContent />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(v) => <span style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>{v}</span>}
        />
        <Bar dataKey="practice" name="In-App Practice" fill="#14b8a6" radius={[0, 4, 4, 0]} maxBarSize={14} />
        <Bar dataKey="npte"     name="NPTE Most Recent" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  )
}
