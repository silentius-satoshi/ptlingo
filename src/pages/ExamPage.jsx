import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
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
import CasualQuizView from '../components/exam/CasualQuizView'
import MobilePanelSheet from '../components/exam/MobilePanelSheet'
import PostSessionFlow from '../components/exam/PostSessionFlow'
import ProfileGate from '../components/exam/ProfileGate'
import { calculateNextReview } from '../lib/spacedRepetition'
import { deadlineFromSeconds, secondsFromDeadline } from '../hooks/useTimer'
import { deriveSectionEnds, boundsForIndex, isOutOfBounds } from '../lib/sectionBounds'
import { changeLogKey, mergeChangeLogs } from '../lib/changeLog'

// The answer-change log's system of record is sessions.answer_changes in
// Supabase. localStorage is kept as a redundant local mirror — it costs one
// synchronous write per change and it is the only copy that survives a network
// failure, so on load we take whichever log is longer.
function readAnswerChangeLog(sessionId) {
  try {
    const raw = localStorage.getItem(changeLogKey(sessionId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getMotivationBreak({
  consecutiveCorrect, prevMaxWrong, correctCount, answerHistory, shownBreaks,
  energy, maxEnergy, streak, questionsRemaining, currentSystem, currentIndex, questionsTotal,
}) {
  const totalAnswered = currentIndex + 1
  const accuracy   = totalAnswered > 0 ? correctCount / totalAnswered : 0
  const half       = Math.floor(questionsTotal / 2)
  const quarter    = Math.floor(questionsTotal / 4)
  const threeQ     = Math.floor(questionsTotal * 0.75)
  const daysUntil  = Math.ceil((new Date(useAuthStore.getState().examDate ?? '2026-07-29') - new Date()) / (1000 * 60 * 60 * 24))
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
  const readOnly      = location.state?.readOnly ?? false
  const isPathSession = location.state?.source === 'path'
  const pathSubject   = location.state?.subject ?? null
  const isDemo        = new URLSearchParams(location.search).get('demo') === 'true'
  const { user } = useAuthStore()
  const isAnonymous = useAuthStore(s => s.isAnonymous)

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
  const [mobileSheet,  setMobileSheet]        = useState(null)
  const [highlightMode, setHighlightMode]     = useState(false)
  const [focusedChoice, setFocusedChoice]     = useState(null)

  // ── Post-session flow ─────────────────────────────────────────────────────
  const [showPostFlow,    setShowPostFlow]    = useState(false)
  const [postFlowData,    setPostFlowData]    = useState(null)
  const [showProfileGate, setShowProfileGate] = useState(false)
  const [profileGateData, setProfileGateData] = useState(null)

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
    answerChanges,
    logAnswerChange,
  } = useSessionStore()

  // Section boundaries come from the loaded form, not from index arithmetic.
  const sectionEnds = useMemo(() => deriveSectionEnds(questions), [questions])

  const quizMode = localStorage.getItem('ptlingo_quiz_mode') ?? 'standard'
  const isCasual = quizMode === 'ptlingo' && type === 'quiz' && !readOnly

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

        // Resuming a paused session — flip back to in_progress (skip in readOnly).
        // The clock restarts NOW, so re-anchor deadline_at in the same write.
        // Without it the row keeps the null written at pause until some user
        // action trips the debounced save, and a reload before that action
        // refunds every second spent reading since the resume.
        if (session.status === 'paused' && !readOnly) {
          await supabase
            .from('sessions')
            .update({
              status:      'in_progress',
              deadline_at: deadlineFromSeconds(session.time_remaining ?? 0),
            })
            .eq('id', sessionId)
        }

        let ordered = []
        if (session.question_ids?.length > 0) {
          const { data: qs, error: qErr } = await supabase
            .from('questions')
            .select('*')
            .in('id', session.question_ids)
            .eq('quarantined', false)

          if (qErr) throw qErr

          const qMap = Object.fromEntries((qs || []).map((q) => [q.id, q]))
          ordered = session.question_ids.map((id) => qMap[id]).filter(Boolean)
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

        // Prefer the persisted absolute deadline over the last-saved remaining
        // seconds. time_remaining is only ever as fresh as the last autosave,
        // so a crash or a reload mid-section would otherwise refund every
        // second since that save. A deadline already in the past is a real
        // zero — the block expired while the tab was shut — not a reason to
        // fall back to a stale count. deadline_at is null whenever the clock is
        // legitimately stopped (paused session, mandatory break, submitted),
        // and that is exactly when time_remaining is the right answer.
        const fromDeadline   = readOnly ? null : secondsFromDeadline(session.deadline_at)
        const resumedSeconds = fromDeadline ?? (session.time_remaining ?? 0)

        // An incoming goToIndex (the in-exam Review screen's "Go to Question")
        // writes currentIndex directly, bypassing goTo and its section guard.
        // Clamp it to the section the candidate was actually in, so no producer
        // of this navigation state can walk them across a boundary.
        const savedIndex   = session.current_index ?? 0
        const requested    = location.state?.goToIndex
        const resumeBounds = session.type === 'exam' && !readOnly
          ? boundsForIndex(deriveSectionEnds(ordered), savedIndex, ordered.length)
          : null
        const startIndex = requested == null || isOutOfBounds(resumeBounds, requested)
          ? savedIndex
          : requested

        setSession({
          sessionId:       session.id,
          type:            session.type,
          mode:            session.mode,
          timeMultiplier:  session.time_multiplier,
          currentIndex:    startIndex,
          answers:         session.answers           ?? {},
          marked:          session.marked             ?? [],
          eliminated:      session.eliminated         ?? {},
          highlights:      session.highlights         ?? {},
          notes:           mergedNotes,
          timePerQuestion: session.time_per_question  ?? {},
          timeRemaining:   resumedSeconds,
          status:          'in_progress',
          answerChanges:   mergeChangeLogs(readAnswerChangeLog(sessionId), session.answer_changes),
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

  // Whether the exam clock is currently running. Held in a ref rather than read
  // from state so that examSnapshot keeps a stable identity and does not
  // perturb the dependency arrays of every handler that persists.
  const clockPausedRef = useRef(false)
  useEffect(() => {
    clockPausedRef.current = breakState === 'mandatory' || readOnly
  }, [breakState, readOnly])

  // ── One payload shape for every persistence point ──────────────────────────
  // Six call sites used to build this object by hand. That is precisely how a
  // column goes missing from one of them and a whole measure quietly stops
  // being recorded. `extra` is spread last so a caller can override any field —
  // notably deadline_at, which must be null wherever the clock stops.
  const examSnapshot = useCallback((extra = {}) => {
    const s = useSessionStore.getState()
    return {
      answers:           s.answers,
      marked:            s.marked,
      eliminated:        s.eliminated,
      notes:             s.notes,
      highlights:        s.highlights,
      time_per_question: s.timePerQuestion,
      time_remaining:    s.timeRemaining,
      current_index:     s.currentIndex,
      answer_changes:    s.answerChanges ?? [],
      deadline_at:       clockPausedRef.current ? null : deadlineFromSeconds(s.timeRemaining),
      ...extra,
    }
  }, [])

  // ── Debounced save ─────────────────────────────────────────────────────────
  const scheduleSave = useCallback((patch = {}) => {
    if (!sessionId) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      await supabase
        .from('sessions')
        .update(examSnapshot(patch))
        .eq('id', sessionId)
    }, 1500)
  }, [sessionId, examSnapshot])

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

  // ── Spaced repetition upsert (fire-and-forget) ─────────────────────────────
  const upsertReview = useCallback((questionId, wasCorrect) => {
    if (!user?.id) return
    supabase
      .from('question_reviews')
      .select('interval_days, repetitions, ease_factor')
      .eq('user_id', user.id)
      .eq('question_id', questionId)
      .maybeSingle()
      .then(({ data: existing }) => {
        const current = existing ?? { interval_days: 1, repetitions: 0, ease_factor: 2.5 }
        const next = calculateNextReview(wasCorrect, current.interval_days, current.repetitions, current.ease_factor)
        const nextReviewAt = new Date()
        nextReviewAt.setDate(nextReviewAt.getDate() + next.interval)
        return supabase.from('question_reviews').upsert({
          user_id:          user.id,
          question_id:      questionId,
          interval_days:    next.interval,
          repetitions:      next.repetitions,
          ease_factor:      next.easeFactor,
          next_review_at:   nextReviewAt.toISOString(),
          last_answered_at: new Date().toISOString(),
          last_correct:     wasCorrect,
        }, { onConflict: 'user_id,question_id' })
      })
      .catch(err => console.error('Review upsert failed:', err))
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

    // Answer-change log. Fires automatically on every genuine change of mind —
    // a first pick is not a change, and re-clicking the same choice is not a
    // change. Nothing here is ever hand-recorded.
    if (selectedAnswer !== null && selectedAnswer !== i) {
      const LET = ['A', 'B', 'C', 'D']
      const s0  = useSessionStore.getState()
      logAnswerChange({
        qid:           currentQuestionId,
        idx:           currentIndex,
        sec:           Number(currentQuestion?.section) || null,
        from:          LET[selectedAnswer] ?? String(selectedAnswer),
        to:            LET[i] ?? String(i),
        correct_index: currentQuestion?.correct_index ?? null,
        t:             new Date().toISOString(),
        into:          questionStartRef.current ? Date.now() - questionStartRef.current : null,
        onitem:        (s0.timePerQuestion[currentQuestionId] || 0) * 1000,
      })
    }

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
        upsertReview(q.id, isCorrect)
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
  }, [currentQuestionId, currentQuestion, currentIndex, type, selectedAnswer, setAnswer, logAnswerChange, scheduleSave, questions, awardXP, advanceMission, deductEnergy, incrementStreak, resetStreak, upsertReview])

  // Mirror the change log to localStorage on every append. Synchronous, so it
  // survives a crash or an accidental refresh mid-section.
  useEffect(() => {
    if (!sessionId || readOnly || !answerChanges?.length) return
    try {
      localStorage.setItem(changeLogKey(sessionId), JSON.stringify(answerChanges))
    } catch {
      // Private mode or quota exceeded — the in-memory log still works.
    }
  }, [answerChanges, sessionId, readOnly])

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

  // ── Section-locked navigation (mock-exam fidelity) ─────────────────────────
  // On the real NPTE you move freely WITHIN the current section but can never
  // cross a section boundary from the navigation UI — earlier sections are
  // closed, later ones not yet open. Bounds are held in a ref so goTo keeps a
  // stable identity. Sections only advance through the break flow, which
  // passes force: true.
  const sectionBoundsRef = useRef(null)
  const sectionBounds = useMemo(() => {
    if (readOnly || type !== 'exam') return null
    return boundsForIndex(sectionEnds, currentIndex, questions.length)
  }, [readOnly, type, sectionEnds, currentIndex, questions.length])
  useEffect(() => { sectionBoundsRef.current = sectionBounds }, [sectionBounds])

  const goTo = useCallback((index, { force = false } = {}) => {
    if (!force && isOutOfBounds(sectionBoundsRef.current, index)) return
    setCurrentIndex(index)
    scheduleSave({ current_index: index })
    setFocusedChoice(null)
    setToolbarPanel((p) => p === 'progress' ? null : p)
  }, [setCurrentIndex, scheduleSave])

  const handleSetPanel = useCallback((panel) => {
    if (window.innerWidth < 768) {
      setMobileSheet((p) => (p === panel ? null : panel))
    } else {
      setToolbarPanel((p) => (p === panel ? null : panel))
    }
  }, [])

  const handleMobileJump = useCallback((index) => {
    setMobileSheet(null)
    goTo(index)
  }, [goTo])

  const goNext = useCallback(() => {
    if (currentIndex >= questions.length - 1) return
    // Trigger section breaks only in full mock-exam mode
    if (!readOnly && type === 'exam' && sectionEnds.has(currentIndex)) {
      const sec = Number(questions[currentIndex]?.section) || Math.round((currentIndex + 1) / 45)
      breakResumeIndexRef.current = currentIndex + 1
      setBreakSection(sec)
      if (sec === 2) {
        setBreakTimeLeft(15 * 60)
        setBreakState('mandatory')
        // The scheduled break after Section 2 is the one point where the exam
        // clock genuinely stops. Persist that stop immediately: a null
        // deadline_at means "paused", so a reload during the break restores
        // from time_remaining rather than charging the break to the block.
        if (sessionId) {
          supabase.from('sessions')
            .update(examSnapshot({ deadline_at: null }))
            .eq('id', sessionId)
            .then(() => {}, () => {})
        }
      } else {
        setBreakState('offer')
      }
      return
    }
    goTo(currentIndex + 1)
  }, [currentIndex, questions, sectionEnds, type, goTo]) // eslint-disable-line react-hooks/exhaustive-deps

  const goPrev = useCallback(() => {
    if (currentIndex > 0) goTo(currentIndex - 1)
  }, [currentIndex, goTo])

  // ── Break helpers ──────────────────────────────────────────────────────────
  const resumeFromBreak = useCallback(() => {
    setBreakState(null)
    setBreakSection(null)
    const idx = breakResumeIndexRef.current
    breakResumeIndexRef.current = null
    // force: the break flow is the ONE legitimate way a section boundary is
    // crossed — section-locked navigation would otherwise block this jump.
    if (idx != null) goTo(idx, { force: true })
    // Re-anchor the persisted deadline the instant the clock restarts. Passed
    // explicitly because clockPausedRef is updated by an effect and still holds
    // its pre-resume value at this point in the handler. Harmless on an
    // optional break, where the clock never stopped and this recomputes the
    // same absolute instant.
    if (sessionId) {
      supabase.from('sessions')
        .update(examSnapshot({
          deadline_at: deadlineFromSeconds(useSessionStore.getState().timeRemaining),
        }))
        .eq('id', sessionId)
        .then(() => {}, () => {})
    }
  }, [goTo, sessionId, examSnapshot])

  // Tick the mandatory break countdown.
  //
  // Wall-clock anchored for exactly the same reason the exam clock is: a
  // throttled or backgrounded tab delivers far fewer ticks than seconds
  // elapsed, and a decrement-per-tick countdown would quietly stretch a
  // 15-minute break into however long the browser felt like giving. Anchoring
  // to an absolute end time makes every skipped tick self-correcting.
  //
  // breakTimeLeft is deliberately absent from the dependency array: it is read
  // once to set the anchor, and including it would re-anchor on every tick,
  // which is the bug this replaces.
  const breakEndRef = useRef(null)
  useEffect(() => {
    if (breakState !== 'mandatory') { breakEndRef.current = null; return }
    breakEndRef.current = Date.now() + breakTimeLeft * 1000
    const tick = () => {
      if (breakEndRef.current == null) return
      setBreakTimeLeft(Math.max(0, Math.ceil((breakEndRef.current - Date.now()) / 1000)))
    }
    tick()
    const id = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [breakState]) // eslint-disable-line react-hooks/exhaustive-deps

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
        // deadline_at null: a paused session must not keep burning clock while
        // it sits in the submissions list. time_remaining is the truth here.
        .update(examSnapshot({ status: 'paused', deadline_at: null }))
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
        .update(examSnapshot({
          status:       'submitted',
          score,
          submitted_at: new Date().toISOString(),
          deadline_at:  null,
        }))
        .eq('id', sessionId)

      // Award XP for completing session
      const xpAmount = type === 'exam' ? 100 : 25
      await awardXP(xpAmount, type === 'exam' ? 'Mock Exam complete' : 'Quiz complete')

      // Capture score BEFORE mastery refresh updates it
      const prevPtLingoScore = useGamificationStore.getState().ptLingoScore

      // Refresh mastery + check question count achievements
      await refreshSubjectMastery()
      await checkQuestionCountAchievements()
      const prevStreak = useGamificationStore.getState().streak
      await advanceStreak()
      const newStreak = useGamificationStore.getState().streak
      await useGamificationStore.getState().addCoins(5)

      if (type !== 'quiz') {
        navigate(`/results/${sessionId}`)
        return
      }

      if (isPathSession && pathSubject) {
        await useGamificationStore.getState().incrementNodeLevel(pathSubject, user.id)
      }

      const gam = useGamificationStore.getState()
      setPostFlowData({
        sessionId,
        xpEarned:        xpAmount,
        accuracy:        questions.length > 0 ? correct / questions.length : 0,
        correctCount:    correct,
        totalQuestions:  questions.length,
        currentSystem:   currentQuestion?.subject,
        streakCount:     newStreak,
        streakAdvanced:  newStreak > prevStreak,
        ptLingoScore:    gam.ptLingoScore,
        prevPtLingoScore,
        missionsAllDone: gam.dailyMissions?.all_complete ?? false,
        missions:        gam.dailyMissions?.missions ?? [],
        coinsEarned:     5,
      })
      // Demo session: show ProfileGate instead of PostSessionFlow
      if (isDemo && isAnonymous) {
        setProfileGateData({ correctCount: correct, totalQuestions: questions.length })
        setShowProfileGate(true)
        setSubmitting(false)
        return
      }
      setShowPostFlow(true)
    } catch (err) {
      console.error('Submit error:', err)
    } finally {
      setSubmitting(false)
    }
  }, [questions, sessionId, navigate, type, awardXP, refreshSubjectMastery, checkQuestionCountAchievements, advanceStreak, currentQuestion, isPathSession, pathSubject, isDemo, isAnonymous])

  const handleSheetContinue = useCallback(() => {
    if (currentIndex >= questions.length - 1) {
      setShowFeedbackSheet(false)
      handleSubmit()
      return
    }
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
      setShowFeedbackSheet(false)
      handleSubmit()
    }
  }, [currentIndex, questions.length, setCurrentIndex, handleSubmit])

  const handleSheetExplain = useCallback(async () => {
    setShowFeedbackSheet(false)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    await supabase.from('sessions').update(examSnapshot()).eq('id', sessionId)
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
    await supabase.from('sessions').update(examSnapshot()).eq('id', sessionId)
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
    await supabase
      .from('sessions')
      .update(examSnapshot())
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
          if (readOnly) { navigate(-1); return }
          const questionsRemaining = questions.length - currentIndex - 1
          if (type === 'quiz' && questionsRemaining > 0) {
            setShowQuitModal(true)
          } else {
            navigate(-1)
          }
        }}
        type={type}
        isCasual={isCasual}
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
            {isCasual ? (
              <div className="flex-1 flex justify-center overflow-y-auto scrollbar-thin">
                <div className="w-full max-w-2xl">
                  <CasualQuizView
                    question={currentQuestion}
                    selectedAnswer={selectedAnswer}
                    onSelectAnswer={handleSelectAnswer}
                    isAnswered={readOnly || selectedAnswer !== null}
                    currentSystem={currentQuestion?.subject}
                    questionNumber={currentIndex + 1}
                    totalQuestions={questions.length}
                  />
                </div>
              </div>
            ) : (
              <>
            {/* Single scrollable center column */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {rationaleVisible ? (
                <>
                  <div className="flex flex-col md:flex-row border-b border-slate-200 dark:border-slate-700">
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
                  <div className="flex flex-col md:flex-row md:min-h-full">
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
              <div className="hidden md:flex flex-shrink-0 w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-col overflow-hidden">
                {toolbarPanel === 'progress' && (
                  <ProgressGrid
                    questions={questions}
                    answers={answers}
                    marked={marked}
                    currentIndex={currentIndex}
                    onJump={goTo}
                    bounds={sectionBounds}
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
              </>
            )}

            <ExamToolbar
              className={isCasual ? 'max-md:hidden' : ''}
              expanded={toolbarExpanded}
              activePanel={window.innerWidth < 768 ? mobileSheet : toolbarPanel}
              onSetPanel={handleSetPanel}
              isMarked={isMarked}
              onMark={handleMark}
              highlightMode={highlightMode}
              onToggleHighlight={() => setHighlightMode((v) => !v)}
              onPause={() => setShowPauseModal(true)}
              onSubmit={type === 'exam' ? handleGoToReview : () => setShowSubmitModal(true)}
              onEnd={() => {
                if (readOnly) { navigate(-1); return }
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
          minIndex={sectionBounds?.start ?? 0}
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
              // force: declining the offered break still advances the section.
              if (idx != null) goTo(idx, { force: true })
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

      <MobilePanelSheet
        panel={mobileSheet}
        onClose={() => setMobileSheet(null)}
        questions={questions}
        answers={answers}
        marked={marked}
        currentIndex={currentIndex}
        onJump={handleMobileJump}
        bounds={sectionBounds}
        questionNumber={currentIndex + 1}
        note={currentNote}
        onChange={handleNoteChange}
      />

      {showPostFlow && postFlowData && (
        <PostSessionFlow
          {...postFlowData}
          onReview={()   => navigate(`/results/${postFlowData.sessionId}`)}
          onComplete={() => navigate(`/results/${postFlowData.sessionId}`)}
        />
      )}

      {showProfileGate && profileGateData && (
        <ProfileGate
          correctCount={profileGateData.correctCount}
          totalQuestions={profileGateData.totalQuestions}
          onLater={() => navigate('/path')}
          onSuccess={() => navigate('/path')}
          onSignIn={() => navigate('/auth')}
        />
      )}
    </div>
  )
}
