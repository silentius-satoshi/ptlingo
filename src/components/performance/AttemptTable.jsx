import { useState } from 'react'

const SYSTEM_LABELS = {
  cardiopulmonary: 'Cardio/Pulmonary',
  musculoskeletal: 'Musculoskeletal',
  neuromuscular:   'Neuromuscular',
  integumentary:   'Integumentary',
  other:           'Other',
}

const PWA_LABELS = {
  pt_exam:       'PT Exam',
  foundations:   'Foundations',
  interventions: 'Interventions',
  nonsystem:     'Nonsystem',
}

function pct(correct, total) {
  if (!total) return '—'
  return `${Math.round(correct / total * 100)}%`
}

function ScoreColor({ score }) {
  const c = score >= 600
    ? 'text-green-600 dark:text-green-400'
    : score >= 560
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'
  return <span className={`font-semibold tabular-nums ${c}`}>{score}</span>
}

function PassBadge({ passed }) {
  return passed
    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">PASS</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">FAIL</span>
}

function ExpandedRow({ attempt }) {
  const bodyOrdered = ['cardiopulmonary', 'musculoskeletal', 'neuromuscular', 'integumentary', 'other']
  const secOrdered  = [1, 2, 3, 4, 5]
  return (
    <tr>
      <td colSpan={9} className="px-0 pb-0">
        <div className="mx-4 mb-4 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
            {/* Body systems */}
            <div>
              <p className="px-4 py-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">Body Systems</p>
              {bodyOrdered.map((sys) => {
                const row = attempt.body?.find((b) => b.system === sys)
                return (
                  <div key={sys} className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-600 dark:text-slate-300">{SYSTEM_LABELS[sys]}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-400 dark:text-slate-500">{row ? pct(row.items_correct, row.total_items) : '—'}</span>
                      {row ? <ScoreColor score={row.scale_score} /> : <span className="text-slate-300">—</span>}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Sections */}
            <div>
              <p className="px-4 py-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">Sections</p>
              {secOrdered.map((n) => {
                const row = attempt.sections?.find((s) => s.section_number === n)
                return (
                  <div key={n} className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-600 dark:text-slate-300">Section {n}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-400 dark:text-slate-500">{row ? pct(row.items_correct, row.total_items) : '—'}</span>
                      {row ? <ScoreColor score={row.scale_score} /> : <span className="text-slate-300">—</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}

export default function AttemptTable({ attempts, onEdit, onDelete }) {
  const [expandedId, setExpandedId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const PWA_COLS = ['pt_exam', 'foundations', 'interventions', 'nonsystem']

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[780px]">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            {['#', 'Date', 'Scale Score', 'Result', 'PT Exam %', 'Foundations %', 'Interventions %', 'Nonsystem %', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {attempts.map((a) => {
            const isExpanded = expandedId === a.id
            return [
              <tr
                key={a.id}
                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-200 tabular-nums">{a.attempt_number}</td>
                <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {new Date(a.exam_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-4 py-3.5">
                  <ScoreColor score={a.scale_score} />
                </td>
                <td className="px-4 py-3.5"><PassBadge passed={a.passed} /></td>
                {PWA_COLS.map((k) => {
                  const row = a.pwa?.find((p) => p.activity === k)
                  return (
                    <td key={k} className="px-4 py-3.5 text-slate-600 dark:text-slate-300 tabular-nums">
                      {row ? pct(row.items_correct, row.total_items) : '—'}
                    </td>
                  )
                })}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : a.id)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button onClick={() => onEdit(a)} className="p-1 rounded text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Edit">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {deleteConfirm === a.id ? (
                      <span className="flex items-center gap-1 ml-1">
                        <button onClick={() => { onDelete(a.id); setDeleteConfirm(null) }} className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline">Confirm</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirm(a.id)} className="p-1 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Delete">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>,
              isExpanded && <ExpandedRow key={`${a.id}-exp`} attempt={a} />,
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}
