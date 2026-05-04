import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Badge from '../components/shared/Badge'
import Button from '../components/shared/Button'
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, Cell,
} from 'recharts'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDateShort(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDateFull(ts) {
  if (!ts) return { date: '—', time: '' }
  const d = new Date(ts)
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  }
}

function fmtDurationHM(seconds) {
  if (!seconds) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function getAllottedSeconds(session) {
  if (session.type === 'exam') return 5 * 3600 * (session.time_multiplier || 1)
  if (session.mode === 'practice') return 9 * 3600
  return (session.question_ids?.length || 0) * 90
}

function getTimeUsed(session) {
  return Math.max(0, getAllottedSeconds(session) - (session.time_remaining ?? 0))
}

function scoreColor(pct) {
  if (pct >= 75) return 'text-green-600 dark:text-green-400'
  if (pct >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

const DIST_BUCKETS = [
  { label: '0–49',   min: 0,  max: 49,  passing: false },
  { label: '50–59',  min: 50, max: 59,  passing: false },
  { label: '60–69',  min: 60, max: 69,  passing: false },
  { label: '70–74',  min: 70, max: 74,  passing: false },
  { label: '75–84',  min: 75, max: 84,  passing: true  },
  { label: '85–100', min: 85, max: 100, passing: true  },
]

// ── Skeleton components ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="h-3 w-24 rounded bg-slate-100 dark:bg-slate-800 animate-pulse mb-4" />
      <div className="h-8 w-20 rounded bg-slate-100 dark:bg-slate-800 animate-pulse mb-2" />
      <div className="h-3 w-32 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
    </div>
  )
}

function SkeletonChart({ height = 300 }) {
  return (
    <div
      className="rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"
      style={{ height }}
    />
  )
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, valueClass }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
        {label}
      </p>
      <p className={`text-3xl font-bold leading-none mb-1.5 ${valueClass || 'text-slate-900 dark:text-white'}`}>
        {value}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500">{sub}</p>
    </div>
  )
}

// ── Chart card wrapper ─────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 mb-4">{subtitle}</p>
      {children}
    </div>
  )
}

function ChartPlaceholder({ message }) {
  return (
    <div className="flex items-center justify-center h-[220px]">
      <p className="text-sm text-slate-400 dark:text-slate-500 italic">{message}</p>
    </div>
  )
}

// ── Custom Tooltips ────────────────────────────────────────────────────────────

function LineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-slate-700 dark:text-slate-200">{label}</p>
      <p className="text-teal-600 dark:text-teal-400 font-semibold mt-0.5">{payload[0].value}%</p>
    </div>
  )
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const count = payload[0].value
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-slate-700 dark:text-slate-200">{label}</p>
      <p className="text-slate-600 dark:text-slate-300 mt-0.5">{count} session{count !== 1 ? 's' : ''}</p>
    </div>
  )
}

// ── Recent sessions table ──────────────────────────────────────────────────────

function TypeBadge({ type, examNumber }) {
  if (type === 'exam') return <Badge color="purple">Exam {examNumber ? `#${examNumber}` : ''}</Badge>
  return <Badge color="teal">Quiz</Badge>
}

