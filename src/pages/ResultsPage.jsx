import { useEffect, useState, useCallback, Fragment } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUiStore } from '../store/uiStore'
import CountdownRing from '../components/exam/CountdownRing'
import RationalePanel from '../components/exam/RationalePanel'
import LoadingSpinner from '../components/shared/LoadingSpinner'

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m}m`
  return `${m}m ${s}s`
}

function formatDuration(seconds) {
  const t = Math.max(0, seconds)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const LETTERS = ['A', 'B', 'C', 'D']

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  const bg = {
    green: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800',
    red:   'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
    amber: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800',
    slate: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
  }
  const text = {
    green: 'text-green-700 dark:text-green-400',
    red:   'text-red-700 dark:text-red-400',
    amber: 'text-amber-700 dark:text-amber-400',
    slate: 'text-slate-900 dark:text-white',
  }
  return (
    <div className={`flex-1 min-w-[90px] rounded-xl border p-4 text-center ${bg[color]}`}>
      <div className={`text-3xl font-bold tabular-nums ${text[color]}`}>{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">{label}</div>
    </div>
  )
}

function SortArrow({ field, sortField, sortDir }) {
  if (sortField !== field) return <span className="ml-0.5 opacity-25 text-[10px]">↕</span>
  return <span className="ml-0.5 text-[10px] text-teal-600 dark:text-teal-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

function DifficultyChip({ difficulty }) {
  const cls =
    difficulty === 'Easy' ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
    difficulty === 'Hard' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
                            'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
  return (
    <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded font-semibold border ${cls}`}>
      {difficulty}
    </span>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export default function ResultsPage() {
  const { sessionId } = useParams()
  const navigate      = useNavigate()
  const { darkMode, toggleDarkMode } = useUiStore()

  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [session, setSession]   = useState(null)
  const [questions, setQuestions] = useState([])

  // UI state
  const [subjectOpen, setSubjectOpen]     = useState(false)
  const [filter, setFilter]               = useState('all')
  const [sortField, setSortField]         = useState('index')
  const [sortDir, setSortDir]             = useState('asc')
  const [page, setPage]                   = useState(0)
  const [expandedId, setExpandedId]       = useState(null)
  const [displayScore, setDisplayScore]   = useState(0)

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data: sess, error: sErr } = await supabase
          .from('sessions').select('*').eq('id', sessionId).single()
        if (sErr) throw sErr

        setSession(sess)

        if (sess.question_ids?.length > 0) {
          const { data: qs, error: qErr } = await supabase
            .from('questions')
            .select('id, stem, choices, subject, difficulty, correct_index, rationale, rationale_map')
            .in('id', sess.question_ids)
          if (qErr) throw qErr

          const qMap = Object.fromEntries((qs || []).map((q) => [q.id, q]))
          setQuestions(sess.question_ids.map((id) => qMap[id]).filter(Boolean))
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Animate score ring after load
  useEffect(() => {
    if (!loading && session) {
      const t = setTimeout(() => setDisplayScore(Math.round((session.score || 0) * 100)), 150)
      return () => clearTimeout(t)
    }
  }, [loading, session])

  // Reset page when filter/sort changes
  useEffect(() => { setPage(0) }, [filter, sortField, sortDir])

  // ── Sorting ─────────────────────────────────────────────────────────────────
  const toggleSort = useCallback((field) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }, [sortField])

  // ── Loading / error ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading results…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900 px-4">
        <p className="text-red-600 dark:text-red-400 text-sm text-center max-w-sm">{error}</p>
        <button onClick={() => navigate('/')} className="text-teal-600 dark:text-teal-400 text-sm hover:underline">
          ← Dashboard
        </button>
      </div>
    )
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const sessionAnswers  = session?.answers         || {}
  const marked          = session?.marked          || []
  const timePerQuestion = session?.time_per_question || {}

  const scorePercent = Math.round((session?.score || 0) * 100)
  const scoreColor   = scorePercent >= 75 ? 'teal' : scorePercent >= 60 ? 'amber' : 'red'
  const scoreLabel   = scorePercent >= 75 ? 'Pass' : scorePercent >= 60 ? 'Borderline' : 'Below Passing'
  const scoreLabelColor =
    scorePercent >= 75 ? 'text-teal-600 dark:text-teal-400' :
    scorePercent >= 60 ? 'text-amber-600 dark:text-amber-400' :
                         'text-red-600 dark:text-red-400'

  const enriched = questions.map((q, i) => ({
    ...q,
    index:       i,
    userAnswer:  sessionAnswers[q.id] ?? null,
    isCorrect:   sessionAnswers[q.id] === q.correct_index,
    isUnanswered: sessionAnswers[q.id] === undefined,
    isMarked:    marked.includes(q.id),
    timeSpent:   timePerQuestion[q.id] || 0,
  }))

  const correctCount    = enriched.filter((q) => q.isCorrect).length
  const incorrectCount  = enriched.filter((q) => !q.isCorrect && !q.isUnanswered).length
  const unansweredCount = enriched.filter((q) => q.isUnanswered).length

  // Subject breakdown
  const subjectMap = {}
  enriched.forEach((q) => {
    if (!subjectMap[q.subject]) subjectMap[q.subject] = { total: 0, correct: 0 }
    subjectMap[q.subject].total++
    if (q.isCorrect) subjectMap[q.subject].correct++
  })
  const subjectRows = Object.entries(subjectMap)
    .map(([subject, s]) => ({ subject, ...s, pct: s.total ? Math.round(s.correct / s.total * 100) : 0 }))
    .sort((a, b) => a.pct - b.pct)

  // Total time used
  const totalAllotted = session?.mode === 'timed'
    ? 5 * 3600 * (session?.time_multiplier || 1)
    : 9 * 3600
  const timeUsed = Math.max(0, totalAllotted - (session?.time_remaining || 0))

  const submittedDate = session?.submitted_at
    ? new Date(session.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

  // Filter + sort + paginate
  const filtered = enriched.filter((q) => {
    if (filter === 'correct')    return q.isCorrect
    if (filter === 'incorrect')  return !q.isCorrect && !q.isUnanswered
    if (filter === 'unanswered') return q.isUnanswered
    if (filter === 'marked')     return q.isMarked
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortField === 'index')  cmp = a.index - b.index
    else if (sortField === 'time')   cmp = a.timeSpent - b.timeSpent
    else if (sortField === 'result') {
      const v = (q) => q.isCorrect ? 2 : q.isUnanswered ? 1 : 0
      cmp = v(a) - v(b)
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paginated  = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const FILTERS = [
    { id: 'all',        label: 'All',         count: enriched.length },
    { id: 'correct',    label: 'Correct',     count: correctCount },
    { id: 'incorrect',  label: 'Incorrect',   count: incorrectCount },
    { id: 'unanswered', label: 'Unanswered',  count: unansweredCount },
    { id: 'marked',     label: 'Marked',      count: marked.length },
  ]

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 h-14 flex items-center px-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <span className="text-sm font-bold text-teal-600 dark:text-teal-400 tracking-tight select-none">
          NPTE Prep
        </span>
        <div className="flex-1 flex justify-center">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Results</span>
        </div>
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

          {/* ── Score hero ── */}
          <div className="flex flex-col items-center gap-5">
            <CountdownRing total={100} remaining={displayScore} color={scoreColor} size={200} strokeWidth={12}>
              <span className={`text-4xl font-extrabold tabular-nums leading-none ${
                scoreColor === 'teal'  ? 'text-teal-700 dark:text-teal-400' :
                scoreColor === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                                         'text-red-600 dark:text-red-400'
              }`}>
                {scorePercent}%
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                Score
              </span>
            </CountdownRing>

            <div className={`text-sm font-bold uppercase tracking-widest ${scoreLabelColor}`}>
              {scoreLabel}
            </div>

            {/* Session metadata */}
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap justify-center">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold uppercase tracking-wider">
                {session?.type === 'quiz' ? 'Quiz' : 'Exam'}
              </span>
              <span>{submittedDate}</span>
              {session?.type !== 'quiz' && (
                <>
                  <span>·</span>
                  <span>{formatDuration(timeUsed)} used</span>
                </>
              )}
            </div>
          </div>

          {/* ── Stat cards ── */}
          <div className="flex gap-3 flex-wrap">
            <StatCard label="Correct"    value={correctCount}    color="green" />
            <StatCard label="Incorrect"  value={incorrectCount}  color="red" />
            <StatCard label="Unanswered" value={unansweredCount} color="amber" />
            <StatCard label="Marked"     value={marked.length}   color="slate" />
          </div>

          {/* ── Performance by subject (collapsible) ── */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <button
              onClick={() => setSubjectOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Performance by Subject
              </span>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${subjectOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {subjectOpen && (
              <div className="border-t border-slate-100 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                      <th className="px-5 py-3">Subject</th>
                      <th className="px-5 py-3 text-center w-24">Questions</th>
                      <th className="px-5 py-3 text-center w-24">Correct</th>
                      <th className="px-5 py-3 w-40">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectRows.map((row, i) => (
                      <tr key={row.subject} className={i % 2 === 0 ? '' : 'bg-slate-50 dark:bg-slate-800/50'}>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-200 font-medium">{row.subject}</td>
                        <td className="px-5 py-3 text-center text-slate-500 dark:text-slate-400 tabular-nums">{row.total}</td>
                        <td className="px-5 py-3 text-center text-slate-500 dark:text-slate-400 tabular-nums">{row.correct}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  row.pct >= 75 ? 'bg-teal-500' : row.pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${row.pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300 w-8 text-right">
                              {row.pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Per-question table ── */}
          <section>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              Question Breakdown
            </h2>

            {/* Filter tabs */}
            <div className="flex gap-1.5 flex-wrap mb-4">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    filter === f.id
                      ? 'bg-teal-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {f.label}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    filter === f.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '16%' }} />
                </colgroup>
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                    <th className="px-3 py-3 cursor-pointer select-none" onClick={() => toggleSort('index')}>
                      Q# <SortArrow field="index" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className="px-3 py-3">Subject</th>
                    <th className="px-3 py-3">Diff.</th>
                    <th className="px-3 py-3">Your Answer</th>
                    <th className="px-3 py-3">Correct</th>
                    <th className="px-3 py-3 cursor-pointer select-none" onClick={() => toggleSort('result')}>
                      Result <SortArrow field="result" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className="px-3 py-3 cursor-pointer select-none" onClick={() => toggleSort('time')}>
                      Time <SortArrow field="time" sortField={sortField} sortDir={sortDir} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-600">
                        No questions match this filter.
                      </td>
                    </tr>
                  ) : paginated.map((q, ri) => (
                    <Fragment key={q.id}>
                      <tr
                        onClick={() => setExpandedId((id) => id === q.id ? null : q.id)}
                        className={`cursor-pointer border-b border-slate-100 dark:border-slate-700/60 transition-colors ${
                          expandedId === q.id
                            ? 'bg-teal-50 dark:bg-teal-900/10'
                            : ri % 2 === 1
                            ? 'bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                        }`}
                      >
                        {/* Q# */}
                        <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                          {q.index + 1}
                        </td>
                        {/* Subject */}
                        <td className="px-3 py-3 text-slate-600 dark:text-slate-400 truncate text-xs">
                          {q.subject}
                        </td>
                        {/* Difficulty */}
                        <td className="px-3 py-3">
                          <DifficultyChip difficulty={q.difficulty} />
                        </td>
                        {/* Your Answer */}
                        <td className="px-3 py-3 text-slate-500 dark:text-slate-500 truncate text-xs">
                          {q.userAnswer !== null
                            ? `${LETTERS[q.userAnswer]}. ${q.choices?.[q.userAnswer] || ''}`
                            : <span className="text-slate-300 dark:text-slate-600">—</span>
                          }
                        </td>
                        {/* Correct Answer */}
                        <td className="px-3 py-3 text-slate-600 dark:text-slate-300 truncate text-xs">
                          {q.choices
                            ? `${LETTERS[q.correct_index]}. ${q.choices[q.correct_index]}`
                            : '—'
                          }
                        </td>
                        {/* Result */}
                        <td className="px-3 py-3">
                          {q.isUnanswered ? (
                            <span className="text-amber-500 dark:text-amber-400 font-bold text-base">—</span>
                          ) : q.isCorrect ? (
                            <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </td>
                        {/* Time */}
                        <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatTime(q.timeSpent)}
                        </td>
                      </tr>

                      {/* Expanded detail drawer */}
                      {expandedId === q.id && (
                        <tr>
                          <td colSpan={7} className="p-0 border-b border-slate-200 dark:border-slate-700">
                            <div className="bg-slate-50 dark:bg-slate-900/50">
                              <div className="px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-100 font-[450]">
                                  {q.stem}
                                </p>
                              </div>
                              <RationalePanel question={q} selectedAnswer={q.userAnswer} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="h-4" />
        </div>
      </div>

      {/* ── Bottom action bar ── */}
      <div className="flex-shrink-0 h-16 flex items-center justify-between px-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <button
          onClick={() => navigate('/question-bank')}
          className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          New Session
        </button>

        <button
          onClick={() => navigate(`/exam/${sessionId}`, { state: { readOnly: true } })}
          className="px-5 py-2.5 rounded-xl border-2 border-teal-600 dark:border-teal-500 text-teal-600 dark:text-teal-400 text-sm font-semibold hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          Review Answers
        </button>

        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}
