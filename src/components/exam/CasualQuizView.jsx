import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getSystemConfig } from '../../constants/systemConfig'

const LETTERS = ['A', 'B', 'C', 'D']

export default function CasualQuizView({
  question,
  selectedAnswer,
  onSelectAnswer,
  isAnswered,
  currentSystem,
  questionNumber,
  totalQuestions,
}) {
  const [pendingAnswer, setPendingAnswer] = useState(null)

  useEffect(() => { setPendingAnswer(null) }, [question?.id])

  const config = getSystemConfig(currentSystem) ?? {}
  const primary = config.primary ?? '#14B8A6'
  const choices = question?.choices ?? []
  const correctIndex = question?.correct_index

  function handleCheck() {
    if (pendingAnswer === null) return
    onSelectAnswer(pendingAnswer)
  }

  return (
    <div className="flex flex-col min-h-full bg-[#080d18]">

      <p className="text-white font-bold text-xl pt-4 pb-3 px-4">
        Select the BEST answer
      </p>

      {/* Mascot + speech bubble */}
      <div className="flex items-end gap-3 px-4 pb-4">
        <motion.div
          className="flex-shrink-0"
          animate={{ y: [4, -4, 4] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        >
          <img
            src={config.mascot ?? '/mascots/sparky.png'}
            alt=""
            style={{ width: 90, height: 110, objectFit: 'cover', objectPosition: 'top center' }}
          />
        </motion.div>

        <div className="flex-1 rounded-2xl relative" style={{ background: '#1C1F2E' }}>
          {/* Speech bubble tail */}
          <div
            className="absolute"
            style={{
              left: -10, top: 24,
              width: 0, height: 0,
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderRight: '10px solid #1C1F2E',
            }}
          />
          <div className="flex gap-1.5 px-3 pt-3 flex-wrap">
            {currentSystem && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-900 text-teal-300 font-medium">
                {currentSystem}
              </span>
            )}
            {question?.difficulty && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                question.difficulty === 'Easy'   ? 'bg-green-900 text-green-300' :
                question.difficulty === 'Hard'   ? 'bg-red-900   text-red-300'   :
                                                   'bg-amber-900 text-amber-300'
              }`}>
                {question.difficulty}
              </span>
            )}
          </div>
          <div className="px-4 pt-2 pb-4 overflow-y-auto" style={{ maxHeight: 180 }}>
            <p className="text-white leading-relaxed" style={{ fontSize: 15, fontWeight: 500 }}>
              {question?.content ?? ''}
            </p>
          </div>
        </div>
      </div>

      <div className="h-px mx-4 mb-4" style={{ background: 'rgba(255,255,255,0.08)' }} />

      {/* Answer cards */}
      <div className="flex flex-col gap-3 px-4 pb-4 flex-1">
        {choices.map((text, i) => {
          const isPending   = !isAnswered && pendingAnswer === i
          const isCommitted = isAnswered && selectedAnswer === i
          const isCorrect   = isAnswered && i === correctIndex
          const isWrong     = isCommitted && !isCorrect

          let borderColor = 'transparent'
          let bg          = '#1C1F2E'
          let badgeBg     = 'rgba(255,255,255,0.1)'
          let opacity     = 1

          if (isPending) { borderColor = primary;    bg = primary + '18' }
          if (isCorrect) { borderColor = '#22C55E';  bg = '#22C55E18'; badgeBg = '#22C55E' }
          if (isWrong)   { borderColor = '#EF4444';  bg = '#EF444418'; badgeBg = '#EF4444' }
          if (isAnswered && !isCommitted && !isCorrect) opacity = 0.45

          return (
            <button
              key={i}
              disabled={isAnswered}
              onClick={() => !isAnswered && setPendingAnswer(i)}
              className="flex items-center gap-3 rounded-2xl px-4 text-left transition-colors"
              style={{
                minHeight: 64,
                border: `2px solid ${borderColor}`,
                background: bg,
                opacity,
                cursor: isAnswered ? 'default' : 'pointer',
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-sm"
                style={{ background: badgeBg }}
              >
                {LETTERS[i]}
              </div>
              <span className="text-white flex-1 leading-snug" style={{ fontSize: 15 }}>
                {text}
              </span>
            </button>
          )
        })}
      </div>

      {/* CHECK button */}
      <div className="sticky bottom-0 px-4 pb-6 pt-3" style={{ background: '#080d18' }}>
        <motion.button
          key={pendingAnswer}
          animate={pendingAnswer !== null && !isAnswered ? { scale: [1, 1.03, 1] } : {}}
          transition={{ duration: 0.3 }}
          disabled={pendingAnswer === null || isAnswered}
          onClick={handleCheck}
          className="w-full rounded-2xl py-4 font-bold text-sm uppercase tracking-wider"
          style={{
            background: pendingAnswer !== null && !isAnswered ? primary : '#1C1F2E',
            color: pendingAnswer !== null && !isAnswered ? 'white' : 'rgba(255,255,255,0.3)',
            cursor: pendingAnswer === null || isAnswered ? 'not-allowed' : 'pointer',
          }}
        >
          CHECK
        </motion.button>
      </div>
    </div>
  )
}
