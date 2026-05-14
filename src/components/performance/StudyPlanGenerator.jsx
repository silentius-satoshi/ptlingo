import { useState, useEffect } from 'react'
import { generatePlan, getWeeksRemaining, getDaysRemaining } from '../../lib/studyPlanAI'
import { savePlan } from '../../lib/studyPlanStorage'
import { fetchAttempts } from '../../lib/npteAttempts'
import { useAuthStore } from '../../store/authStore'

const DAYS_OPTIONS = [3, 4, 5, 6, 7]

const DPT_SYSTEMS = ['MSK', 'Neuro', 'Cardio', 'Integumentary', 'Pediatrics', 'Other Systems']
const PREPT_PREREQS = ['Anatomy', 'Physiology', 'Biology', 'Chemistry', 'Statistics', 'Psychology', 'None yet']
const PREPT_SPECIALTIES = ['Sports', 'Pediatrics', 'Neuro', 'Ortho', 'Geriatrics']
const HS_INTERESTS = [
  'Helping athletes recover',
  'Working with kids',
  'Neuro rehab',
  'Orthopedics',
  'General health',
  'Not sure yet',
]

function defaultConfig(userType, activePlan) {
  if (userType === 'dpt') return {
    programYear:    activePlan?.config?.programYear    ?? '',
    semester:       activePlan?.config?.semester       ?? 'Fall',
    milestone:      activePlan?.config?.milestone      ?? 'None',
    milestoneWeeks: activePlan?.config?.milestoneWeeks ?? '',
    currentSystems: activePlan?.config?.currentSystems ?? [],
    dailyHours:     activePlan?.config?.dailyHours     ?? 2,
  }
  if (userType === 'prept') return {
    undergradYear:      activePlan?.config?.undergradYear      ?? '',
    graduationDate:     activePlan?.config?.graduationDate     ?? '',
    applicationCycle:   activePlan?.config?.applicationCycle   ?? 'Next fall',
    completedPrereqs:   activePlan?.config?.completedPrereqs   ?? [],
    obsHoursCompleted:  activePlan?.config?.obsHoursCompleted  ?? 0,
    obsHoursTarget:     activePlan?.config?.obsHoursTarget     ?? 80,
    specialtyInterests: activePlan?.config?.specialtyInterests ?? [],
  }
  if (userType === 'highschool') return {
    grade:             activePlan?.config?.grade             ?? '',
    ptInterests:       activePlan?.config?.ptInterests       ?? [],
    state:             activePlan?.config?.state             ?? '',
    relatedActivities: activePlan?.config?.relatedActivities ?? '',
  }
  return {
    examDate:         activePlan?.config?.examDate         ?? '',
    dailyHours:       activePlan?.config?.dailyHours       ?? 3,
    studyDaysPerWeek: activePlan?.config?.studyDaysPerWeek ?? 5,
    workingFullTime:  activePlan?.config?.workingFullTime  ?? false,
    jurisdiction:     activePlan?.config?.jurisdiction     ?? '',
    userNotes:        activePlan?.config?.userNotes        ?? '',
  }
}

const LABEL_CLASS = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5'
const INPUT_CLASS = 'w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500'

