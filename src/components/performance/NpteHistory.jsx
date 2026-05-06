import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../store/authStore'
import { fetchAttempts, deleteAttempt } from '../../lib/npteAttempts'
import AttemptForm from './AttemptForm'
import AttemptTable from './AttemptTable'
import ScoreTrajectoryChart from './ScoreTrajectoryChart'
import BodySystemTrendsChart from './BodySystemTrendsChart'
import WorkActivityChart from './WorkActivityChart'
import SectionHeatmap from './SectionHeatmap'
import PracticeVsRealChart from './PracticeVsRealChart'
import GapAnalysisMatrix from './GapAnalysisMatrix'
import InsightCards from './InsightCards'
import RetakeStats from './RetakeStats'

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {subtitle
        ? <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 mb-4">{subtitle}</p>
        : <div className="mb-4" />
      }
      {children}
    </div>
  )
}

export default function NpteHistory({ practiceAccuracy }) {
  const { user } = useAuthStore()
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAttempt, setEditingAttempt] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAttempts(user.id)
      setAttempts(data)
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => { load() }, [load])

  const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null

  const handleSaved = () => {
    setShowForm(false)
    setEditingAttempt(null)
    load()
  }

  const handleEdit = (attempt) => {
    setEditingAttempt(attempt)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    await deleteAttempt(id)
    load()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">NPTE Attempt History</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Log your official FSBPT exam results to unlock trend analysis and study plan generation.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setEditingAttempt(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Log Attempt
          </button>
        )}
      </div>

      {/* Attempt Form */}
      {showForm && (
        <AttemptForm
          attempt={editingAttempt}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditingAttempt(null) }}
          userId={user.id}
          nextAttemptNumber={attempts.length + (editingAttempt ? 0 : 1)}
        />
      )}

      {/* Attempt Table */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 flex items-center justify-center">
          <div className="w-6 h-6 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-teal-600" />
        </div>
      ) : attempts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 flex flex-col items-center gap-3 text-center">
          <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
          </svg>
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-300">No attempts logged yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Log your first NPTE attempt to unlock trend analysis and the AI study plan generator.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <AttemptTable attempts={attempts} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      )}

      {/* Charts + analytics — only when attempts exist */}
      {attempts.length > 0 && (
        <>
          <ChartCard title="Score Trajectory" subtitle="Overall scale score across all NPTE attempts">
            <ScoreTrajectoryChart attempts={attempts} />
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Body System Trends" subtitle="Scale score per system over time — click legend to toggle">
              <BodySystemTrendsChart attempts={attempts} />
            </ChartCard>
            <ChartCard title="Work Activity % Correct" subtitle="PT Exam / Foundations / Interventions / Non-Systems">
              <WorkActivityChart attempts={attempts} />
            </ChartCard>
          </div>

          {latestAttempt?.sections?.length > 0 && (
            <ChartCard title="Section Heatmap" subtitle={`Most recent attempt (Attempt ${latestAttempt.attempt_number})`}>
              <SectionHeatmap attempt={latestAttempt} />
            </ChartCard>
          )}

          <ChartCard title="Practice vs NPTE" subtitle="In-app accuracy vs NPTE % correct by body system">
            <PracticeVsRealChart practiceAccuracy={practiceAccuracy} latestAttempt={latestAttempt} />
          </ChartCard>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Gap Analysis Matrix</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Distance from passing (600) per body system — most recent attempt</p>
            </div>
            <GapAnalysisMatrix attempts={attempts} />
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Smart Insights</p>
            <InsightCards attempts={attempts} practiceAccuracy={practiceAccuracy} />
          </div>

          <RetakeStats latestAttempt={latestAttempt} />
        </>
      )}
    </div>
  )
}
