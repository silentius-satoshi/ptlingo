import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import Badge from '../components/shared/Badge'
import Button from '../components/shared/Button'
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
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

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

function fmtPickerDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

const DIST_BUCKETS = [
  { label: '0–49',   min: 0,  max: 49,  passing: false },
  { label: '50–59',  min: 50, max: 59,  passing: false },
  { label: '60–69',  min: 60, max: 69,  passing: false },
  { label: '70–74',  min: 70, max: 74,  passing: false },
  { label: '75–84',  min: 75, max: 84,  passing: true  },
  { label: '85–100', min: 85, max: 100, passing: true  },
]

function buildChartData(sessions) {
  const byDate = {}
  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
  const scoredSessions = sessions.filter((s) => s.status === 'submitted' && s.score !== null && s.score !== undefined && s.score > 0)

  scoredSessions.forEach((s) => {
    const d = new Date(s.started_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!byDate[key]) byDate[key] = { quiz: [], exam: [] }
    byDate[key][s.type === 'exam' ? 'exam' : 'quiz'].push(s.score * 100)
  })

  const sortedKeys = Object.keys(byDate).sort()

  const overallData = sortedKeys.map((key) => {
    const { quiz, exam } = byDate[key]
    const all = [...quiz, ...exam]
    const [y, mo, dy] = key.split('-').map(Number)
    const display = new Date(y, mo - 1, dy).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return {
      date: display,
      avg: Math.round(mean(all) * 10) / 10,
      quizAvg: quiz.length > 0 ? Math.round(mean(quiz) * 10) / 10 : null,
      quizCount: quiz.length,
      examAvg: exam.length > 0 ? Math.round(mean(exam) * 10) / 10 : null,
      examCount: exam.length,
    }
  })

  const splitData = sortedKeys.map((key) => {
    const { quiz, exam } = byDate[key]
    const [y, mo, dy] = key.split('-').map(Number)
    const display = new Date(y, mo - 1, dy).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return {
      date: display,
      quiz: quiz.length > 0 ? Math.round(mean(quiz) * 10) / 10 : null,
      exam: exam.length > 0 ? Math.round(mean(exam) * 10) / 10 : null,
    }
  })

  return { overallData, splitData }
}

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

function OverallTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1.5">{label}</p>
      <p className="text-teal-400 font-semibold">Average: {d.avg}%</p>
      {d.quizAvg != null && (
        <p className="text-slate-400 mt-1">── Quiz avg: {d.quizAvg}% ({d.quizCount} session{d.quizCount !== 1 ? 's' : ''})</p>
      )}
      {d.examAvg != null && (
        <p className="text-slate-400 mt-0.5">── Exam avg: {d.examAvg}% ({d.examCount} session{d.examCount !== 1 ? 's' : ''})</p>
      )}
    </div>
  )
}

function SplitTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1.5">{label}</p>
      {d.quiz != null && <p className="text-teal-400">Quiz: {d.quiz}%</p>}
      {d.exam != null && <p className="text-violet-400 mt-0.5">Mock Exam: {d.exam}%</p>}
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

