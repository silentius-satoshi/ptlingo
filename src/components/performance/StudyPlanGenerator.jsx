import { useState, useEffect } from 'react'
import { generateStudyPlan, getWeeksRemaining, getDaysRemaining } from '../../lib/studyPlanAI'
import { savePlan } from '../../lib/studyPlanStorage'
import { fetchAttempts } from '../../lib/npteAttempts'

const DAYS_OPTIONS = [3, 4, 5, 6, 7]

export default function StudyPlanGenerator({ userId, practiceAccuracy, activePlan, onPlanGenerated }) {
  const [config, setConfig] = useState({
    examDate:        activePlan?.config?.examDate        ?? '',
    dailyHours:      activePlan?.config?.dailyHours      ?? 3,
    studyDaysPerWeek: activePlan?.config?.studyDaysPerWeek ?? 5,
    workingFullTime: activePlan?.config?.workingFullTime ?? false,
    jurisdiction:    activePlan?.config?.jurisdiction    ?? '',
    userNotes:       activePlan?.config?.userNotes       ?? '',
  })
  const [attempts, setAttempts] = useState([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAttempts(userId).then(setAttempts).catch(() => {})
  }, [userId])

  const weeksRemaining = config.examDate ? getWeeksRemaining(config.examDate) : null
  const daysRemaining  = config.examDate ? getDaysRemaining(config.examDate) : null

  const set = (key, val) => setConfig((c) => ({ ...c, [key]: val }))

  const handleGenerate = async () => {
    if (!config.examDate) { setError('Please enter your exam date.'); return }
    if (weeksRemaining !== null && weeksRemaining <= 0) { setError('Exam date must be in the future.'); return }
    setError(null)
    setGenerating(true)
    try {
      const plan = await generateStudyPlan({
        attempts,
        practiceAccuracy,
        config,
        previousPlan: activePlan?.plan ?? null,
      })
      const saved = await savePlan(userId, {
        examDate:       config.examDate,
        weeksRemaining: plan.weeksRemaining,
        config,
        plan,
      })
      onPlanGenerated(saved)
    } catch (e) {
      setError(e.message || 'Generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="mb-5">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {activePlan ? 'Regenerate Study Plan' : 'Generate Study Plan'}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          AI-powered week-by-week plan built from your NPTE history and practice data
          {attempts.length > 0 && ` · ${attempts.length} attempt${attempts.length !== 1 ? 's' : ''} found`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Exam Date */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            NPTE Exam Date
          </label>
          <input
            type="date"
            value={config.examDate}
            onChange={(e) => set('examDate', e.target.value)}
            className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {weeksRemaining !== null && (
            <p className={`text-xs mt-1 ${weeksRemaining < 4 ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {daysRemaining} days · {weeksRemaining} week{weeksRemaining !== 1 ? 's' : ''} remaining
              {weeksRemaining < 4 ? ' — urgent' : ''}
            </p>
          )}
        </div>

        {/* Jurisdiction */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            Jurisdiction (optional)
          </label>
          <input
            type="text"
            value={config.jurisdiction}
            onChange={(e) => set('jurisdiction', e.target.value)}
            placeholder="e.g. Texas"
            className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-slate-400"
          />
        </div>

        {/* Daily Hours */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            Daily Study Hours: <span className="text-teal-600 dark:text-teal-400 font-semibold">{config.dailyHours}h</span>
          </label>
          <input
            type="range"
            min={1}
            max={8}
            step={0.5}
            value={config.dailyHours}
            onChange={(e) => set('dailyHours', parseFloat(e.target.value))}
            className="w-full accent-teal-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            <span>1h</span><span>8h</span>
          </div>
        </div>

        {/* Study Days Per Week */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            Study Days per Week
          </label>
          <div className="flex gap-1.5">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => set('studyDaysPerWeek', d)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  config.studyDaysPerWeek === d
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-400 dark:hover:border-teal-500'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Working full-time */}
      <label className="flex items-center gap-2.5 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={config.workingFullTime}
          onChange={(e) => set('workingFullTime', e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 accent-teal-600"
        />
        <span className="text-sm text-slate-700 dark:text-slate-300">I'm working full-time during this study period</span>
      </label>

      {/* User Notes */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
          Priorities or notes for the AI (optional)
        </label>
        <textarea
          value={config.userNotes}
          onChange={(e) => set('userNotes', e.target.value)}
          rows={2}
          placeholder="e.g. I struggle with neuro but feel ok about cardio. Prefer more adaptive review days."
          className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-slate-400 resize-none"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-3">{error}</p>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating || !config.examDate}
        className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
      >
        {generating ? (
          <>
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Generating plan…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            {activePlan ? 'Regenerate Plan' : 'Generate Study Plan'}
          </>
        )}
      </button>
    </div>
  )
}
