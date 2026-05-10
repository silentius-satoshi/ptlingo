import { AnimatePresence, motion } from 'framer-motion'
import { ANIMATION } from '../../constants/design'

export default function AnswerFeedbackSheet({ visible, isCorrect, correctAnswerText, onContinue, onExplain }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={ANIMATION.sheetSpring}
          className="fixed bottom-0 left-0 right-0 rounded-t-2xl p-6 z-50"
          style={{ background: isCorrect ? '#22C55E' : '#EF4444' }}
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="text-white font-bold text-3xl leading-none">
              {isCorrect ? '✓' : '✕'}
            </span>
            <span className="text-white font-bold text-2xl">
              {isCorrect ? 'Great!' : 'Incorrect'}
            </span>
          </div>

          {!isCorrect && correctAnswerText && (
            <div className="mb-5">
              <p className="text-white/70 text-sm mb-1">Correct Answer:</p>
              <p className="text-white font-bold text-sm">{correctAnswerText}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onExplain}
              className="flex-1 py-3 rounded-xl border-2 border-white/70 text-white font-bold text-xs uppercase tracking-wider bg-transparent"
            >
              {isCorrect ? 'Explain My Answer' : 'Explain My Mistake'}
            </button>
            <button
              onClick={onContinue}
              className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider"
              style={{ background: 'white', color: isCorrect ? '#22C55E' : '#EF4444' }}
            >
              {isCorrect ? 'Continue' : 'Got It'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
