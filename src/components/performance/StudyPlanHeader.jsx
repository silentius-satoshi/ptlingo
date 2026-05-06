import { getDaysRemaining, getWeeksRemaining } from '../../lib/studyPlanAI'

export default function StudyPlanHeader({ plan, onRegenerate }) {
  const examDate  = plan?.exam_date
  const daysLeft  = examDate ? getDaysRemaining(examDate) : null
  const weeksLeft = examDate ? getWeeksRemaining(examDate) : null
  const urgent    = daysLeft !== null && daysLeft < 28

  const generatedAt = plan?.generated_at
    ? new Date(plan.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        {daysLeft !== null ? (
          <div className="flex items-center gap-3 mb-1">
            <span className={`text-3xl font-bold tabular-nums ${urgent ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
              {daysLeft}
            </span>
            <div>
              <p className={`text-sm font-semibold ${urgent ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                days until your NPTE
              </p>
              {weeksLeft !== null && (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {weeksLeft} week{weeksLeft !== 1 ? 's' : ''} remaining
                </p>
              )}
            </div>
            {urgent && (
              <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 uppercase tracking-wider">
                Urgent
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Study Plan</p>
        )}
        {generatedAt && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Plan generated {generatedAt}</p>
        )}
      </div>

      <button
        onClick={onRegenerate}
        className="self-start flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        Regenerate Plan
      </button>
    </div>
  )
}
