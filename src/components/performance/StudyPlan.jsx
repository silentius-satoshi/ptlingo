import { useState } from 'react'
import StudyPlanHeader from './StudyPlanHeader'
import { getDaysRemaining } from '../../lib/studyPlanAI'
import useGamificationStore from '../../stores/gamificationStore'
import MissionCard from '../gamification/MissionCard'

const DAY_TYPE_BADGE = {
  study:         'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400',
  adaptive:      'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
  practice_test: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  review:        'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  rest:          'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
}

// ── Week Accordion ─────────────────────────────────────────────────────────────

function WeekAccordion({ week, planId, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)

  const totalDays = week.days?.length || 0

  const [checkedDays, setCheckedDays] = useState(() => {
    const checked = {}
    week.days?.forEach((_, i) => {
      checked[i] = localStorage.getItem(`plan_${planId}_w${week.week_number}_d${i}`) === '1'
    })
    return checked
  })

  const toggleDay = (idx) => {
    const key = `plan_${planId}_w${week.week_number}_d${idx}`
    const next = !checkedDays[idx]
    if (next) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
    setCheckedDays((prev) => ({ ...prev, [idx]: next }))
  }

  const checkedCount = Object.values(checkedDays).filter(Boolean).length
  const pct = totalDays ? Math.round(checkedCount / totalDays * 100) : 0

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex-shrink-0 w-10">
            Wk {week.week_number}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{week.theme}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {week.date_range} · {week.week_total_questions?.toLocaleString()} questions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          {checkedCount > 0 && (
            <span className="text-xs font-medium text-teal-600 dark:text-teal-400 tabular-nums">
              {pct}%
            </span>
          )}
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div>
          {/* Goal + Milestone */}
          {(week.weekly_goal || week.milestone) && (
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-x-8 gap-y-2">
              {week.weekly_goal && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">Goal</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{week.weekly_goal}</p>
                </div>
              )}
              {week.milestone && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">Milestone</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{week.milestone}</p>
                </div>
              )}
            </div>
          )}

          {/* Progress bar */}
          {checkedCount > 0 && (
            <div className="px-5 py-2 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700">
              <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {/* Day rows */}
          <div className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
            {(week.days || []).map((day, i) => {
              const badgeStyle = DAY_TYPE_BADGE[day.type] ?? DAY_TYPE_BADGE.study
              const isDone = checkedDays[i]
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 py-3 px-5 transition-opacity ${isDone ? 'opacity-40' : ''}`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleDay(i)}
                    style={{ width: 18, height: 18, marginTop: 2 }}
                    className={`flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                      isDone
                        ? 'bg-teal-600 border-teal-600'
                        : 'border-slate-300 dark:border-slate-600 hover:border-teal-400'
                    }`}
                  >
                    {isDone && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{day.day}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{day.date}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${badgeStyle}`}>
                        {(day.type ?? 'study').replace('_', ' ')}
                      </span>
                      {(day.question_target > 0) && day.type !== 'rest' && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {day.question_target}Q
                          {day.interventions_questions > 0 ? ` +${day.interventions_questions} intv` : ''}
                        </span>
                      )}
                    </div>
                    {day.subject && day.type !== 'rest' && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{day.subject}</p>
                    )}
                    {day.focus_topics?.length > 0 && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                        {day.focus_topics.join(' · ')}
                      </p>
                    )}
                    {day.note && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 italic mt-0.5">{day.note}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function currentWeekIndex(weeks) {
  if (!weeks?.length) return 0
  const today = new Date()
  for (let i = 0; i < weeks.length; i++) {
    const range = weeks[i].date_range ?? ''
    const endStr = range.split('–').pop()?.trim() ?? ''
    const endDate = new Date(endStr.includes(',') ? endStr : `${endStr}, ${today.getFullYear()}`)
    if (!isNaN(endDate) && endDate >= today) return i
  }
  return weeks.length - 1
}

// ── Main Component ─────────────────────────────────────────────────────────────

function DailyMissionsStrip() {
  const { dailyMissions } = useGamificationStore()
  const missions = dailyMissions?.missions ?? []
  if (!missions.length) return null
  const completed = missions.filter((m) => m.completed).length

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Today's Missions</p>
        <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">{completed}/{missions.length} complete</span>
      </div>
      <div className="flex flex-col gap-2">
        {missions.map((m) => (
          <MissionCard key={m.id} mission={m} compact />
        ))}
      </div>
    </div>
  )
}

export default function StudyPlan({ activePlan, onRegenerate }) {
  const plan = activePlan?.plan
  if (!plan) return null

  const daysRemaining = activePlan.exam_date ? getDaysRemaining(activePlan.exam_date) : null
  const openIdx = currentWeekIndex(plan.weeks)

  return (
    <div className="flex flex-col gap-6">
      <DailyMissionsStrip />
      <StudyPlanHeader plan={activePlan} onRegenerate={onRegenerate} />

      {/* Urgency banner */}
      {daysRemaining !== null && daysRemaining < 28 && (
        <div className="flex gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <span className="text-red-500 flex-shrink-0 font-bold">!</span>
          <p className="text-sm text-red-700 dark:text-red-300">
            <span className="font-semibold">Less than 4 weeks remaining.</span> Focus exclusively on Critical and Focus-priority systems. Avoid new content — prioritize adaptive review and stamina.
          </p>
        </div>
      )}

      {/* Strategic Summary */}
      {plan.summary && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Strategic Overview</p>
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{plan.summary}</p>
          {plan.weekly_interventions_note && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">{plan.weekly_interventions_note}</p>
          )}
        </div>
      )}

      {/* Critical Focus Areas */}
      {plan.critical_focus_areas?.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500 dark:text-red-400 mb-3">Critical Focus Areas</p>
          <div className="space-y-2">
            {plan.critical_focus_areas.map((area, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-red-400 flex-shrink-0">•</span>
                <div>
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">{area.system}</span>
                  {area.reason && (
                    <span className="text-xs text-red-600 dark:text-red-400 ml-1.5">— {area.reason}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Plan */}
      {plan.weeks?.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Weekly Plan ({plan.weeks.length} week{plan.weeks.length !== 1 ? 's' : ''})
          </p>
          {plan.weeks.map((week, i) => (
            <WeekAccordion
              key={week.week_number}
              week={week}
              planId={activePlan.id}
              defaultOpen={i === openIdx}
            />
          ))}
        </div>
      )}

      {/* Practice Test Schedule */}
      {plan.practice_tests?.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            Practice Test Schedule
          </p>
          <div className="space-y-2.5">
            {plan.practice_tests.map((pt, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  Week {pt.week} · {pt.day}, {pt.date}
                </span>
                {pt.type && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">{pt.type}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Week Strategy */}
      {plan.final_week_strategy && (
        <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30 rounded-2xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2">
            Final Week Strategy
          </p>
          <p className="text-sm text-teal-800 dark:text-teal-200 leading-relaxed">{plan.final_week_strategy}</p>
        </div>
      )}

      {/* What Not To Do */}
      {plan.what_not_to_do?.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-3">
            What Not To Do
          </p>
          <div className="space-y-2">
            {plan.what_not_to_do.map((item, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="text-amber-500 flex-shrink-0 font-bold text-xs mt-0.5">✕</span>
                <p className="text-sm text-amber-800 dark:text-amber-200">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
