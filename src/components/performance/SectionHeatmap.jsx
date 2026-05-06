function scoreColor(score) {
  if (!score) return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-400 dark:text-slate-500' }
  if (score >= 600) return { bg: 'bg-green-50 dark:bg-green-900/20',  text: 'text-green-700 dark:text-green-400',  border: 'border-green-100 dark:border-green-800' }
  if (score >= 560) return { bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-700 dark:text-amber-400',  border: 'border-amber-100 dark:border-amber-800' }
  return               { bg: 'bg-red-50 dark:bg-red-900/20',    text: 'text-red-700 dark:text-red-400',    border: 'border-red-100 dark:border-red-800' }
}

export default function SectionHeatmap({ attempt }) {
  if (!attempt) return null
  const sections = [...(attempt.sections || [])].sort((a, b) => a.section_number - b.section_number)

  return (
    <div>
      <div className="grid grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((n) => {
          const sec = sections.find((s) => s.section_number === n)
          const { bg, text, border = 'border-transparent' } = scoreColor(sec?.scale_score)
          const pct = sec && sec.total_items
            ? `${Math.round(sec.items_correct / sec.total_items * 100)}%`
            : '—'
          return (
            <div key={n} className={`rounded-xl border p-4 text-center ${bg} ${border}`}>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Section {n}
              </p>
              <p className={`text-2xl font-bold ${text}`}>{sec?.scale_score ?? '—'}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{pct}</p>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 text-center italic">
        Sections below 600 may indicate fatigue or content clustering
      </p>
    </div>
  )
}
