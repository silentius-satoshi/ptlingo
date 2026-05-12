import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSessionStore } from '../store/sessionStore'
import { useAuthStore } from '../store/authStore'
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
import OutOfEnergyModal from '../components/gamification/OutOfEnergyModal'
import useGamificationStore from '../stores/gamificationStore'
import StreakBanner from '../components/exam/StreakBanner'
import { AnimatePresence } from 'framer-motion'
import AnswerFeedbackSheet from '../components/drill/AnswerFeedbackSheet'
import QuitWarningModal from '../components/drill/QuitWarningModal'
import MotivationBreak from '../components/drill/MotivationBreak'

// 0-indexed last-question indices for each of the 5 sections in a 225-question exam
const SECTION_END = new Set([44, 89, 134, 179])

const EXAM_DATE_MB = new Date('2026-07-29')

function getMotivationBreak({
  consecutiveCorrect, prevMaxWrong, correctCount, answerHistory, shownBreaks,
  energy, maxEnergy, streak, questionsRemaining, currentSystem, currentIndex, questionsTotal,
}) {
  const totalAnswered = currentIndex + 1
  const accuracy   = totalAnswered > 0 ? correctCount / totalAnswered : 0
  const half       = Math.floor(questionsTotal / 2)
  const quarter    = Math.floor(questionsTotal / 4)
  const threeQ     = Math.floor(questionsTotal * 0.75)
  const daysUntil  = Math.ceil((EXAM_DATE_MB - new Date()) / (1000 * 60 * 60 * 24))
  const last5      = answerHistory.slice(-5)
  const prev5      = answerHistory.slice(-10, -5)
  const last5Acc   = last5.length ? last5.filter(Boolean).length / last5.length : 0
  const prev5Acc   = prev5.length ? prev5.filter(Boolean).length / prev5.length : 0
  const isNeuro    = currentSystem?.toLowerCase().includes('neuro')

  const candidates = [
    { key: 'streak_20',          mood: 'excited',     cond: consecutiveCorrect >= 20,
      msg: 'Perfect 20 — clinic-level performance.' },
    { key: 'perfect_10',         mood: 'celebrating', cond: correctCount === totalAnswered && totalAnswered >= 10,
      msg: `Flawless — ${totalAnswered} questions, zero mistakes.` },
    { key: 'streak_15',          mood: 'excited',     cond: consecutiveCorrect >= 15,
      msg: '15 in a row — unstoppable!' },
    { key: 'streak_10',          mood: 'excited',     cond: consecutiveCorrect >= 10,
      msg: '10 in a row — on fire!' },
    { key: 'neuro_streak',       mood: 'celebrating', cond: isNeuro && consecutiveCorrect >= 3,
      msg: "Neuro is your biggest gap — and you're answering correctly. This is exactly the work." },
    { key: 'streak_7',           mood: 'celebrating', cond: consecutiveCorrect >= 7,
      msg: "7 correct — you're in the zone!" },
    { key: 'accuracy_halfway',   mood: 'encouraging', cond: totalAnswered >= half && accuracy >= 0.9,
      msg: `${Math.round(accuracy * 100)}% accuracy at the halfway point — that's exam-day performance.` },
    { key: 'streak_5',           mood: 'celebrating', cond: consecutiveCorrect >= 5,
      msg: 'Cool! 5 in a row!' },
    { key: 'total_5',            mood: 'encouraging', cond: correctCount >= 5 && consecutiveCorrect < 5,
      msg: "5 questions right — you're building momentum." },
    { key: 'total_10',           mood: 'encouraging', cond: correctCount >= 10 && consecutiveCorrect < 10,
      msg: "10 correct — real progress happening here." },
    { key: 'total_15',           mood: 'celebrating', cond: correctCount >= 15 && consecutiveCorrect < 15,
      msg: "15 right answers — this session is paying off." },
    { key: 'total_20',           mood: 'celebrating', cond: correctCount >= 20 && consecutiveCorrect < 20,
      msg: "20 correct — strong effort throughout." },
    { key: 'total_25',           mood: 'excited',     cond: correctCount >= 25 && consecutiveCorrect < 25,
      msg: "25 correct — elite effort. You earned this." },
    { key: 'clean_energy',       mood: 'celebrating', cond: energy === maxEnergy && totalAnswered >= half,
      msg: 'Not a single energy charge lost — clean session.' },
    { key: 'last_1',             mood: 'encouraging', cond: questionsRemaining === 1,
      msg: "Last one. You've got this." },
    { key: 'last_5',             mood: 'encouraging', cond: questionsRemaining <= 5 && questionsRemaining > 1,
      msg: `${questionsRemaining} questions left — make them count.` },
    { key: 'three_quarters',     mood: 'encouraging', cond: totalAnswered >= threeQ,
      msg: 'Almost there — final push.' },
    { key: 'recovery_strong',    mood: 'surprised',   cond: prevMaxWrong >= 4 && consecutiveCorrect >= 3,
      msg: 'Big comeback — you fought through that.' },
    { key: 'recovery_quick',     mood: 'surprised',   cond: prevMaxWrong >= 2 && consecutiveCorrect >= 2,
      msg: "Back on track — that's real resilience." },
    { key: 'accuracy_climbing',  mood: 'encouraging', cond: last5.length >= 5 && prev5.length >= 5 && last5Acc > prev5Acc + 0.2,
      msg: "You're picking up speed — accuracy is climbing." },
    { key: 'interventions_note', mood: 'encouraging', cond: isNeuro && totalAnswered >= half,
      msg: "You're putting work into your biggest gap. Every correct answer here moves your scale score." },
    { key: 'halfway',            mood: 'encouraging', cond: totalAnswered >= half,
      msg: 'Halfway there — stay focused.' },
    { key: 'exam_three_quarters',mood: 'encouraging', cond: totalAnswered >= threeQ,
      msg: `July 29 is ${daysUntil} days away. Sessions like this one move the needle.` },
    { key: 'streak_milestone',   mood: 'encouraging', cond: streak > 0 && streak % 7 === 0,
      msg: `${Math.floor(streak / 7)} week${streak >= 14 ? 's' : ''} of your streak — consistency compounds.` },
    { key: 'streak_alive',       mood: 'encouraging', cond: streak > 0 && totalAnswered === 1,
      msg: `Day ${streak} of your streak — this session is keeping it alive.` },
    { key: 'low_energy',         mood: 'concerned',   cond: energy <= 8,
      msg: 'Energy running low — finish strong anyway.' },
    { key: 'neuro_recovery',     mood: 'surprised',   cond: isNeuro && prevMaxWrong >= 2 && consecutiveCorrect >= 2,
      msg: "You missed some Neuro questions — that's exactly why you're drilling. Keep going." },
    { key: 'still_standing',     mood: 'encouraging', cond: prevMaxWrong >= 3 && accuracy >= 0.6,
      msg: 'Rough patch behind you — still above passing pace.' },
    { key: 'streak_3',           mood: 'celebrating', cond: consecutiveCorrect >= 3,
      msg: "3 in a row — you're warming up!" },
    { key: 'total_3',            mood: 'encouraging', cond: correctCount >= 3 && consecutiveCorrect < 3,
      msg: "3 correct — you're finding your rhythm." },
    { key: 'quarter',            mood: 'encouraging', cond: totalAnswered >= quarter,
      msg: 'Good start — build on this.' },
    { key: 'total_1',            mood: 'encouraging', cond: correctCount >= 1,
      msg: "First one down — keep going!" },
  ]

  return candidates.find(c => c.cond && !shownBreaks.has(c.key)) ?? null
}

