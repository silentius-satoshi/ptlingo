import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  LineChart, Line, ReferenceLine,
} from 'recharts'
import NpteHistory from '../components/performance/NpteHistory'
import StudyPlanTab from '../components/performance/StudyPlanTab'
import MasteryRing from '../components/gamification/MasteryRing'
import useGamificationStore from '../stores/gamificationStore'
import { getSystemConfig } from '../constants/systemConfig'

const TABS = ['Practice Analytics', 'NPTE History', 'Study Plan']

// ── Helpers ────────────────────────────────────────────────────────────────────

const SUBJECTS = [
  'Musculoskeletal',
  'Neuromuscular',
  'Cardiovascular and Pulmonary',
  'Integumentary',
  'Pediatrics',
  'Other',
]

function fmtDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function SkeletonChart({ height = 220 }) {
  return (
    <div
      className="rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse w-full"
      style={{ height }}
    />
  )
}

// ── Chart Card wrapper ─────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {subtitle && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 mb-4">{subtitle}</p>
      )}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  )
}

function ChartEmpty({ message }) {
  return (
    <div className="flex items-center justify-center" style={{ height: 220 }}>
      <p className="text-sm text-slate-400 dark:text-slate-500 italic">{message}</p>
    </div>
  )
}

// ── Custom tooltips ────────────────────────────────────────────────────────────

function PctTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1">{label}</p>
      <p className="text-teal-400">{payload[0].value}% accuracy</p>
    </div>
  )
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1">{d.label}</p>
      <p className="text-teal-400">{d.score}%</p>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

const SUBJECT_ABBR = {
  'Musculoskeletal':            'MSK',
  'Neuromuscular':              'Neuro',
  'Cardiovascular and Pulmonary': 'Cardio',
  'Integumentary':              'Integ',
  'Pediatrics':                 'Peds',
  'Other':                      'Other',
}

function MasteryRingsRow({ subjectMastery }) {
  if (!Object.keys(subjectMastery).length) return null
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Subject Mastery</p>
      <div className="flex flex-wrap justify-center gap-6">
        {SUBJECTS.map((s) => (
          <MasteryRing
            key={s}
            pct={subjectMastery[s]?.pct ?? 0}
            size={64}
            label={SUBJECT_ABBR[s] ?? s}
            accentColor={getSystemConfig(s)?.primary}
          />
        ))}
      </div>
    </div>
  )
}