function RecentTable({ sessions, navigate }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          {['Date', 'Type', 'Score', 'Questions', 'Time Spent'].map((h) => (
            <th
              key={h}
              className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sessions.map((s, i) => {
          const { date } = fmtDateFull(s.started_at)
          const pct = s.score != null ? Math.round(s.score * 100) : null
          const answered = Object.keys(s.answers || {}).length
          const total = s.question_ids?.length ?? 0
          const used = getTimeUsed(s)
          return (
            <tr
              key={s.id}
              onClick={() => navigate(`/results/${s.id}`)}
              className={`cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors ${
                i % 2 === 1
                  ? 'bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100/70 dark:hover:bg-slate-700/30'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
              }`}
            >
              <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">
                {date}
              </td>
              <td className="px-4 py-3.5">
                <TypeBadge type={s.type} examNumber={s.exam_number} />
              </td>
              <td className="px-4 py-3.5">
                {pct != null
                  ? <span className={`font-bold tabular-nums ${scoreColor(pct)}`}>{pct}%</span>
                  : <span className="text-slate-300 dark:text-slate-600 font-semibold">—</span>
                }
              </td>
              <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 tabular-nums">
                {answered}/{total}
              </td>
              <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 tabular-nums">
                {fmtDurationHM(used)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [sessions, setSessions] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  const displayName = user?.email?.split('@')[0] ?? 'there'

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id, type, mode, exam_number, question_ids, answers, score, time_remaining, time_multiplier, status, started_at, submitted_at')
        .eq('user_id', user.id)
        .order('started_at', { ascending: true })

      const allSessions = sessionData || []
      setSessions(allSessions)

      const submitted = allSessions.filter((s) => s.status === 'submitted')
      const allQIds = [...new Set(submitted.flatMap((s) => s.question_ids || []))]

      if (allQIds.length > 0) {
        const { data: qData } = await supabase
          .from('questions')
          .select('id, subject')
          .in('id', allQIds)
        setQuestions(qData || [])
      }

      setLoading(false)
    }
    load()
  }, [user.id])

  // ── Derived data ──────────────────────────────────────────────────────────────

  const submitted = useMemo(
    () => sessions.filter((s) => s.status === 'submitted'),
    [sessions],
  )

  const activeCount = useMemo(
    () => sessions.filter((s) => s.status === 'in_progress' || s.status === 'paused').length,
    [sessions],
  )

  const scoredSessions = useMemo(
    () => submitted.filter((s) => s.score != null),
    [submitted],
  )

  const avgScore = useMemo(() => {
    if (!scoredSessions.length) return null
    return Math.round(scoredSessions.reduce((sum, s) => sum + s.score, 0) / scoredSessions.length * 100)
  }, [scoredSessions])

  const totalAnswered = useMemo(
    () => submitted.reduce((sum, s) => sum + Object.keys(s.answers || {}).length, 0),
    [submitted],
  )

  const totalTimeStudied = useMemo(
    () => submitted.reduce((sum, s) => sum + getTimeUsed(s), 0),
    [submitted],
  )

  const scoreHistory = useMemo(
    () =>
      scoredSessions.map((s) => ({
        date: fmtDateShort(s.started_at),
        score: Math.round(s.score * 100),
      })),
    [scoredSessions],
  )

  const subjectData = useMemo(() => {
    if (!questions.length) return []
    const qMap = Object.fromEntries(questions.map((q) => [q.id, q.subject]))
    const bySubject = {}

    submitted.forEach((s) => {
      ;(s.question_ids || []).forEach((qId) => {
        const subj = qMap[qId]
        if (!subj) return
        bySubject[subj] = (bySubject[subj] || 0) + 1
      })
    })

    return Object.entries(bySubject)
      .map(([subject, count]) => ({
        subject: subject.length > 14 ? subject.slice(0, 13) + '…' : subject,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
  }, [submitted, questions])

  const distData = useMemo(
    () =>
      DIST_BUCKETS.map((b) => ({
        label: b.label,
        count: scoredSessions.filter((s) => {
          const pct = Math.round(s.score * 100)
          return pct >= b.min && pct <= b.max
        }).length,
        passing: b.passing,
      })),
    [scoredSessions],
  )

  const recentSessions = useMemo(
    () => [...submitted].sort((a, b) => new Date(b.started_at) - new Date(a.started_at)).slice(0, 5),
    [submitted],
  )

  // ── Render ────────────────────────────────────────────────────────────────────

  const axisStyle = { fontSize: 11, fill: '#94a3b8' }

  return (
    <div className="px-6 py-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, {displayName}
          </p>
        </div>

        {/* Empty state — no submitted sessions */}
        {!loading && submitted.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 flex flex-col items-center gap-4 text-center">
            <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <div>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No data yet</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                Complete a session to see your stats.
              </p>
            </div>
            <Button onClick={() => navigate('/question-bank')}>Go to Question Bank</Button>
          </div>
        )}

        {/* Section 1 — Stat cards */}
        {(loading || submitted.length > 0) && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              <>
                <StatCard
                  label="Total Sessions"
                  value={submitted.length}
                  sub={activeCount > 0 ? `${activeCount} in progress` : 'submitted sessions'}
                />
                <StatCard
                  label="Average Score"
                  value={avgScore != null ? `${avgScore}%` : '—'}
                  sub={`across ${scoredSessions.length} sessions`}
                  valueClass={avgScore != null ? scoreColor(avgScore) : 'text-slate-300 dark:text-slate-600'}
                />
                <StatCard
                  label="Questions Answered"
                  value={totalAnswered.toLocaleString()}
                  sub={`from ${submitted.length} sessions`}
                />
                <StatCard
                  label="Total Time Studied"
                  value={fmtDurationHM(totalTimeStudied)}
                  sub="cumulative study time"
                />
              </>
            )}
          </div>
        )}

        {/* Section 2 — Score history line chart */}
        {(loading || submitted.length > 0) && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Score History</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Your score % across submitted sessions</p>
              </div>
              <div className="flex items-center gap-4 text-xs shrink-0 ml-4">
                <span className="flex items-center gap-1.5">
                  <svg width="16" height="2"><line x1="0" y1="1" x2="16" y2="1" stroke="#14b8a6" strokeWidth="2" /></svg>
                  <span className="text-slate-400 dark:text-slate-500">My Score</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <svg width="16" height="2"><line x1="0" y1="1" x2="16" y2="1" stroke="#14b8a6" strokeWidth="2" strokeDasharray="4 3" /></svg>
                  <span className="text-slate-400 dark:text-slate-500">Pass (75%)</span>
                </span>
              </div>
            </div>
            {loading ? (
              <SkeletonChart />
            ) : scoreHistory.length < 2 ? (
              <ChartPlaceholder message="Not enough data yet — complete 2+ sessions to see your trend." />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={scoreHistory} margin={{ top: 8, right: 24, bottom: 0, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="date" tick={axisStyle} />
                  <YAxis domain={[0, 100]} tick={axisStyle} />
                  <Tooltip content={<LineTooltip />} />
                  <ReferenceLine
                    y={75}
                    stroke="#14b8a6"
                    strokeDasharray="6 4"
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#14b8a6', strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Section 3 — Radar + Distribution */}
        {(loading || submitted.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <ChartCard
              title="Subject Breakdown"
              subtitle="Questions attempted per subject"
            >
              {loading ? (
                <SkeletonChart />
              ) : subjectData.length < 3 ? (
                <ChartPlaceholder message="Attempt questions from 3+ subjects to see breakdown." />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={subjectData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                    <PolarGrid stroke="#334155" opacity={0.4} />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Radar
                      dataKey="value"
                      stroke="#14b8a6"
                      fill="#14b8a6"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              title="Score Distribution"
              subtitle="How your sessions are spread"
            >
              {loading ? (
                <SkeletonChart />
              ) : scoredSessions.length === 0 ? (
                <ChartPlaceholder message="No scored sessions yet." />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={distData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="label" tick={axisStyle} />
                    <YAxis allowDecimals={false} tick={axisStyle} />
                    <Tooltip content={<BarTooltip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {distData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.passing ? '#14b8a6' : '#64748b'}
                          opacity={entry.passing ? 1 : 0.6}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        )}

        {/* Section 4 — Recent sessions */}
        {(loading || submitted.length > 0) && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Sessions</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Last 5 submitted sessions</p>
              </div>
              <button
                onClick={() => navigate('/submissions')}
                className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
              >
                View all →
              </button>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : recentSessions.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                No submitted sessions yet.
              </div>
            ) : (
              <>
                <RecentTable sessions={recentSessions} navigate={navigate} />
                <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => navigate('/submissions')}
                    className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                  >
                    View all submissions →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