export default function ExamPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const readOnly  = location.state?.readOnly ?? false
  const { user } = useAuthStore()

  // ── Gamification ──────────────────────────────────────────────────────────
  const { awardXP, deductEnergy, advanceMission, refreshSubjectMastery, checkQuestionCountAchievements, advanceStreak, energy, maxEnergy, streak } = useGamificationStore()
  const [showOutOfEnergy, setShowOutOfEnergy]     = useState(false)
  const [showFeedbackSheet, setShowFeedbackSheet] = useState(false)
  const [sheetIsCorrect, setSheetIsCorrect]       = useState(false)
  const [explainMode, setExplainMode]             = useState(false)
  const recentWrongIdsRef = useRef([])

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
  const [showQuitModal, setShowQuitModal]     = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [submitting, setSubmitting]           = useState(false)
  const [pausing, setPausing]                 = useState(false)

  // ── MotivationBreak tracking ───────────────────────────────────────────────
  const [showMotivation, setShowMotivation] = useState(false)
  const [motivationData, setMotivationData] = useState(null)
  const consecutiveCorrectRef = useRef(0)
  const prevMaxWrongRef       = useRef(0)
  const consecutiveWrongRef   = useRef(0)
  const answerHistoryRef      = useRef([])
  const shownBreaksRef        = useRef(new Set())

  const saveTimeoutRef     = useRef(null)
  const notesSaveRef       = useRef({})
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
    correctStreak,
    incrementStreak,
    resetStreak,
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

        // Already submitted — send straight to results (skip in readOnly review mode)
        if (session.status === 'submitted' && !readOnly) {
          navigate(`/results/${sessionId}`, { replace: true })
          return
        }

        // Resuming a paused session — flip back to in_progress (skip in readOnly)
        if (session.status === 'paused' && !readOnly) {
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

        // Merge notes table entries (more up-to-date than session JSONB)
        let mergedNotes = session.notes ?? {}
        if (session.question_ids?.length > 0 && user?.id) {
          const { data: notesRows } = await supabase
            .from('notes')
            .select('question_id, content')
            .eq('user_id', user.id)
            .in('question_id', session.question_ids)
          if (notesRows?.length > 0) {
            mergedNotes = { ...mergedNotes }
            notesRows.forEach((r) => { if (r.content) mergedNotes[r.question_id] = r.content })
          }
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
          notes:           mergedNotes,
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
      Object.values(notesSaveRef.current).forEach(clearTimeout)
      notesSaveRef.current = {}
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

  // ── Debounced notes-table upsert ───────────────────────────────────────────
  const scheduleNoteSave = useCallback((questionId, text) => {
    if (!user?.id || !questionId) return
    if (notesSaveRef.current[questionId]) clearTimeout(notesSaveRef.current[questionId])
    notesSaveRef.current[questionId] = setTimeout(async () => {
      await supabase
        .from('notes')
        .upsert(
          { user_id: user.id, question_id: questionId, content: text },
          { onConflict: 'user_id,question_id' },
        )
      delete notesSaveRef.current[questionId]
    }, 1000)
  }, [user?.id])

  // ── Derived state ──────────────────────────────────────────────────────────
  const currentQuestion   = questions[currentIndex]
  const currentQuestionId = currentQuestion?.id
  const selectedAnswer    = currentQuestionId != null ? (answers[currentQuestionId]    ?? null) : null
  const currentEliminated = currentQuestionId != null ? (eliminated[currentQuestionId] || [])   : []
  const currentNote       = currentQuestionId != null ? (notes[currentQuestionId]      || '')   : ''
  const isMarked          = currentQuestionId != null && marked.includes(currentQuestionId)
  const questionsRemaining = questions.length - currentIndex - 1
  const correctCount       = questions.filter(q => answers[q.id] != null && answers[q.id] === q.correct_index).length

  // ── Action handlers ────────────────────────────────────────────────────────
  // In quiz mode the answer locks once selected (rationale immediately revealed)
  const rationaleVisible = readOnly || explainMode

  const handleSelectAnswer = useCallback((i) => {
    if (!currentQuestionId) return
    if (readOnly) return
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
    // Quiz-mode gamification: XP for correct, heart deduction for wrong
    if (type === 'quiz' && !readOnly) {
      const q = questions.find((q) => q.id === currentQuestionId)
      if (q) {
        const isCorrect = i === q.correct_index
        if (isCorrect) {
          awardXP(10, 'Correct answer')
          advanceMission('questions', q.subject)
          incrementStreak()
          consecutiveCorrectRef.current += 1
          consecutiveWrongRef.current = 0
          answerHistoryRef.current = [...answerHistoryRef.current.slice(-9), true]
        } else {
          resetStreak()
          recentWrongIdsRef.current = [currentQuestionId, ...recentWrongIdsRef.current].slice(0, 3)
          deductEnergy()
          const newEnergy = useGamificationStore.getState().energy
          if (newEnergy <= 0) setShowOutOfEnergy(true)
          consecutiveWrongRef.current += 1
          prevMaxWrongRef.current = Math.max(prevMaxWrongRef.current, consecutiveWrongRef.current)
          consecutiveCorrectRef.current = 0
          answerHistoryRef.current = [...answerHistoryRef.current.slice(-9), false]
        }
        setSheetIsCorrect(isCorrect)
        setShowFeedbackSheet(true)
      }
    }
    scheduleSave()
  }, [currentQuestionId, type, selectedAnswer, setAnswer, scheduleSave, questions, awardXP, advanceMission, deductEnergy, incrementStreak, resetStreak])

  // Reset sheet + explain state whenever the question changes
  useEffect(() => {
    setShowFeedbackSheet(false)
    setExplainMode(false)
  }, [currentQuestionId])

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
    scheduleNoteSave(currentQuestionId, text)
  }, [currentQuestionId, setNote, scheduleSave, scheduleNoteSave])

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
    if (!readOnly && type === 'exam' && questions.length === 225 && SECTION_END.has(currentIndex)) {
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

  // Set activeSystem once when questions first load
  useEffect(() => {
    if (questions.length > 0 && currentQuestion?.subject) {
      useGamificationStore.setState({ activeSystem: currentQuestion.subject })
    }
  }, [questions.length]) // eslint-disable-line react-hooks/exhaustive-deps

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

      // Award XP for completing session
      const xpAmount = type === 'exam' ? 100 : 25
      await awardXP(xpAmount, type === 'exam' ? 'Mock Exam complete' : 'Quiz complete')

      // Refresh mastery + check question count achievements
      await refreshSubjectMastery()
      await checkQuestionCountAchievements()
      await advanceStreak()

      navigate(`/results/${sessionId}`)
    } catch (err) {
      console.error('Submit error:', err)
    } finally {
      setSubmitting(false)
    }
  }, [questions, sessionId, navigate, type, awardXP, refreshSubjectMastery, checkQuestionCountAchievements, advanceStreak])

  const handleSheetContinue = useCallback(() => {
    setShowFeedbackSheet(false)
    if (type === 'quiz' && !readOnly) {
      const breakData = getMotivationBreak({
        consecutiveCorrect: consecutiveCorrectRef.current,
        prevMaxWrong:       prevMaxWrongRef.current,
        correctCount,
        answerHistory:      answerHistoryRef.current,
        shownBreaks:        shownBreaksRef.current,
        energy, maxEnergy, streak,
        questionsRemaining,
        currentSystem:      currentQuestion?.subject,
        currentIndex,
        questionsTotal:     questions.length,
      })
      if (breakData) {
        shownBreaksRef.current = new Set([...shownBreaksRef.current, breakData.key])
        setMotivationData(breakData)
        setShowMotivation(true)
        return
      }
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      handleSubmit()
    }
  }, [currentIndex, questions.length, setCurrentIndex, handleSubmit,
      type, readOnly, correctCount, energy, maxEnergy, streak,
      questionsRemaining, currentQuestion])

  const handleMotivationContinue = useCallback(() => {
    setShowMotivation(false)
    setMotivationData(null)
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      handleSubmit()
    }
  }, [currentIndex, questions.length, setCurrentIndex, handleSubmit])

  const handleSheetExplain = useCallback(async () => {
    setShowFeedbackSheet(false)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    const s = useSessionStore.getState()
    await supabase.from('sessions').update({
      answers:           s.answers,
      marked:            s.marked,
      eliminated:        s.eliminated,
      notes:             s.notes,
      highlights:        s.highlights,
      time_per_question: s.timePerQuestion,
      time_remaining:    s.timeRemaining,
      current_index:     s.currentIndex,
    }).eq('id', sessionId)
    navigate('/rationale', {
      state: {
        question:       currentQuestion,
        selectedAnswer,
        systemName:     currentQuestion?.subject,
        sessionId,
        currentIndex,
        totalQuestions: questions.length,
      },
    })
  }, [sessionId, currentQuestion, selectedAnswer, currentIndex, questions.length, navigate])

  const handleReviewExplanation = useCallback(async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    const s = useSessionStore.getState()
    await supabase.from('sessions').update({
      answers:           s.answers,
      marked:            s.marked,
      eliminated:        s.eliminated,
      notes:             s.notes,
      highlights:        s.highlights,
      time_per_question: s.timePerQuestion,
      time_remaining:    s.timeRemaining,
      current_index:     s.currentIndex,
    }).eq('id', sessionId)
    navigate('/rationale', {
      state: {
        question:       currentQuestion,
        selectedAnswer,
        systemName:     currentQuestion?.subject,
        sessionId,
        currentIndex,
        totalQuestions: questions.length,
      },
    })
  }, [sessionId, currentQuestion, selectedAnswer, currentIndex, questions.length, navigate])

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
      {/* Out of energy modal — quiz mode only */}
      {showOutOfEnergy && type === 'quiz' && !readOnly && (
        <OutOfEnergyModal
          onKeepGoing={() => setShowOutOfEnergy(false)}
          onEndSession={() => { setShowOutOfEnergy(false); navigate('/') }}
        />
      )}

      {/* Motivation break interstitial — quiz mode only, z-30 */}
      {showMotivation && motivationData && type === 'quiz' && (
        <MotivationBreak
          currentSystem={currentQuestion?.subject}
          message={motivationData.msg}
          mood={motivationData.mood}
          onContinue={handleMotivationContinue}
          progressPct={(currentIndex / questions.length) * 100}
          energy={energy}
          maxEnergy={maxEnergy}
        />
      )}

      <ExamTopBar
        onExpire={handleExpire}
        onToggleToolbar={() => setToolbarExpanded((v) => !v)}
        paused={breakState === 'mandatory' || readOnly}
        readOnly={readOnly}
        onBack={() => {
          const questionsRemaining = questions.length - currentIndex - 1
          if (type === 'quiz' && questionsRemaining > 0) {
            setShowQuitModal(true)
          } else {
            navigate(-1)
          }
        }}
        type={type}
        currentIndex={currentIndex}
        questionsTotal={questions.length}
        currentSystem={currentQuestion?.subject}
        energy={energy}
        maxEnergy={maxEnergy}
      />

      {type === 'quiz' && !readOnly && (
        <StreakBanner correctStreak={correctStreak} />
      )}

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
                <>
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
                  {type === 'quiz' && !readOnly && selectedAnswer !== null && currentQuestion &&
                    selectedAnswer !== currentQuestion.correct_index && (
                    <div className="flex justify-center py-4">
                      <button
                        onClick={handleReviewExplanation}
                        className="flex items-center gap-1 text-[13px] text-white/40 hover:text-white/70 transition-colors"
                      >
                        Review Explanation
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </>
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
              onEnd={() => {
                const questionsRemaining = questions.length - currentIndex - 1
                if (type === 'quiz' && questionsRemaining > 0) {
                  setShowQuitModal(true)
                } else {
                  setShowEndModal(true)
                }
              }}
              readOnly={readOnly}
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

      {/* Block all interaction behind the sheet while it's visible */}
      {type === 'quiz' && showFeedbackSheet && (
        <div className="fixed inset-0 z-40" style={{ pointerEvents: 'all' }} />
      )}

      <AnswerFeedbackSheet
        visible={type === 'quiz' && showFeedbackSheet}
        isCorrect={sheetIsCorrect}
        correctAnswerText={
          currentQuestion
            ? currentQuestion.choices?.[currentQuestion.correct_index]
            : ''
        }
        onContinue={handleSheetContinue}
        onExplain={handleSheetExplain}
      />

      <QuitWarningModal
        isOpen={showQuitModal}
        currentSystem={currentQuestion?.subject}
        questionsAnswered={Object.keys(answers).length}
        questionsRemaining={questionsRemaining}
        correctCount={correctCount}
        streak={streak}
        onKeepGoing={() => setShowQuitModal(false)}
        onQuit={() => { deductEnergy(); navigate('/') }}
      />
    </div>
  )
}