// ── Calendar sub-components ────────────────────────────────────────────────────

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function MonthGrid({ year, month, dateRange, pendingStart, onDayClick }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const heading = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="w-[196px]">
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center mb-2">{heading}</p>
      <div className="grid grid-cols-7">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="h-7 flex items-center justify-center text-[10px] font-medium text-slate-400 dark:text-slate-500">
            {h}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="h-7" />
          const d = new Date(year, month, day)
          d.setHours(0, 0, 0, 0)
          const isStart  = !pendingStart && dateRange.start && sameDay(d, dateRange.start)
          const isEnd    = !pendingStart && dateRange.end   && sameDay(d, dateRange.end)
          const isPending = pendingStart && sameDay(d, pendingStart)
          const inRange  = !pendingStart && dateRange.start && dateRange.end &&
                           d > dateRange.start && d < dateRange.end
          const isToday  = sameDay(d, today)
          const filled   = isStart || isEnd || isPending
          return (
            <button
              key={i}
              onClick={() => onDayClick(d)}
              className={[
                'h-7 w-7 mx-auto rounded-full flex items-center justify-center text-[11px] transition-colors',
                filled
                  ? 'bg-teal-500 text-white font-semibold'
                  : inRange
                  ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
                isToday && !filled ? 'ring-1 ring-teal-500' : '',
              ].filter(Boolean).join(' ')}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DateRangePicker({ dateRange, onChange }) {
  const today = new Date()
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [pendingStart, setPendingStart] = useState(null)

  const { year: ry, month: rm } = view
  const leftMonth = rm === 0 ? 11 : rm - 1
  const leftYear  = rm === 0 ? ry - 1 : ry

  const prev = () => setView(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
  )
  const next = () => setView(({ year, month }) =>
    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
  )

  const handleDay = (d) => {
    if (!pendingStart) {
      setPendingStart(d)
    } else if (d >= pendingStart) {
      const end = new Date(d)
      end.setHours(23, 59, 59, 999)
      onChange({ start: pendingStart, end })
      setPendingStart(null)
    } else {
      setPendingStart(d)
    }
  }

  return (
    <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4">
      <div className="flex items-start gap-6">
        <div className="flex flex-col gap-1">
          <button
            onClick={prev}
            className="self-start p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <MonthGrid year={leftYear} month={leftMonth} dateRange={dateRange} pendingStart={pendingStart} onDayClick={handleDay} />
        <MonthGrid year={ry} month={rm} dateRange={dateRange} pendingStart={pendingStart} onDayClick={handleDay} />
        <div className="flex flex-col gap-1">
          <button
            onClick={next}
            className="self-start p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      {pendingStart && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-3">Click an end date</p>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { darkMode } = useUiStore()
  const navigate = useNavigate()

  const [sessions, setSessions] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyMode, setHistoryMode] = useState('overall')
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date(); end.setHours(23, 59, 59, 999)
    const start = new Date(); start.setDate(start.getDate() - 30); start.setHours(0, 0, 0, 0)
    return { start, end }
  })
  const [calendarOpen, setCalendarOpen] = useState(false)
  const calendarRef = useRef(null)

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

  useEffect(() => {
    const handler = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) setCalendarOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Derived data ──────────────────────────────────────────────────────────────

  const submitted = useMemo(
    () => sessions.filter((s) => s.status === 'submitted'),
    [sessions],
  )

  const submittedSessions = useMemo(
    () => sessions.filter((s) => s.status === 'submitted' && s.score > 0),
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

  const effectiveSessions = submittedSessions

  const inDateRange = (s) => {
    const d = new Date(s.submitted_at || s.started_at)
    return d >= dateRange.start && d <= dateRange.end
  }

  const rangedEffective = useMemo(
    () => effectiveSessions.filter(inDateRange),
    [effectiveSessions, dateRange],
  )

  const rangedStat = useMemo(
    () => submittedSessions.filter(inDateRange),
    [submittedSessions, dateRange],
  )

  const avgScore = useMemo(() => {
    if (!rangedStat.length) return null
    return Math.round(rangedStat.reduce((sum, s) => sum + s.score, 0) / rangedStat.length * 100)
  }, [rangedStat])

  const totalAnswered = useMemo(
    () => rangedStat.reduce((sum, s) => sum + Object.keys(s.answers || {}).length, 0),
    [rangedStat],
  )

  const totalTimeStudied = useMemo(
    () => rangedStat.reduce((sum, s) => sum + getTimeUsed(s), 0),
    [rangedStat],
  )

  const chartData = useMemo(() => buildChartData(rangedEffective), [rangedEffective])

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

  const axisStyle = { fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }
  const gridStroke = darkMode ? '#334155' : '#e2e8f0'

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
                  value={rangedStat.length}
                  sub={activeCount > 0 ? `${activeCount} in progress` : 'submitted sessions'}
                />
                <StatCard
                  label="Average Score"
                  value={avgScore != null ? `${avgScore}%` : '—'}
                  sub={`across ${rangedStat.length} sessions`}
                  valueClass={avgScore != null ? scoreColor(avgScore) : 'text-slate-300 dark:text-slate-600'}
                />
                <StatCard
                  label="Questions Answered"
                  value={totalAnswered.toLocaleString()}
                  sub={`from ${rangedStat.length} sessions`}
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
            {/* Header row */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Score History</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Your score % across submitted sessions</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                {/* Top row: date picker + toggle */}
                <div className="flex items-center gap-2">
                  {/* Date range picker trigger */}
                  <div ref={calendarRef} className="relative">
                    <button
                      onClick={() => setCalendarOpen((o) => !o)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="whitespace-nowrap">{fmtPickerDate(dateRange.start)} – {fmtPickerDate(dateRange.end)}</span>
                    </button>
                    {calendarOpen && (
                      <DateRangePicker
                        dateRange={dateRange}
                        onChange={(r) => { setDateRange(r); setCalendarOpen(false) }}
                      />
                    )}
                  </div>
                  {/* Toggle pills */}
                  <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-medium">
                  {(['overall', 'split']).map((m) => (
                    <button
                      key={m}
                      onClick={() => setHistoryMode(m)}
                      className={`px-3 py-1.5 capitalize transition-colors ${
                        historyMode === m
                          ? 'bg-teal-600 text-white'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {m === 'overall' ? 'Overall' : 'Split'}
                    </button>
                  ))}
                  </div>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 text-xs">
                  {historyMode === 'overall' ? (
                    <span className="flex items-center gap-1.5">
                      <svg width="16" height="2"><line x1="0" y1="1" x2="16" y2="1" stroke="#14b8a6" strokeWidth="2" /></svg>
                      <span className="text-slate-400 dark:text-slate-500">Avg Score</span>
                    </span>
                  ) : (
                    <>
                      <span className="flex items-center gap-1.5">
                        <svg width="16" height="2"><line x1="0" y1="1" x2="16" y2="1" stroke="#14b8a6" strokeWidth="2" /></svg>
                        <span className="text-slate-400 dark:text-slate-500">Quiz</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg width="16" height="2"><line x1="0" y1="1" x2="16" y2="1" stroke="#8b5cf6" strokeWidth="2" /></svg>
                        <span className="text-slate-400 dark:text-slate-500">Mock Exam</span>
                      </span>
                    </>
                  )}
                  <span className="flex items-center gap-1.5">
                    <svg width="16" height="2"><line x1="0" y1="1" x2="16" y2="1" stroke="#14b8a6" strokeWidth="2" strokeDasharray="4 3" /></svg>
                    <span className="text-slate-400 dark:text-slate-500">Pass (75%)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Chart */}
            {loading ? (
              <SkeletonChart />
            ) : chartData.overallData.length < 1 ? (
              <ChartPlaceholder message="Not enough data yet — complete a session to see your trend." />
            ) : (
              <div className="relative">
                <svg width="0" height="0" style={{ position: 'absolute' }}>
                  <defs>
                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorQuiz" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </svg>

                {historyMode === 'overall' ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData.overallData} margin={{ top: 8, right: 24, bottom: 0, left: -8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.3} horizontal vertical={false} />
                      <XAxis dataKey="date" tick={axisStyle} />
                      <YAxis domain={[dataMin => Math.max(0, Math.floor(dataMin / 10) * 10 - 10), 100]} tick={axisStyle} />
                      <Tooltip content={<OverallTooltip />} />
                      <ReferenceLine y={75} stroke="#14b8a6" strokeDasharray="6 4" />
                      <Area
                        type="monotone"
                        dataKey="avg"
                        stroke="#14b8a6"
                        strokeWidth={2}
                        fill="url(#colorAvg)"
                        fillOpacity={1}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                        connectNulls={true}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData.splitData} margin={{ top: 8, right: 24, bottom: 0, left: -8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.3} horizontal vertical={false} />
                      <XAxis dataKey="date" tick={axisStyle} />
                      <YAxis domain={[dataMin => Math.max(0, Math.floor(dataMin / 10) * 10 - 10), 100]} tick={axisStyle} />
                      <Tooltip content={<SplitTooltip />} />
                      <ReferenceLine y={75} stroke="#14b8a6" strokeDasharray="6 4" />
                      <Area
                        type="monotone"
                        dataKey="quiz"
                        stroke="#14b8a6"
                        strokeWidth={2}
                        fill="url(#colorQuiz)"
                        fillOpacity={1}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                        connectNulls={true}
                      />
                      <Area
                        type="monotone"
                        dataKey="exam"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fill="url(#colorExam)"
                        fillOpacity={1}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                        connectNulls={true}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
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
                    <PolarGrid stroke={gridStroke} opacity={0.4} />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: axisStyle.fill }} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.3} />
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
