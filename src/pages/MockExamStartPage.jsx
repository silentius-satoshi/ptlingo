import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Button from '../components/shared/Button'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const MULTIPLIERS = [
  { value: 1,   label: '1×',   minutes: 300 },
  { value: 1.5, label: '1.5×', minutes: 450 },
  { value: 2,   label: '2×',   minutes: 600 },
]

// Maps sidebar exam ID (URL param) to the exam_series value used in the questions table.
const EXAM_SERIES = {
  '1': 'Series 3 Form A',
  '2': 'Mock Exam B',
}

export default function MockExamStartPage() {
  const { examId } = useParams()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [multiplier, setMultiplier] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedMultiplier = MULTIPLIERS.find((m) => m.value === multiplier)

  const handleStart = async () => {
    setLoading(true)
    setError('')
    try {
      const series = EXAM_SERIES[examId]
      if (!series) throw new Error(`No exam configured for ID ${examId}.`)

      // Fetch questions for this exam series, ordered by section
      const { data: questions, error: qErr } = await supabase
        .from('questions')
        .select('id, section')
        .eq('exam_series', series)
        .eq('quarantined', false)
        // Secondary sort matters: section alone leaves within-section order to
        // Postgres, which serves items in arbitrary (insertion) order. The form
        // should run in its own question order.
        .order('section', { ascending: true })
        .order('question_number', { ascending: true })

      if (qErr) throw qErr

      if (!questions || questions.length === 0) {
        throw new Error(
          `No questions found for "${series}". Import questions first using the Node.js import script.`
        )
      }

      const questionIds = questions.map((q) => q.id)
      const totalSeconds = selectedMultiplier.minutes * 60

      const { data: session, error: sErr } = await supabase
        .from('sessions')
        .insert({
          user_id:         user.id,
          type:            'exam',
          mode:            'timed',
          time_multiplier: multiplier,
          subjects:        [],
          difficulty:      [],
          exam_number:     parseInt(examId),
          question_ids:    questionIds,
          total_questions: questionIds.length,
          time_remaining:  totalSeconds,
          current_index:   0,
          status:          'in_progress',
        })
        .select()
        .single()

      if (sErr) throw sErr

      navigate(`/exam/${session.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-semibold text-teal-600 dark:text-teal-400 mb-1 uppercase tracking-wide">
          Mock Exam
        </p>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Mock Exam {examId}
        </h1>
      </div>

      {/* Summary card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-5">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
          Exam Summary
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: '225', label: 'Questions' },
            { value: '5',   label: 'Sections' },
            { value: String(selectedMultiplier.minutes), label: 'Minutes' },
          ].map((item) => (
            <div
              key={item.label}
              className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800"
            >
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {item.value}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Time multiplier */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-5">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
          Time Accommodation
        </p>
        <div className="grid grid-cols-3 gap-3">
          {MULTIPLIERS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMultiplier(m.value)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                multiplier === m.value
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
              }`}
            >
              <p className={`text-2xl font-bold ${
                multiplier === m.value
                  ? 'text-teal-700 dark:text-teal-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}>
                {m.label}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {m.minutes} min
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Exam structure info */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Exam structure: </span>
          5 sections × 45 questions. No per-section time limits — one shared timer.
          A scheduled 15-minute break occurs after Section 2 (timer pauses).
          Optional breaks are available after Sections 1, 3, and 4 (timer continues).
        </p>
      </div>

      {error && (
        <div className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <Button onClick={handleStart} disabled={loading} size="lg" className="w-full">
        {loading ? 'Creating session…' : 'Start Mock Exam'}
      </Button>

      <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-3">
        Progress is saved automatically. Resume anytime from Submissions.
      </p>
    </div>
  )
}