export default function PerformancePage() {
  const { user } = useAuthStore()
  const { darkMode } = useUiStore()
  const { subjectMastery } = useGamificationStore()

  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState([])
  const [questions, setQuestions] = useState([])  // { id, stem, choices, subject, difficulty, tags, correct_index, section, rationale, rationale_map }
  const [flaggedModal, setFlaggedModal] = useState(null) // question object

  const axisStyle  = { fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }
  const gridStroke = darkMode ? '#334155' : '#e2e8f0'

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id, type, exam_number, question_ids, answers, score, started_at, submitted_at, status, time_remaining, time_multiplier')
        .eq('user_id', user.id)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: true })

      const allSessions = sessionData || []
      setSessions(allSessions)

      const allQIds = [...new Set(allSessions.flatMap((s) => s.question_ids || []))]
      if (allQIds.length > 0) {
        const { data: qData } = await supabase
          .from('questions')
          .select('id, stem, choices, subject, difficulty, tags, correct_index, section, rationale, rationale_map')
          .in('id', allQIds)
        setQuestions(qData || [])
      }
      setLoading(false)
    }
    load()
  }, [user.id])

  // ── Derived analytics ──────────────────────────────────────────────────────

  const qMap = useMemo(
    () => Object.fromEntries(questions.map((q) => [q.id, q])),
    [questions],
  )

  // Per-question answer history: { questionId: { correct: N, wrong: N, lastSeen: date } }
  const answerHistory = useMemo(() => {
    const hist = {}
    sessions.forEach((s) => {
      const date = s.submitted_at || s.started_at
      Object.entries(s.answers || {}).forEach(([qId, chosen]) => {
        const q = qMap[qId]
        if (!q) return
        if (!hist[qId]) hist[qId] = { correct: 0, wrong: 0, lastSeen: date }
        if (chosen === q.correct_index) hist[qId].correct++
        else hist[qId].wrong++
        if (date > hist[qId].lastSeen) hist[qId].lastSeen = date
      })
    })
    return hist
  }, [sessions, qMap])

  // Accuracy by subject
  const subjectData = useMemo(() => {
    const acc = {}
    Object.entries(answerHistory).forEach(([qId, h]) => {
      const subj = qMap[qId]?.subject || 'Other'
      if (!acc[subj]) acc[subj] = { correct: 0, total: 0 }
      acc[subj].correct += h.correct
      acc[subj].total   += h.correct + h.wrong
    })
    return SUBJECTS
      .filter((s) => acc[s]?.total > 0)
      .map((s) => ({
        subject: s.length > 20 ? s.slice(0, 19) + '…' : s,
        pct: Math.round(acc[s].correct / acc[s].total * 100),
      }))
  }, [answerHistory, qMap])

  // Accuracy by section (NPTE section 1-5)
  const sectionData = useMemo(() => {
    const acc = {}
    Object.entries(answerHistory).forEach(([qId, h]) => {
      const sec = qMap[qId]?.section
      if (!sec) return
      if (!acc[sec]) acc[sec] = { correct: 0, total: 0 }
      acc[sec].correct += h.correct
      acc[sec].total   += h.correct + h.wrong
    })
    return [1, 2, 3, 4, 5]
      .filter((s) => acc[s]?.total > 0)
      .map((s) => ({
        section: `S${s}`,
        pct: Math.round(acc[s].correct / acc[s].total * 100),
      }))
  }, [answerHistory, qMap])

  // Accuracy by difficulty
  const diffData = useMemo(() => {
    const acc = { Easy: { correct: 0, total: 0 }, Medium: { correct: 0, total: 0 }, Hard: { correct: 0, total: 0 } }
    Object.entries(answerHistory).forEach(([qId, h]) => {
      const diff = qMap[qId]?.difficulty
      if (!diff || !acc[diff]) return
      acc[diff].correct += h.correct
      acc[diff].total   += h.correct + h.wrong
    })
    return ['Easy', 'Medium', 'Hard']
      .filter((d) => acc[d].total > 0)
      .map((d) => ({
        difficulty: d,
        pct: Math.round(acc[d].correct / acc[d].total * 100),
      }))
  }, [answerHistory, qMap])

  // Accuracy by tag — 10 weakest
  const tagData = useMemo(() => {
    const acc = {}
    Object.entries(answerHistory).forEach(([qId, h]) => {
      const tags = qMap[qId]?.tags || []
      tags.forEach((tag) => {
        if (!acc[tag]) acc[tag] = { correct: 0, total: 0 }
        acc[tag].correct += h.correct
        acc[tag].total   += h.correct + h.wrong
      })
    })
    return Object.entries(acc)
      .filter(([, v]) => v.total >= 3)
      .map(([tag, v]) => ({ tag, pct: Math.round(v.correct / v.total * 100) }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 10)
  }, [answerHistory, qMap])

  // Score trend
  const trendData = useMemo(() =>
    sessions
      .filter((s) => s.score != null && s.score > 0)
      .map((s) => ({
        date: fmtDate(s.submitted_at || s.started_at),
        score: Math.round(s.score * 100),
        label: s.type === 'exam'
          ? `Mock Exam${s.exam_number ? ` #${s.exam_number}` : ''}`
          : 'Quiz',
      })),
    [sessions],
  )

  // Flagged for review (wrong >= 2 times)
  const flaggedData = useMemo(() =>
    Object.entries(answerHistory)
      .filter(([, h]) => h.wrong >= 2)
      .map(([qId, h]) => ({
        question: qMap[qId],
        wrongCount: h.wrong,
        lastSeen: h.lastSeen,
      }))
      .filter((r) => r.question)
      .sort((a, b) => b.wrongCount - a.wrongCount),
    [answerHistory, qMap],
  )

  // Practice accuracy per subject — passed to NPTE History + Study Plan tabs
  const practiceAccuracy = useMemo(() => {
    const acc = {}
    Object.entries(answerHistory).forEach(([qId, h]) => {
      const subj = qMap[qId]?.subject || 'Other'
      if (!acc[subj]) acc[subj] = { correct: 0, total: 0 }
      acc[subj].correct += h.correct
      acc[subj].total   += h.correct + h.wrong
    })
    return Object.entries(acc)
      .filter(([, v]) => v.total > 0)
      .map(([subject, v]) => ({ subject, accuracy: v.correct / v.total }))
  }, [answerHistory, qMap])

  const hasData = sessions.length > 0

  // ── Bar color helper ───────────────────────────────────────────────────────
  const barColor = (pct) => (pct >= 75 ? '#14b8a6' : pct >= 60 ? '#f59e0b' : '#ef4444')

  return (
    <div className="px-6 py-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Performance</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Practice analytics, NPTE history, and AI-powered study planning
          </p>
        </div>

        {/* Mastery rings */}
        <MasteryRingsRow subjectMastery={subjectMastery} />

        {/* Tab bar */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === i
                  ? 'border-teal-400 text-teal-400 dark:text-teal-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* NPTE History tab */}
        {activeTab === 1 && <NpteHistory practiceAccuracy={practiceAccuracy} />}

        {/* Study Plan tab */}
        {activeTab === 2 && <StudyPlanTab practiceAccuracy={practiceAccuracy} />}

        {/* Practice Analytics tab */}
        {activeTab === 0 && (<>

        {!loading && !hasData && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 flex flex-col items-center gap-3 text-center">
            <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">No data yet</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                Complete a session to see your performance breakdown.
              </p>
            </div>
          </div>
        )}

        {/* Row 1 — Subject + Section */}
        {(loading || hasData) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Accuracy by Subject" subtitle="% correct per subject area">
              {loading ? <SkeletonChart /> : subjectData.length === 0 ? (
                <ChartEmpty message="No answered questions yet." />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={subjectData} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.4} horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={axisStyle} unit="%" />
                    <YAxis type="category" dataKey="subject" tick={axisStyle} width={140} />
                    <Tooltip content={<PctTooltip />} />
                    <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {subjectData.map((d, i) => (
                        <Cell key={i} fill={barColor(d.pct)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Accuracy by Section" subtitle="% correct per NPTE section">
              {loading ? <SkeletonChart /> : sectionData.length === 0 ? (
                <ChartEmpty message="No section data yet." />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sectionData} margin={{ top: 0, right: 16, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.4} />
                    <XAxis dataKey="section" tick={axisStyle} />
                    <YAxis domain={[0, 100]} tick={axisStyle} unit="%" />
                    <Tooltip content={<PctTooltip />} />
                    <ReferenceLine y={75} stroke="#14b8a6" strokeDasharray="6 4" />
                    <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      {sectionData.map((d, i) => (
                        <Cell key={i} fill={barColor(d.pct)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        )}

        {/* Row 2 — Difficulty + Tag */}
        {(loading || hasData) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Accuracy by Difficulty" subtitle="% correct per difficulty level">
              {loading ? <SkeletonChart /> : diffData.length === 0 ? (
                <ChartEmpty message="No difficulty data yet." />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={diffData} margin={{ top: 0, right: 16, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.4} />
                    <XAxis dataKey="difficulty" tick={axisStyle} />
                    <YAxis domain={[0, 100]} tick={axisStyle} unit="%" />
                    <Tooltip content={<PctTooltip />} />
                    <ReferenceLine y={75} stroke="#14b8a6" strokeDasharray="6 4" />
                    <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={56}>
                      {diffData.map((d, i) => (
                        <Cell key={i} fill={barColor(d.pct)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Weakest Tags" subtitle="10 lowest-accuracy tags (min 3 attempts)">
              {loading ? <SkeletonChart /> : tagData.length === 0 ? (
                <ChartEmpty message="Answer more questions to see tag breakdown." />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={tagData} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.4} horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={axisStyle} unit="%" />
                    <YAxis type="category" dataKey="tag" tick={axisStyle} width={130} />
                    <Tooltip content={<PctTooltip />} />
                    <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={18}>
                      {tagData.map((d, i) => (
                        <Cell key={i} fill={barColor(d.pct)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        )}

        {/* Row 3 — Score Trend */}
        {(loading || hasData) && (
          <ChartCard title="Score Trend" subtitle="Score % per submitted session">
            {loading ? <SkeletonChart height={260} /> : trendData.length < 2 ? (
              <ChartEmpty message="Submit at least 2 sessions to see your trend." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData} margin={{ top: 8, right: 24, bottom: 0, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.4} />
                  <XAxis dataKey="date" tick={axisStyle} />
                  <YAxis domain={[0, 100]} tick={axisStyle} unit="%" />
                  <Tooltip content={<TrendTooltip />} />
                  <ReferenceLine y={75} stroke="#14b8a6" strokeDasharray="6 4" />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#14b8a6', strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        )}

        {/* Row 4 — Flagged for Review */}
        {(loading || hasData) && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Flagged for Review</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Questions you've answered incorrectly 2 or more times
              </p>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : flaggedData.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                No questions flagged yet. Keep practicing!
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    {['Question', 'Subject', 'Times Incorrect', 'Last Seen'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flaggedData.map(({ question, wrongCount, lastSeen }, i) => (
                    <tr
                      key={question.id}
                      onClick={() => setFlaggedModal(question)}
                      className={`cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors ${
                        i % 2 === 1
                          ? 'bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100/70 dark:hover:bg-slate-700/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-xs">
                        <span className="line-clamp-2 text-xs leading-relaxed">
                          {question.stem?.slice(0, 120)}{question.stem?.length > 120 ? '…' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                        {question.subject}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                          {wrongCount}×
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                        {fmtDate(lastSeen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        </>)}
      </div>

      {/* Flagged question modal */}
      {flaggedModal && (
        <FlaggedModal question={flaggedModal} onClose={() => setFlaggedModal(null)} />
      )}
    </div>
  )
}

// ── Flagged Question Modal ─────────────────────────────────────────────────────

const CHOICE_LABELS = ['A', 'B', 'C', 'D']

function FlaggedModal({ question, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {question.subject}
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
              question.difficulty === 'Easy'
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : question.difficulty === 'Hard'
                ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
            }`}>
              {question.difficulty}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Stem */}
          <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
            {question.stem}
          </p>

          {/* Choices */}
          <div className="space-y-2">
            {(question.choices || []).map((choice, i) => {
              const isCorrect = i === question.correct_index
              return (
                <div
                  key={i}
                  className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${
                    isCorrect
                      ? 'bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-700'
                      : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700'
                  }`}
                >
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center mt-0.5 ${
                    isCorrect ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}>
                    {CHOICE_LABELS[i]}
                  </span>
                  <span className={isCorrect ? 'text-teal-800 dark:text-teal-200' : 'text-slate-700 dark:text-slate-300'}>
                    {choice}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Rationale */}
          {(() => {
            const rationale = question.rationale_map?.[String(question.correct_index)] || question.rationale || ''
            if (!rationale) return null
            return (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Explanation
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{rationale}</p>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
