import { useState } from 'react'
import { restorePlan } from '../../lib/studyPlanStorage'
import PlanRestoreConfirm from './PlanRestoreConfirm'

function fmtDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function buildSnapshot(plan) {
  if (!plan?.plan?.weeks) return null
  const checked = {}
  plan.plan.weeks.forEach((w) => {
    w.days?.forEach((_, i) => {
      const key = `plan_${plan.id}_w${w.week_number}_d${i}`
      if (localStorage.getItem(key) === '1') checked[key] = true
    })
  })
  return Object.keys(checked).length > 0 ? checked : null
}

export default function PlanHistory({ history, userId, currentPlan, onRestored }) {
  const [open, setOpen] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [restoringId, setRestoringId] = useState(null)

  if (!history?.length) return null

  const handleRestore = async (planId) => {
    setRestoringId(planId)
    try {
      const snapshot = buildSnapshot(currentPlan)
      await restorePlan(planId, userId, snapshot)
      setConfirmId(null)
      onRestored()
    } catch (e) {
      console.error('restore failed', e)
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded-2xl"
      >
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Previous Plans ({history.length})
        </p>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {history.map((h) => {
            const daysCompleted = h.completion_snapshot
              ? Object.keys(h.completion_snapshot).length
              : 0
            return (
              <div key={h.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-2">
                      {h.plan?.summary?.slice(0, 100)}{(h.plan?.summary?.length ?? 0) > 100 ? '…' : ''}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      Generated {fmtDate(h.generated_at)} · {h.weeks_remaining}w plan · Exam {fmtDate(h.exam_date)}
                    </p>
                    {daysCompleted > 0 && (
                      <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">
                        {daysCompleted} day{daysCompleted !== 1 ? 's' : ''} completed before archiving
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setConfirmId(h.id)}
                    disabled={!!restoringId}
                    className="flex-shrink-0 px-3 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    Restore
                  </button>
                </div>
                {confirmId === h.id && (
                  <PlanRestoreConfirm
                    loading={restoringId === h.id}
                    onConfirm={() => handleRestore(h.id)}
                    onCancel={() => setConfirmId(null)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
