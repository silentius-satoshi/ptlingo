import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getSystemConfig } from '../constants/systemConfig'
import ExplanationCard from '../components/rationale/ExplanationCard'

const LETTERS = ['A', 'B', 'C', 'D']

export default function RationalePage() {
  const { state } = useLocation()
  const navigate = useNavigate()

  // useState must be above early return (Rules of Hooks)
  const [activeIndex, setActiveIndex] = useState(state?.selectedAnswer ?? 0)

  if (!state?.question) {
    navigate('/', { replace: true })
    return null
  }

  const { question, selectedAnswer, systemName, sessionId, currentIndex, totalQuestions } = state
  const cfg = getSystemConfig(systemName)
  const accentColor = cfg?.primary ?? '#22C55E'

  const handleAdvance = () => {
    const nextIndex = Math.min(currentIndex + 1, totalQuestions - 1)
    navigate(`/exam/${sessionId}`, { state: { goToIndex: nextIndex }, replace: true })
  }

  const handleAskMax = () => {
    const wrongParam = selectedAnswer !== null && selectedAnswer !== question.correct_index
      ? `&wrong=${selectedAnswer}`
      : ''
    navigate(`/tutor?question=${question.id}${wrongParam}`)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080d18' }}>

      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 pb-4 border-b border-white/10"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        <button
          onClick={handleAdvance}
          className="text-white/60 hover:text-white transition-colors p-1 -ml-1"
          aria-label="Back to quiz"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h1 className="text-white font-bold text-base">Review Rationale</h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-40 flex flex-col gap-5">

        {/* Vertical answer choice stack */}
        <div className="flex flex-col gap-2">
          {question.choices.map((choice, i) => {
            const isCorrect = i === question.correct_index
            const isWrong   = i === selectedAnswer && i !== question.correct_index
            const isActive  = i === activeIndex
            const borderColor = isCorrect ? '#22C55E' : isWrong ? '#EF4444' : 'rgba(255,255,255,0.10)'
            const badgeBg     = isCorrect ? '#22C55E' : isWrong ? '#EF4444' : '#2A2D3A'
            const rowBg       = isCorrect ? 'rgba(34,197,94,0.10)' : isWrong ? 'rgba(239,68,68,0.10)' : 'transparent'
            return (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-left transition-all"
                style={{
                  border: `2px solid ${borderColor}`,
                  background: rowBg,
                  outline: isActive ? '2px solid white' : '2px solid transparent',
                  outlineOffset: 2,
                }}
              >
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: badgeBg }}
                >
                  {LETTERS[i]}
                </span>
                <span className="text-white text-sm leading-snug">{choice}</span>
              </button>
            )
          })}
        </div>

        {/* Explanation card */}
        <ExplanationCard
          question={question}
          selectedAnswer={selectedAnswer}
          activeIndex={activeIndex}
          accentColor={accentColor}
        />
      </div>

      {/* Two stacked CTAs */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-6 flex flex-col gap-3"
        style={{ background: 'linear-gradient(to top, #080d18 70%, transparent)' }}
      >
        <button
          onClick={handleAskMax}
          className="w-full py-4 rounded-2xl font-bold uppercase tracking-wide text-sm border-2 bg-transparent"
          style={{ borderColor: accentColor, color: accentColor }}
        >
          Ask Max
        </button>
        <button
          onClick={handleAdvance}
          className="w-full py-4 rounded-2xl text-white font-bold uppercase tracking-wide text-sm"
          style={{ background: accentColor }}
        >
          Continue Lesson
        </button>
      </div>
    </div>
  )
}