function MultiCheckbox({ options, value, onChange }) {
  const toggle = (opt) => {
    const next = value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]
    onChange(next)
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            value.includes(opt)
              ? 'bg-teal-600 border-teal-600 text-white'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-400 dark:hover:border-teal-500'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export default function StudyPlanGenerator({ userId, practiceAccuracy, activePlan, onPlanGenerated }) {
  const { profile } = useAuthStore()
  const userType = profile?.user_type ?? 'npte'

  const [config, setConfig] = useState(() => defaultConfig(userType, activePlan))
  const [attempts, setAttempts] = useState([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (userType === 'npte') fetchAttempts(userId).then(setAttempts).catch(() => {})
  }, [userId, userType])

  const set = (key, val) => setConfig((c) => ({ ...c, [key]: val }))

  const weeksRemaining = config.examDate ? getWeeksRemaining(config.examDate) : null
  const daysRemaining  = config.examDate ? getDaysRemaining(config.examDate) : null

  const canGenerate = userType === 'npte'       ? !!config.examDate
                    : userType === 'dpt'        ? !!config.programYear
                    : userType === 'prept'      ? !!config.undergradYear
                    : /* highschool */            !!config.grade

  const handleGenerate = async () => {
    if (!canGenerate) { setError('Please fill in the required fields.'); return }
    setError(null)
    setGenerating(true)
    try {
      const plan = await generatePlan(userType, config, {
        attempts,
        practiceAccuracy,
        previousPlan: activePlan?.plan ?? null,
      })
      const saved = await savePlan(userId, {
        config,
        plan,
        plan_type:      userType,
        examDate:       config.examDate ?? null,
        weeksRemaining: plan.weeksRemaining ?? null,
      })
      onPlanGenerated(saved)
    } catch (e) {
      setError(e.message || 'Generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const subtitle = userType === 'dpt'        ? 'Week-by-week schedule aligned with your DPT curriculum'
                 : userType === 'prept'      ? 'Monthly milestone roadmap for your DPT application journey'
                 : userType === 'highschool' ? 'Personalized PT career exploration roadmap'
                 : `AI-powered week-by-week plan built from your NPTE history and practice data${attempts.length > 0 ? ` · ${attempts.length} attempt${attempts.length !== 1 ? 's' : ''} found` : ''}`

  const buttonLabel = userType === 'highschool'
    ? (activePlan ? 'Regenerate Roadmap' : 'Generate My PT Roadmap')
    : (activePlan ? 'Regenerate Plan' : 'Generate Study Plan')

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="mb-5">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {activePlan ? 'Regenerate Study Plan' : 'Generate Study Plan'}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      {/* ── NPTE form ── */}
      {userType === 'npte' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={LABEL_CLASS}>NPTE Exam Date</label>
              <input
                type="date"
                value={config.examDate}
                onChange={(e) => set('examDate', e.target.value)}
                className={INPUT_CLASS}
              />
              {weeksRemaining !== null && (
                <p className={`text-xs mt-1 ${weeksRemaining < 4 ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  {daysRemaining} days · {weeksRemaining} week{weeksRemaining !== 1 ? 's' : ''} remaining
                  {weeksRemaining < 4 ? ' — urgent' : ''}
                </p>
              )}
            </div>
            <div>
              <label className={LABEL_CLASS}>Jurisdiction (optional)</label>
              <input
                type="text"
                value={config.jurisdiction}
                onChange={(e) => set('jurisdiction', e.target.value)}
                placeholder="e.g. Texas"
                className={INPUT_CLASS + ' placeholder-slate-400'}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>
                Daily Study Hours: <span className="text-teal-600 dark:text-teal-400 font-semibold">{config.dailyHours}h</span>
              </label>
              <input
                type="range"
                min={1} max={8} step={0.5}
                value={config.dailyHours}
                onChange={(e) => set('dailyHours', parseFloat(e.target.value))}
                className="w-full accent-teal-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                <span>1h</span><span>8h</span>
              </div>
            </div>
            <div>
              <label className={LABEL_CLASS}>Study Days per Week</label>
              <div className="flex gap-1.5">
                {DAYS_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
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
          <label className="flex items-center gap-2.5 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={config.workingFullTime}
              onChange={(e) => set('workingFullTime', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-teal-600"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">I'm working full-time during this study period</span>
          </label>
          <div className="mb-5">
            <label className={LABEL_CLASS}>Priorities or notes for the AI (optional)</label>
            <textarea
              value={config.userNotes}
              onChange={(e) => set('userNotes', e.target.value)}
              rows={2}
              placeholder="e.g. I struggle with neuro but feel ok about cardio. Prefer more adaptive review days."
              className={INPUT_CLASS + ' placeholder-slate-400 resize-none'}
            />
          </div>
        </>
      )}

      {/* ── DPT form ── */}
      {userType === 'dpt' && (
        <div className="space-y-4 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>What year are you in?</label>
              <select value={config.programYear} onChange={(e) => set('programYear', e.target.value)} className={INPUT_CLASS}>
                <option value="">Select year…</option>
                <option>1st year</option>
                <option>2nd year</option>
                <option>3rd year</option>
                <option>Clinical rotations</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Current semester:</label>
              <select value={config.semester} onChange={(e) => set('semester', e.target.value)} className={INPUT_CLASS}>
                <option>Fall</option>
                <option>Spring</option>
                <option>Summer</option>
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS}>Any upcoming milestones?</label>
            <select value={config.milestone} onChange={(e) => set('milestone', e.target.value)} className={INPUT_CLASS}>
              <option>None</option>
              <option>Practical exam</option>
              <option>Starting rotation</option>
            </select>
            {config.milestone === 'Practical exam' && (
              <div className="mt-2">
                <label className={LABEL_CLASS}>Weeks away</label>
                <input
                  type="number"
                  min={1}
                  value={config.milestoneWeeks}
                  onChange={(e) => set('milestoneWeeks', e.target.value)}
                  placeholder="e.g. 3"
                  className={INPUT_CLASS + ' placeholder-slate-400'}
                />
              </div>
            )}
          </div>
          <div>
            <label className={LABEL_CLASS}>What systems are you currently studying?</label>
            <MultiCheckbox
              options={DPT_SYSTEMS}
              value={config.currentSystems}
              onChange={(v) => set('currentSystems', v)}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Daily study time (hours)</label>
            <input
              type="number"
              min={0.5}
              max={8}
              step={0.5}
              value={config.dailyHours}
              onChange={(e) => set('dailyHours', parseFloat(e.target.value) || 1)}
              className={INPUT_CLASS}
            />
          </div>
        </div>
      )}

      {/* ── Pre-PT form ── */}
      {userType === 'prept' && (
        <div className="space-y-4 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>What year are you in?</label>
              <select value={config.undergradYear} onChange={(e) => set('undergradYear', e.target.value)} className={INPUT_CLASS}>
                <option value="">Select year…</option>
                <option>Freshman</option>
                <option>Sophomore</option>
                <option>Junior</option>
                <option>Senior</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Expected graduation:</label>
              <input
                type="date"
                value={config.graduationDate}
                onChange={(e) => set('graduationDate', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS}>When do you plan to apply to DPT programs?</label>
            <select value={config.applicationCycle} onChange={(e) => set('applicationCycle', e.target.value)} className={INPUT_CLASS}>
              <option>Next fall</option>
              <option>In 2 years</option>
              <option>Still deciding</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Completed prerequisites:</label>
            <MultiCheckbox
              options={PREPT_PREREQS}
              value={config.completedPrereqs}
              onChange={(v) => set('completedPrereqs', v)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>Observation hours completed:</label>
              <input
                type="number"
                min={0}
                value={config.obsHoursCompleted}
                onChange={(e) => set('obsHoursCompleted', parseInt(e.target.value) || 0)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Target observation hours:</label>
              <input
                type="number"
                min={0}
                value={config.obsHoursTarget}
                onChange={(e) => set('obsHoursTarget', parseInt(e.target.value) || 80)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS}>PT specialty interests:</label>
            <MultiCheckbox
              options={PREPT_SPECIALTIES}
              value={config.specialtyInterests}
              onChange={(v) => set('specialtyInterests', v)}
            />
          </div>
        </div>
      )}

      {/* ── High school form ── */}
      {userType === 'highschool' && (
        <div className="space-y-4 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>What grade are you in?</label>
              <select value={config.grade} onChange={(e) => set('grade', e.target.value)} className={INPUT_CLASS}>
                <option value="">Select grade…</option>
                <option>9th</option>
                <option>10th</option>
                <option>11th</option>
                <option>12th</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>What state are you in?</label>
              <input
                type="text"
                value={config.state}
                onChange={(e) => set('state', e.target.value)}
                placeholder="e.g. Texas"
                className={INPUT_CLASS + ' placeholder-slate-400'}
              />
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS}>What draws you to physical therapy?</label>
            <MultiCheckbox
              options={HS_INTERESTS}
              value={config.ptInterests}
              onChange={(v) => set('ptInterests', v)}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Any related activities? (optional)</label>
            <input
              type="text"
              value={config.relatedActivities}
              onChange={(e) => set('relatedActivities', e.target.value)}
              placeholder="e.g. volunteered at a clinic, play sports, EMT training"
              className={INPUT_CLASS + ' placeholder-slate-400'}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-3">{error}</p>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating || !canGenerate}
        className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
      >
        {generating ? (
          <>
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Generating…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09 3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            {buttonLabel}
          </>
        )}
      </button>
    </div>
  )
}
