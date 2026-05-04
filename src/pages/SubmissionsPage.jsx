import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Badge from '../components/shared/Badge'
import LoadingSpinner from '../components/shared/LoadingSpinner'

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function StatusBadge({ status }) {
  if (status === 'submitted') return <Badge color="green">Submitted</Badge>
  if (status === 'paused')    return <Badge color="amber">Paused</Badge>
  return <Badge color="purple">In Progress</Badge>
}

function TypeBadge({ type, examNumber }) {
  if (type === 'exam') {
    return <Badge color="blue">Mock Exam {examNumber}</Badge>
  }
  return <Badge color="gray">Quiz</Badge>
}

export default function SubmissionsPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, type, exam_number, total_questions, score, time_remaining, status, started_at, submitted_at, time_multiplier')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })

      if (!error) setSessions(data || [])
      setLoading(false)
    }
    load()
  }, [user.id])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Submissions</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          All your exam and quiz sessions
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20 text-slate-400 dark:text-slate-500">
          <p className="text-lg font-medium mb-1">No sessions yet</p>
          <p className="text-sm">Start a Mock Exam or Question Bank session to see it here.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">#</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Score</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Questions</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Started</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sessions.map((s, i) => (
                <tr
                  key={s.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-5 py-4 text-slate-400 dark:text-slate-500 tabular-nums">
                    {sessions.length - i}
                  </td>
                  <td className="px-5 py-4">
                    <TypeBadge type={s.type} examNumber={s.exam_number} />
                  </td>
                  <td className="px-5 py-4 font-semibold tabular-nums">
                    {s.score != null
                      ? <span className="text-teal-600 dark:text-teal-400">{Math.round(s.score * 100)}%</span>
                      : <span className="text-slate-400">—</span>
                    }
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400 tabular-nums">
                    {s.total_questions}
                  </td>
                  <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                    {formatDate(s.started_at)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    {s.status === 'submitted' ? (
                      <button
                        onClick={() => navigate(`/results/${s.id}`)}
                        className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        View Results
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-4">
                        {s.status === 'paused' && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            {formatDuration(s.time_remaining)} left
                          </span>
                        )}
                        <button
                          onClick={() => navigate(`/exam/${s.id}`)}
                          className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:underline"
                        >
                          {s.status === 'paused' ? 'Resume' : 'Continue'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
