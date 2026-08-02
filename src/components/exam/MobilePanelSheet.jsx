import { motion, AnimatePresence } from 'framer-motion'
import { ANIMATION } from '../../constants/design'
import ProgressGrid from '../toolbar/ProgressGrid'
import Calculator from '../toolbar/Calculator'
import NotesPanel from '../toolbar/NotesPanel'

const TITLES = { progress: 'Progress', calculator: 'Calculator', notes: 'Notes' }

export default function MobilePanelSheet({
  panel, onClose,
  questions, answers, marked, currentIndex, onJump, bounds,
  questionNumber, note, onChange,
}) {
  return (
    <AnimatePresence>
      {panel && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={onClose}
          />

          <motion.div
            key="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={ANIMATION.sheetSpring}
            className="fixed bottom-0 inset-x-0 z-50 md:hidden flex flex-col bg-white dark:bg-slate-900 rounded-t-2xl overflow-hidden"
            style={{ maxHeight: '80vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              <span className="text-sm font-semibold text-slate-800 dark:text-white">
                {TITLES[panel]}
              </span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {panel === 'progress' && (
                <ProgressGrid
                  questions={questions} answers={answers} marked={marked}
                  currentIndex={currentIndex} onJump={onJump} bounds={bounds}
                />
              )}
              {panel === 'calculator' && <Calculator />}
              {panel === 'notes' && (
                <NotesPanel questionNumber={questionNumber} note={note} onChange={onChange} />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
