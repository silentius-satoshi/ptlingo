import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { buildTutorContext, formatSystemPrompt } from '../lib/tutorContext'
import { streamTutorResponse } from '../lib/tutorApi'
import { buildDrillQueue } from '../lib/tutorDrillQueue'
import TutorContextPanel from '../components/tutor/TutorContextPanel'
import TutorConversation from '../components/tutor/TutorConversation'
import TutorInputBar from '../components/tutor/TutorInputBar'

const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E']

let msgCounter = 0
function mkId() { return ++msgCounter }

export default function TutorPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [sessionMode, setSessionMode] = useState(searchParams.get('mode') || 'free')
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [context, setContext] = useState(null)
  const [loadingCtx, setLoadingCtx] = useState(true)
  const [drillQueue, setDrillQueue] = useState([])
  const [drillIndex, setDrillIndex] = useState(0)
  const [answeredDrillIds, setAnsweredDrillIds] = useState(new Set())
  const [injectedText, setInjectedText] = useState('')
  const [panelOpen, setPanelOpen] = useState(true)

  const systemPromptRef = useRef('')
  const contextRef = useRef(null)
  const modeRef = useRef(sessionMode)

  // Read Ask Max params
  const askMaxQuestion = searchParams.get('question')
  const askMaxWrong    = searchParams.get('wrong')

  // Sync mode ref
  useEffect(() => { modeRef.current = sessionMode }, [sessionMode])

  // ── Boot ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    buildTutorContext(user.id).then((ctx) => {
      setContext(ctx)
      contextRef.current = ctx
      setLoadingCtx(false)

      if (!ctx.totalSubmissions) return // empty state

      const queue = buildDrillQueue(ctx.flaggedQuestions, ctx.weakSubjectQuestions)
      setDrillQueue(queue)

      const prompt = formatSystemPrompt(ctx, modeRef.current)
      systemPromptRef.current = prompt

      // Fire welcome / Ask Max opening
      if (askMaxQuestion) {
        fireAskMaxOpening(ctx, askMaxQuestion, askMaxWrong, prompt)
      } else {
        fireWelcome(ctx, prompt)
      }
    })
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Welcome message ────────────────────────────────────────────────────────
  function fireWelcome(ctx, prompt) {
    const subjects = Object.entries(ctx.subjectAccuracy).sort((a, b) => a[1] - b[1])
    const weakest = subjects[0]
    const welcomeText = weakest
      ? `Hi! I've loaded your performance data. Your weakest area right now is **${weakest[0]}** at **${weakest[1]}%**. Want me to drill you on that, or is there something specific you want to work through?`
      : `Hi! I've loaded your performance data. What would you like to work on today?`

    streamAssistant([{ id: mkId(), role: 'user', content: '__welcome__' }], prompt, welcomeText)
  }

  // ── Ask Max opening ────────────────────────────────────────────────────────
  function fireAskMaxOpening(ctx, questionId, wrongIdx, prompt) {
    const q = ctx.flaggedQuestions.find((fq) => fq.id === questionId)
    if (!q) {
      fireWelcome(ctx, prompt)
      return
    }
    const wrongLetter = CHOICE_LETTERS[parseInt(wrongIdx)] ?? '?'
    const wrongText = q.choices?.[parseInt(wrongIdx)] ?? 'that choice'
    const correctLetter = CHOICE_LETTERS[q.correct_index] ?? '?'
    const correctText = q.choices?.[q.correct_index] ?? ''
    const openingPrompt = `I can see you just got this question wrong — you chose **${wrongLetter}** ("${wrongText}") but the answer was **${correctLetter}** ("${correctText}"). Let me explain exactly what tripped you up here, and what you need to remember for the NPTE.`
    streamAssistant([{ id: mkId(), role: 'user', content: '__askmax__' }], prompt, openingPrompt)
  }

  // ── Stream assistant ───────────────────────────────────────────────────────
  // If openingText is provided, inject it without API call (used for welcome/Ask Max)
  function streamAssistant(history, prompt, openingText) {
    if (openingText) {
      setMessages([{ id: mkId(), role: 'assistant', content: openingText }])
      if (modeRef.current === 'drill') {
        setTimeout(() => injectNextDrillQuestion(0), 300)
      } else if (modeRef.current === 'rationale') {
        setTimeout(() => injectNextRationaleCard(0, contextRef.current), 300)
      }
      return
    }
  }

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback((text) => {
    if (text === '__reset__') { resetSession(); return }
    if (!text.trim() || isStreaming) return

    const userMsg = { id: mkId(), role: 'user', content: text }
    const asstMsg = { id: mkId(), role: 'assistant', content: '' }

    setMessages((prev) => [...prev, userMsg, asstMsg])
    setIsStreaming(true)

    // Build trimmed history for the API (no drill/rationale card entries)
    setMessages((prev) => {
      const history = prev
        .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content && !m.type))
        .slice(-30)

      streamTutorResponse({
        messages: [...history, userMsg],
        systemPrompt: systemPromptRef.current,
        onChunk: (chunk) => {
          setMessages((p) => p.map((m) => m.id === asstMsg.id ? { ...m, content: m.content + chunk } : m))
        },
        onDone: () => {
          setMessages((p) => p.map((m) => m.id === asstMsg.id ? { ...m, type: undefined } : m))
          setIsStreaming(false)
          if (modeRef.current === 'drill') {
            setDrillIndex((idx) => {
              injectNextDrillQuestion(idx + 1)
              return idx + 1
            })
          }
        },
        onError: (err) => {
          setMessages((p) => p.map((m) => m.id === asstMsg.id
            ? { ...m, content: `Error: ${err.message}`, type: 'error' }
            : m
          ))
          setIsStreaming(false)
        },
      })

      return prev
    })
  }, [isStreaming]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drill injection ────────────────────────────────────────────────────────
  function injectNextDrillQuestion(idx) {
    const queue = drillQueue
    if (!queue.length) return
    if (idx >= queue.length) {
      setMessages((prev) => [
        ...prev,
        { id: mkId(), role: 'assistant', content: "You've worked through all your drill questions for this session. Want to go again or switch to a different mode?" },
      ])
      return
    }
    const question = queue[idx]
    setMessages((prev) => [
      ...prev,
      { id: mkId(), role: 'assistant', type: 'drill_question', question, content: '' },
    ])
  }

  // ── Rationale injection ────────────────────────────────────────────────────
  function injectNextRationaleCard(idx, ctx) {
    const flagged = ctx?.flaggedQuestions ?? []
    if (!flagged.length) return
    if (idx >= flagged.length) return
    const question = flagged[idx]
    setMessages((prev) => [
      ...prev,
      { id: mkId(), role: 'assistant', type: 'rationale_card', question, content: '' },
    ])
  }

  // ── Drill answer handler ───────────────────────────────────────────────────
  const handleDrillAnswer = useCallback((msgId, question, selectedIndex) => {
    setAnsweredDrillIds((prev) => new Set([...prev, msgId]))
    const letter = CHOICE_LETTERS[selectedIndex] ?? '?'
    const choiceText = question.choices?.[selectedIndex] ?? ''
    sendMessage(`I chose ${letter}. "${choiceText}"`)
  }, [sendMessage])

  // ── Mode change ────────────────────────────────────────────────────────────
  const handleModeChange = useCallback((newMode) => {
    setSessionMode(newMode)
    modeRef.current = newMode
    resetSession(newMode)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session reset ──────────────────────────────────────────────────────────
  function resetSession(mode) {
    const activeMode = mode ?? modeRef.current
    const ctx = contextRef.current
    if (!ctx) return

    const prompt = formatSystemPrompt(ctx, activeMode)
    systemPromptRef.current = prompt
    setMessages([])
    setDrillIndex(0)
    setAnsweredDrillIds(new Set())

    setTimeout(() => fireWelcome(ctx, prompt), 50)
  }

  // ── Loading / empty states ─────────────────────────────────────────────────
  if (loadingCtx) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <svg className="w-10 h-10 text-teal-400 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading your performance data…</p>
        </div>
      </div>
    )
  }

  if (context?.totalSubmissions === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-sm space-y-4">
          <svg className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Your tutor is ready — but needs data first</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Complete at least one quiz or exam session so I can analyze your performance and personalize your coaching.
            </p>
          </div>
          <button
            onClick={() => navigate('/question-bank')}
            className="px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors"
          >
            Go to Question Bank
          </button>
        </div>
      </div>
    )
  }

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex overflow-hidden h-full">
      {/* Left panel — desktop only */}
      {panelOpen && (
        <div className="hidden md:flex w-[260px] flex-shrink-0 border-r border-slate-200 dark:border-slate-700 flex-col bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Tutor Context
            </p>
            <button onClick={() => setPanelOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
          <TutorContextPanel
            context={context}
            sessionMode={sessionMode}
            onModeChange={handleModeChange}
            onTopicSelect={(msg) => setInjectedText(msg)}
          />
        </div>
      )}

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0">
          {!panelOpen && (
            <button onClick={() => setPanelOpen(true)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors hidden md:block">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h1 className="text-sm font-bold text-slate-800 dark:text-white">AI Tutor</h1>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium capitalize ml-1">
            {sessionMode === 'free' ? 'Open Chat' : sessionMode === 'drill' ? 'Drill Mode' : sessionMode === 'rationale' ? 'Rationale Deep Dive' : 'Concept Explainer'}
          </span>
          {drillQueue.length < 5 && sessionMode === 'drill' && (
            <p className="text-xs text-amber-600 dark:text-amber-400 ml-auto">
              Low flagged questions — pulling from weakest subject
            </p>
          )}
        </div>

        <TutorConversation
          messages={messages}
          isStreaming={isStreaming}
          onDrillAnswer={handleDrillAnswer}
          answeredDrillIds={answeredDrillIds}
        />

        <TutorInputBar
          onSend={sendMessage}
          isStreaming={isStreaming}
          context={context}
          injectedText={injectedText}
          onInjectedTextClear={() => setInjectedText('')}
        />
      </div>
    </div>
  )
}
