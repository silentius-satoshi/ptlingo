import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSessionStore } from '../store/sessionStore'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import ExamTopBar from '../components/layout/ExamTopBar'
import QuestionPanel from '../components/exam/QuestionPanel'
import AnswerPanel from '../components/exam/AnswerPanel'
import QuestionNav from '../components/exam/QuestionNav'
import LoadingSpinner from '../components/shared/LoadingSpinner'

export default function ExamPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [questions, setQuestions] = useState([])
  const [paused, setPaused] = useState(false)
  const [focusedChoice, setFocusedChoice] = useState(null)
  const [toolbarOpen, setToolbarOpen] = useState(true)
  const saveTimeoutRef = useRef(null)

  const {
    currentIndex,
    answers,
    marked,
    eliminated,
    setSession,
    setCurrentIndex,
    setAnswer,
    toggleMarked,
    toggleEliminated,
    resetSession,
  } = useSessionStore()

  // ── Load session + questions ───────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data: session, error: sErr } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (sErr) throw sErr
        if (!session) throw new Error('Session not found.')

        if (session.question_ids?.length > 0) {
          const { data: qs, error: qErr } = await supabase
            .from('questions')
            .select('*')
            .in('id', session.question_ids)

          if (qErr) throw qErr

          // Reorder to match the session's question_ids ordering
          const qMap = Object.fromEntries((qs || []).map((q) => [q.id, q]))
          const ordered = session.question_ids.map((id) => qMap[id]).filter(Boolean)
          setQuestions(ordered)
        }

        setSession({
          sessionId:       session.id,
          type:            session.type,
          mode:            session.mode,
          timeMultiplier:  session.time_multiplier,
          currentIndex:    session.current_index ?? 0,
          answers:         session.answers         ?? {},
          marked:          session.marked           ?? [],
          eliminated:      session.eliminated       ?? {},
          highlights:      session.highlights       ?? {},
          notes:           session.notes            ?? {},
          timePerQuestion: session.time_per_question ?? {},
          timeRemaining:   session.time_remaining   ?? 0,
          status:          session.status,
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => {
      resetSession()
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced Supabase save ────────────────────────────────────────────────
  const scheduleSave = useCallback((patch = {}) => {
    if (!sessionId) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      const s = useSessionStore.getState()
      await supabase
        .from('sessions')
        .update({
          answers:           s.answers,
          marked:            s.marked,
          eliminated:        s.eliminated,
          notes:             s.notes,
          highlights:        s.highlights,
          time_per_question: s.timePerQuestion,
          time_remaining:    s.timeRemaining,
          current_index:     s.currentIndex,
          ...patch,
        })
        .eq('id', sessionId)
    }, 1500)
  }, [sessionId])

  // ── Derived state ─────────────────────────────────────────────────────────
  const currentQuestion   = questions[currentIndex]
  const currentQuestionId = currentQuestion?.id
  const selectedAnswer    = currentQuestionId != null ? (answers[currentQuestionId] ?? null) : null
  const currentEliminated = currentQuestionId != null ? (eliminated[currentQuestionId] || []) : []
  const isMarked          = currentQuestionId != null && marked.includes(currentQuestionId)

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectAnswer = useCallback((choiceIndex) => {
    if (!currentQuestionId) return
    setAnswer(currentQuestionId, choiceIndex)
    scheduleSave()
  }, [currentQuestionId, setAnswer, scheduleSave])

  const handleToggleEliminated = useCallback((choiceIndex) => {
    if (!currentQuestionId) return
    toggleEliminated(currentQuestionId, choiceIndex)
    scheduleSave()
  }, [currentQuestionId, toggleEliminated, scheduleSave])

  const handleMark = useCallback(() => {
    if (!currentQuestionId) return
    toggleMarked(currentQuestionId)
    scheduleSave()
  }, [currentQuestionId, toggleMarked, scheduleSave])

  const goNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      const next = currentIndex + 1
      setCurrentIndex(next)
      scheduleSave({ current_index: next })
      setFocusedChoice(null)
    }
  }, [currentIndex, questions.length, setCurrentIndex, scheduleSave])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      const prev = currentIndex - 1
      setCurrentIndex(prev)
      scheduleSave({ current_index: prev })
      setFocusedChoice(null)
    }
  }, [currentIndex, setCurrentIndex, scheduleSave])

  const handleExpire = useCallback(() => {
    // Timer ran out — auto-submit (wired fully in later steps)
    navigate(`/results/${sessionId}`)
  }, [navigate, sessionId])

  useKeyboardShortcuts({
    onSelectAnswer:    handleSelectAnswer,
    onToggleEliminate: handleToggleEliminated,
    onMark:            handleMark,
    onNext:            goNext,
    onPrev:            goPrev,
    onConfirm:         goNext,
    focusedChoice,
    disabled:          loading,
  })

  // ── Render states ─────────────────────────────────────────────────────────
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
      <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900 gap-4 px-4">
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

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
      <ExamTopBar
        paused={paused}
        onExpire={handleExpire}
        onToggleToolbar={() => setToolbarOpen((v) => !v)}
      />

      {/* Split panel */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <QuestionPanel
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          isMarked={isMarked}
        />
        <AnswerPanel
          question={currentQuestion}
          selectedAnswer={selectedAnswer}
          eliminated={currentEliminated}
          onSelect={handleSelectAnswer}
          onToggleEliminate={handleToggleEliminated}
          focusedChoice={focusedChoice}
          onFocusChoice={setFocusedChoice}
        />
        {/* Toolbar placeholder — wired in Step 6 */}
      </div>

      <QuestionNav
        currentIndex={currentIndex}
        total={questions.length}
        onPrev={goPrev}
        onNext={goNext}
      />
    </div>
  )
}
