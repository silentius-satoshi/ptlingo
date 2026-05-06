export default function RetakeStats({ latestAttempt }) {
  if (!latestAttempt) return null
  const { retake_pass_rate, retake_median_score, attempt_number, scale_score } = latestAttempt
  if (!retake_pass_rate && !retake_median_score) return null

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
        FSBPT Retake Statistics (Attempt {attempt_number})
      </p>
      <div className="flex flex-wrap gap-6">
        {retake_pass_rate != null && (
          <div>
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{retake_pass_rate}%</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Candidates with a similar score ({scale_score}) who passed their next attempt
            </p>
          </div>
        )}
        {retake_median_score != null && (
          <div>
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{retake_median_score}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Median scale score on next attempt for candidates with similar scores
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
