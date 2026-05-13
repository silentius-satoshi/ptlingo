import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import useGamificationStore from '../stores/gamificationStore'
import { useSessionStore } from '../store/sessionStore'
import { useTimer } from '../hooks/useTimer'
import Modal from '../components/shared/Modal'
import Button from '../components/shared/Button'
import LoadingSpinner from '../components/shared/LoadingSpinner'

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatPill({ label, value, warn = false }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 min-w-[88px]">
      <span className={`text-2xl font-bold tabular-nums leading-none ${
        warn ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
      }`}>
        {value}
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap mt-1">
        {label}
      </span>
    </div>
  )
}

function QuestionCard({ question, questionNumber, isAnswered, onGoTo, onViewRationale }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      {/* Number badge */}
      <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-none">
          Q{questionNumber}
        </span>
      </div>

      {/* Stem + subject */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 dark:text-slate-200 line-clamp-2 mb-2 leading-relaxed">
          {question.stem}
        </p>
        <span className="inline-flex text-xs px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-800 font-medium">
          {question.subject}
        </span>
      </div>

      {/* Status chip + action */}
      <div className="flex-shrink-0 flex flex-col items-end gap-2.5">
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${
          isAnswered
            ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
        }`}>
          {isAnswered ? 'Answered' : 'Unanswered'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onViewRationale}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: '#3B82F6' }}
          >
            View Rationale
          </button>
          <button
            onClick={onGoTo}
            className="flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
          >
            Go to Question
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const { sessionId } = useParams()
  const navigate      = useNavigate()
  const { advanceStreak } = useGamificationStore()

  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState('')
  const [session, setSession]                 = useState(null)
  const [questions, setQuestions]             = useState([])
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitting, setSubmitting]           = useState(false)

  const saveTimeoutRef = useRef(null)

  // ── Load session + questions ───────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data: sess, error: sErr } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single()
        if (sErr) throw sErr

        if (sess.status === 'submitted') {
          navigate(`/results/${sessionId}`, { replace: true })
          return
        }

        // Seed the timer store so useTimer picks up from the correct value.
        // ExamPage called resetSession() on unmount (zeroing timeRemaining),
        // so we must restore it here before the timer un-pauses.
        useSessionStore.getState().setTimeRemaining(sess.time_remaining ?? 0)

        setSession(sess)

        if (sess.question_ids?.length > 0) {
          const { data: qs, error: qErr } = await supabase
            .from('questions')
            .select('id, stem, choices, subject, correct_index, rationale, rationale_map')
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

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!session) return
    setSubmitting(true)
    try {
      const sessionAnswers = session.answers || {}
      const correct = questions.filter((q) => sessionAnswers[q.id] === q.correct_index).length
      const score   = questions.length > 0 ? correct / questions.length : 0

      await supabase
        .from('sessions')
        .update({
          status:       'submitted',
          score,
          submitted_at: new Date().toISOString(),
          time_remaining: useSessionStore.getState().timeRemaining,
        })
        .eq('id', sessionId)

      await advanceStreak()
      navigate(`/results/${sessionId}`)
    } catch (err) {
      console.error('Submit error:', err)
    } finally {
      setSubmitting(false)
    }
  }, [session, questions, sessionId, navigate, advanceStreak])

  // ── Live timer — timed sessions only, paused until session loaded ──────────
  const timerPaused = loading || session?.mode !== 'timed'
  const { timeRemaining, formatted: formattedTime } = useTimer({
    paused:   timerPaused,
    onExpire: handleSubmit,
  })

  // ── Debounce-persist time_remaining to Supabase on every tick ─────────────
  useEffect(() => {
    if (timerPaused || !sessionId) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      supabase
        .from('sessions')
        .update({ time_remaining: useSessionStore.getState().timeRemaining })
        .eq('id', sessionId)
    }, 3000)
  }, [timeRemaining, timerPaused, sessionId])

  // ── Flush time_remaining to Supabase before navigating back ───────────────
  const flushAndNavigate = useCallback(async (destination, opts) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    if (!timerPaused) {
      await supabase
        .from('sessions')
        .update({ time_remaining: useSessionStore.getState().timeRemaining })
        .eq('id', sessionId)
    }
    navigate(destination, opts)
  }, [sessionId, timerPaused, navigate])

  const handleBackToExam = useCallback(() => {
    flushAndNavigate(`/exam/${sessionId}`)
  }, [sessionId, flushAndNavigate])

  const goToQuestion = useCallback((index) => {
    flushAndNavigate(`/exam/${sessionId}`, { state: { goToIndex: index } })
  }, [sessionId, flushAndNavigate])

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading session…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900 px-4">
        <p className="text-red-600 dark:text-red-400 text-sm text-center max-w-sm">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-teal-600 dark:text-teal-400 text-sm hover:underline"
        >
          ← Go back
        </button>
      </div>
    )
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const sessionAnswers = session?.answers || {}
  const marked         = session?.marked  || []

  const answeredCount   = questions.filter((q) => sessionAnswers[q.id] !== undefined).length
  const unansweredCount = questions.length - answeredCount

  const markedRows = questions
    .map((q, i) => ({ ...q, index: i }))
    .filter((q) => marked.includes(q.id))

  const unansweredRows = questions
    .map((q, i) => ({ ...q, index: i }))
    .filter((q) => sessionAnswers[q.id] === undefined)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 h-14 flex items-center px-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <button
          onClick={handleBackToExam}
          title="Back to Exam"
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex-1 flex justify-center">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Review</span>
        </div>

        {/* Live exam clock — timed sessions only */}
        <div className="w-28 flex justify-end">
          {session?.mode === 'timed' && (
            <span className="font-mono text-sm tabular-nums font-semibold text-amber-600 dark:text-amber-400">
              {formattedTime}
            </span>
          )}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">

          {/* Summary strip */}
          <div className="flex flex-wrap gap-3 justify-center">
            <StatPill label="Total"      value={questions.length} />
            <StatPill label="Answered"   value={answeredCount} />
            <StatPill label="Unanswered" value={unansweredCount} warn={unansweredCount > 0} />
            <StatPill label="Marked"     value={marked.length}   warn={marked.length > 0} />
          </div>

          {/* ── Marked for Review ── */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Marked for Review
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                {marked.length}
              </span>
            </div>

            {markedRows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <p className="text-sm">No questions marked for review</p>
              </div>
            ) : (
              <div className="space-y-3">
                {markedRows.map((q) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    questionNumber={q.index + 1}
                    isAnswered={sessionAnswers[q.id] !== undefined}
                    onGoTo={() => goToQuestion(q.index)}
                    onViewRationale={() => navigate('/rationale', { state: { question: q, selectedAnswer: session?.answers?.[q.id] ?? null, systemName: q.subject, sessionId, currentIndex: q.index, totalQuestions: questions.length } })}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Unanswered Questions ── */}
          {unansweredRows.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Unanswered Questions
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                  {unansweredRows.length}
                </span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
                These questions will be marked incorrect if submitted.
              </p>
              <div className="space-y-3">
                {unansweredRows.map((q) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    questionNumber={q.index + 1}
                    isAnswered={false}
                    onGoTo={() => goToQuestion(q.index)}
                    onViewRationale={() => navigate('/rationale', { state: { question: q, selectedAnswer: session?.answers?.[q.id] ?? null, systemName: q.subject, sessionId, currentIndex: q.index, totalQuestions: questions.length } })}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="h-2" />
        </div>
      </div>

      {/* ── Sticky bottom action bar ── */}
      <div className="flex-shrink-0 h-16 flex items-center justify-between px-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <button
          onClick={handleBackToExam}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Exam
        </button>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          Submit Exam
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* ── Final submit confirmation modal ── */}
      <Modal
        open={showSubmitModal}
        onClose={() => !submitting && setShowSubmitModal(false)}
        title="Submit Exam?"
      >
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
          You have{' '}
          <span className="font-semibold text-slate-800 dark:text-white">{unansweredCount}</span>
          {' '}unanswered and{' '}
          <span className="font-semibold text-slate-800 dark:text-white">{marked.length}</span>
          {' '}marked question{marked.length !== 1 ? 's' : ''} remaining.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
          This action cannot be undone. Your score will be calculated immediately.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setShowSubmitModal(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Exam'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
