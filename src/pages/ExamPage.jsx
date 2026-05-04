import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSessionStore } from '../store/sessionStore'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import ExamTopBar from '../components/layout/ExamTopBar'
import QuestionPanel from '../components/exam/QuestionPanel'
import AnswerPanel from '../components/exam/AnswerPanel'
import QuestionNav from '../components/exam/QuestionNav'
import ExamToolbar from '../components/toolbar/ExamToolbar'
import ProgressGrid from '../components/toolbar/ProgressGrid'
import Calculator from '../components/toolbar/Calculator'
import NotesPanel from '../components/toolbar/NotesPanel'
import Modal from '../components/shared/Modal'
import Button from '../components/shared/Button'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import BreakScreen from '../components/exam/BreakScreen'
import RationalePanel from '../components/exam/RationalePanel'

// 0-indexed last-question indices for each of the 5 sections in a 225-question exam
const SECTION_END = new Set([44, 89, 134, 179])

export default function ExamPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // ── Loading / error ────────────────────────────────────────────────────────
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [questions, setQuestions] = useState([])

  // ── Toolbar / UI ───────────────────────────────────────────────────────────
  const [toolbarExpanded, setToolbarExpanded] = useState(false)
  const [toolbarPanel, setToolbarPanel]       = useState(null)
  const [highlightMode, setHighlightMode]     = useState(false)
  const [focusedChoice, setFocusedChoice]     = useState(null)

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [showPauseModal, setShowPauseModal]   = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showEndModal, setShowEndModal]       = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [submitting, setSubmitting]           = useState(false)
  const [pausing, setPausing]                 = useState(false)

  const saveTimeoutRef     = useRef(null)
  const prevQuestionIdRef  = useRef(null)
  const questionStartRef   = useRef(null)

  // ── Break state ────────────────────────────────────────────────────────────
  // 'offer'     → optional break offer modal (sections 1, 3, 4)
  // 'optional'  → on optional break screen (exam timer still runs)
  // 'mandatory' → on mandatory break screen (exam timer paused)
  const [breakState, setBreakState]       = useState(null)
  const [breakSection, setBreakSection]   = useState(null)
  const [breakTimeLeft, setBreakTimeLeft] = useState(0)
  const breakResumeIndexRef               = useRef(null)

  // ── Store ──────────────────────────────────────────────────────────────────
  const {
    currentIndex,
    answers,
    marked,
    eliminated,
    notes,
    highlights,
    timeRemaining,
    timePerQuestion,
    type,
    setSession,
    setCurrentIndex,
    setAnswer,
    toggleMarked,
    toggleEliminated,
    setNote,
    setHighlights,
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

        // Already submitted — send straight to results
        if (session.status === 'submitted') {
          navigate(`/results/${sessionId}`, { replace: true })
          return
        }

        // Resuming a paused session — flip back to in_progress
        if (session.status === 'paused') {
          await supabase
            .from('sessions')
            .update({ status: 'in_progress' })
            .eq('id', sessionId)
        }

        if (session.question_ids?.length > 0) {
          const { data: qs, error: qErr } = await supabase
            .from('questions')
            .select('*')
            .in('id', session.question_ids)

          if (qErr) throw qErr

          const qMap = Object.fromEntries((qs || []).map((q) => [q.id, q]))
          const ordered = session.question_ids.map((id) => qMap[id]).filter(Boolean)
          setQuestions(ordered)
        }

        setSession({
          sessionId:       session.id,
          type:            session.type,
          mode:            session.mode,
          timeMultiplier:  session.time_multiplier,
          currentIndex:    location.state?.goToIndex ?? (session.current_index ?? 0),
          answers:         session.answers           ?? {},
          marked:          session.marked             ?? [],
          eliminated:      session.eliminated         ?? {},
          highlights:      session.highlights         ?? {},
          notes:           session.notes              ?? {},
          timePerQuestion: session.time_per_question  ?? {},
          timeRemaining:   session.time_remaining     ?? 0,
          status:          'in_progress',
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

  // ── Debounced save ─────────────────────────────────────────────────────────
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

  // ── Derived state ──────────────────────────────────────────────────────────
  const currentQuestion   = questions[currentIndex]
  const currentQuestionId = currentQuestion?.id
  const selectedAnswer    = currentQuestionId != null ? (answers[currentQuestionId]    ?? null) : null
  const currentEliminated = currentQuestionId != null ? (eliminated[currentQuestionId] || [])   : []
  const currentNote       = currentQuestionId != null ? (notes[currentQuestionId]      || '')   : ''
  const isMarked          = currentQuestionId != null && marked.includes(currentQuestionId)

  // ── Action handlers ────────────────────────────────────────────────────────
  // In quiz mode the answer locks once selected (rationale immediately revealed)
  const rationaleVisible = type === 'quiz' && selectedAnswer !== null

  const handleSelectAnswer = useCallback((i) => {
    if (!currentQuestionId) return
    if (type === 'quiz' && selectedAnswer !== null) return  // locked after first pick
    setAnswer(currentQuestionId, i)
    // In quiz mode: snapshot elapsed time immediately so the rationale panel
    // can show "time spent" without waiting for navigation away.
    if (type === 'quiz' && questionStartRef.current !== null) {
      const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000)
      const s = useSessionStore.getState()
      s.setTimePerQuestion(currentQuestionId, (s.timePerQuestion[currentQuestionId] || 0) + elapsed)
      questionStartRef.current = Date.now() // reset so navigation doesn't double-count
    }
    scheduleSave()
  }, [currentQuestionId, type, selectedAnswer, setAnswer, scheduleSave])

  const handleToggleEliminated = useCallback((i) => {
    if (!currentQuestionId) return
    if (i === selectedAnswer) return
    toggleEliminated(currentQuestionId, i)
    scheduleSave()
  }, [currentQuestionId, selectedAnswer, toggleEliminated, scheduleSave])

  const handleMark = useCallback(() => {
    if (!currentQuestionId) return
    toggleMarked(currentQuestionId)
    scheduleSave()
  }, [currentQuestionId, toggleMarked, scheduleSave])

  const handleNoteChange = useCallback((text) => {
    if (!currentQuestionId) return
    setNote(currentQuestionId, text)
    scheduleSave()
  }, [currentQuestionId, setNote, scheduleSave])

  const handleAddHighlight = useCallback(({ start, end }) => {
    if (!currentQuestionId) return
    const current = highlights[currentQuestionId] || []
    setHighlights(currentQuestionId, [...current, { start, end }])
    scheduleSave()
  }, [currentQuestionId, highlights, setHighlights, scheduleSave])

  const handleRemoveHighlight = useCallback((idx) => {
    if (!currentQuestionId) return
    const current = highlights[currentQuestionId] || []
    const updated = idx === 'all' ? [] : current.filter((_, i) => i !== idx)
    setHighlights(currentQuestionId, updated)
    scheduleSave()
  }, [currentQuestionId, highlights, setHighlights, scheduleSave])

  const goTo = useCallback((index) => {
    setCurrentIndex(index)
    scheduleSave({ current_index: index })
    setFocusedChoice(null)
    setToolbarPanel((p) => p === 'progress' ? null : p)
  }, [setCurrentIndex, scheduleSave])

  const goNext = useCallback(() => {
    if (currentIndex >= questions.length - 1) return
    // Trigger section breaks only in full mock-exam mode
    if (type === 'exam' && questions.length === 225 && SECTION_END.has(currentIndex)) {
      const sec = (currentIndex + 1) / 45  // 1 | 2 | 3 | 4
      breakResumeIndexRef.current = currentIndex + 1
      setBreakSection(sec)
      if (sec === 2) {
        setBreakTimeLeft(15 * 60)
        setBreakState('mandatory')
      } else {
        setBreakState('offer')
      }
      return
    }
    goTo(currentIndex + 1)
  }, [currentIndex, questions.length, type, goTo]) // eslint-disable-line react-hooks/exhaustive-deps

  const goPrev = useCallback(() => {
    if (currentIndex > 0) goTo(currentIndex - 1)
  }, [currentIndex, goTo])

  // ── Break helpers ──────────────────────────────────────────────────────────
  const resumeFromBreak = useCallback(() => {
    setBreakState(null)
    setBreakSection(null)
    const idx = breakResumeIndexRef.current
    breakResumeIndexRef.current = null
    if (idx != null) goTo(idx)
  }, [goTo])

  // Tick the mandatory break countdown
  useEffect(() => {
    if (breakState !== 'mandatory') return
    const id = setInterval(() => setBreakTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [breakState])

  // Auto-resume when mandatory break countdown expires
  useEffect(() => {
    if (breakState === 'mandatory' && breakTimeLeft === 0) resumeFromBreak()
  }, [breakState, breakTimeLeft, resumeFromBreak])

  // ── Per-question time tracking ─────────────────────────────────────────────
  // Fires when the visible question changes: saves elapsed time for the previous
  // question and starts the clock for the new one.
  useEffect(() => {
    if (loading || !currentQuestionId) return
    if (prevQuestionIdRef.current && questionStartRef.current) {
      const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000)
      const s = useSessionStore.getState()
      s.setTimePerQuestion(
        prevQuestionIdRef.current,
        (s.timePerQuestion[prevQuestionIdRef.current] || 0) + elapsed,
      )
    }
    prevQuestionIdRef.current = currentQuestionId
    questionStartRef.current  = Date.now()
  }, [currentQuestionId, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pause: save state + redirect to submissions ────────────────────────────
  const handleConfirmPause = useCallback(async () => {
    setPausing(true)
    try {
      // Flush any pending debounced save immediately
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      const s = useSessionStore.getState()
      await supabase
        .from('sessions')
        .update({
          status:            'paused',
          answers:           s.answers,
          marked:            s.marked,
          eliminated:        s.eliminated,
          notes:             s.notes,
          highlights:        s.highlights,
          time_per_question: s.timePerQuestion,
          time_remaining:    s.timeRemaining,   // snapshot live timer value
          current_index:     s.currentIndex,
        })
        .eq('id', sessionId)

      navigate('/submissions')
    } catch (err) {
      console.error('Pause error:', err)
      setPausing(false)
    }
  }, [sessionId, navigate])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    try {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      const s = useSessionStore.getState()
      const correct = questions.filter((q) => s.answers[q.id] === q.correct_index).length
      const score   = questions.length > 0 ? correct / questions.length : 0

      await supabase
        .from('sessions')
        .update({
          status:            'submitted',
          score,
          submitted_at:      new Date().toISOString(),
          answers:           s.answers,
          marked:            s.marked,
          eliminated:        s.eliminated,
          notes:             s.notes,
          highlights:        s.highlights,
          time_per_question: s.timePerQuestion,
          time_remaining:    s.timeRemaining,
          current_index:     s.currentIndex,
        })
        .eq('id', sessionId)

      navigate(`/results/${sessionId}`)
    } catch (err) {
      console.error('Submit error:', err)
    } finally {
      setSubmitting(false)
    }
  }, [questions, sessionId, navigate])

  const handleExpire = useCallback(() => handleSubmit(), [handleSubmit])

  // ── Navigate to review screen (exam mode) — flush save first ───────────────
  const handleGoToReview = useCallback(async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
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
      })
      .eq('id', sessionId)
    navigate(`/review/${sessionId}`)
  }, [sessionId, navigate])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useKeyboardShortcuts({
    onSelectAnswer:    handleSelectAnswer,
    onToggleEliminate: handleToggleEliminated,
    onMark:            handleMark,
    onNext:            goNext,
    onPrev:            goPrev,
    onConfirm:         goNext,
    focusedChoice,
    disabled:          loading || breakState !== null,
  })

  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length

  const formattedTime = (() => {
    const t = Math.max(0, timeRemaining)
    const h = Math.floor(t / 3600)
    const m = Math.floor((t % 3600) / 60)
    const s = t % 60
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
  })()

  // ── Render ─────────────────────────────────────────────────────────────────
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
        <button onClick={() => navigate(-1)} className="text-teal-600 dark:text-teal-400 text-sm hover:underline">
          ← Go back
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
      <ExamTopBar
        onExpire={handleExpire}
        onToggleToolbar={() => setToolbarExpanded((v) => !v)}
        paused={breakState === 'mandatory'}
      />

      <div className="flex-1 flex overflow-hidden">
        {breakState === 'mandatory' || breakState === 'optional' ? (
          <BreakScreen
            section={breakSection}
            mandatory={breakState === 'mandatory'}
            breakTimeLeft={breakTimeLeft}
            examFormatted={formattedTime}
            onResume={resumeFromBreak}
          />
        ) : (
          <>
            {/* Single scrollable center column */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {rationaleVisible ? (
                <>
                  <div className="flex border-b border-slate-200 dark:border-slate-700">
                    <QuestionPanel
                      question={currentQuestion}
                      questionNumber={currentIndex + 1}
                      totalQuestions={questions.length}
                      isMarked={isMarked}
                      highlightMode={highlightMode}
                      highlights={highlights[currentQuestionId] || []}
                      onAddHighlight={handleAddHighlight}
                      onRemoveHighlight={handleRemoveHighlight}
                    />
                    <AnswerPanel
                      question={currentQuestion}
                      selectedAnswer={selectedAnswer}
                      eliminated={currentEliminated}
                      onSelect={handleSelectAnswer}
                      onToggleEliminate={handleToggleEliminated}
                      focusedChoice={focusedChoice}
                      onFocusChoice={setFocusedChoice}
                      rationaleVisible={rationaleVisible}
                    />
                  </div>
                  <RationalePanel question={currentQuestion} selectedAnswer={selectedAnswer} />
                </>
              ) : (
                <div className="flex min-h-full">
                  <QuestionPanel
                    question={currentQuestion}
                    questionNumber={currentIndex + 1}
                    totalQuestions={questions.length}
                    isMarked={isMarked}
                    highlightMode={highlightMode}
                    highlights={highlights[currentQuestionId] || []}
                    onAddHighlight={handleAddHighlight}
                    onRemoveHighlight={handleRemoveHighlight}
                  />
                  <AnswerPanel
                    question={currentQuestion}
                    selectedAnswer={selectedAnswer}
                    eliminated={currentEliminated}
                    onSelect={handleSelectAnswer}
                    onToggleEliminate={handleToggleEliminated}
                    focusedChoice={focusedChoice}
                    onFocusChoice={setFocusedChoice}
                    rationaleVisible={false}
                  />
                </div>
              )}
            </div>

            {/* Toolbar panel (progress / calculator / notes) */}
            {toolbarPanel && (
              <div className="flex-shrink-0 w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
                {toolbarPanel === 'progress' && (
                  <ProgressGrid
                    questions={questions}
                    answers={answers}
                    marked={marked}
                    currentIndex={currentIndex}
                    onJump={goTo}
                  />
                )}
                {toolbarPanel === 'calculator' && <Calculator />}
                {toolbarPanel === 'notes' && (
                  <NotesPanel
                    questionNumber={currentIndex + 1}
                    note={currentNote}
                    onChange={handleNoteChange}
                  />
                )}
              </div>
            )}

            <ExamToolbar
              expanded={toolbarExpanded}
              activePanel={toolbarPanel}
              onSetPanel={setToolbarPanel}
              isMarked={isMarked}
              onMark={handleMark}
              highlightMode={highlightMode}
              onToggleHighlight={() => setHighlightMode((v) => !v)}
              onPause={() => setShowPauseModal(true)}
              onSubmit={type === 'exam' ? handleGoToReview : () => setShowSubmitModal(true)}
              onEnd={() => setShowEndModal(true)}
              onReport={() => setShowReportModal(true)}
            />
          </>
        )}
      </div>

      {!breakState && (
        <QuestionNav
          currentIndex={currentIndex}
          total={questions.length}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}

      {/* ── Section complete — optional break offer ── */}
      <Modal
        open={breakState === 'offer'}
        onClose={() => {}}
        title={`Section ${breakSection} of 5 Complete`}
      >
        <div className="flex items-center justify-center py-4 mb-3 rounded-xl bg-slate-50 dark:bg-slate-800">
          <span className="font-mono text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400 tracking-wide">
            {formattedTime}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
          You may take a short break before continuing to Section {breakSection + 1}.
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-5">
          The exam timer will keep running during any break.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            variant="secondary"
            onClick={() => setBreakState('optional')}
          >
            Take a Break
          </Button>
          <Button
            onClick={() => {
              setBreakState(null)
              setBreakSection(null)
              const idx = breakResumeIndexRef.current
              breakResumeIndexRef.current = null
              if (idx != null) goTo(idx)
            }}
          >
            Continue Exam
          </Button>
        </div>
      </Modal>

      {/* ── Pause confirmation — timer keeps running while this is open ── */}
      <Modal
        open={showPauseModal}
        onClose={() => !pausing && setShowPauseModal(false)}
        title="Pause Session?"
      >
        <div className="flex items-center justify-center py-4 mb-3 rounded-xl bg-slate-50 dark:bg-slate-800">
          <span className="font-mono text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400 tracking-wide">
            {formattedTime}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          Once you confirm, your progress will be saved and you'll be redirected
          to your Submissions page.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
          Resume any time from{' '}
          <span className="font-semibold text-slate-800 dark:text-white">Submissions</span>
          {' '}— the exam will pick up exactly where you left off.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={() => setShowPauseModal(false)} disabled={pausing}>
            Keep Going
          </Button>
          <Button
            onClick={handleConfirmPause}
            disabled={pausing}
            className="bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500"
          >
            {pausing ? 'Saving…' : 'Pause Exam'}
          </Button>
        </div>
      </Modal>

      {/* Submit confirmation */}
      <Modal
        open={showSubmitModal}
        onClose={() => !submitting && setShowSubmitModal(false)}
        title="Submit Exam?"
      >
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
          You've answered{' '}
          <span className="font-semibold text-slate-800 dark:text-white">{answeredCount}</span>
          {' '}of{' '}
          <span className="font-semibold text-slate-800 dark:text-white">{questions.length}</span>
          {' '}questions.
        </p>
        {marked.length > 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
            {marked.length} question{marked.length > 1 ? 's are' : ' is'} marked for review.
          </p>
        )}
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 mt-3">
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

      {/* End session */}
      <Modal
        open={showEndModal}
        onClose={() => setShowEndModal(false)}
        title="End Session?"
      >
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
          Your progress will be saved and you can resume from Submissions later.
          The session will remain in progress.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setShowEndModal(false)}>
            Keep Going
          </Button>
          <Button variant="danger" onClick={() => navigate('/')}>
            End Session
          </Button>
        </div>
      </Modal>

      {/* Report question */}
      <Modal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Report Question"
      >
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Flag question {currentIndex + 1} for review by the content team. Reports are anonymous.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setShowReportModal(false)}>Cancel</Button>
          <Button onClick={() => setShowReportModal(false)}>Submit Report</Button>
        </div>
      </Modal>
    </div>
  )
}
