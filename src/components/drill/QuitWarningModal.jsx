import { AnimatePresence, motion } from 'framer-motion'
import { ANIMATION } from '../../constants/design'
import { getSystemConfig } from '../../constants/systemConfig'

export default function QuitWarningModal({ isOpen, currentSystem, questionsAnswered, onKeepGoing, onQuit }) {
  const cfg        = getSystemConfig(currentSystem)
  const mascotSrc  = cfg?.mascot     ?? '/mascots/sparky.png'
  const mascotName = cfg?.mascotName ?? 'Sparky'
  const primary    = cfg?.primary    ?? '#6366F1'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — tapping does NOT dismiss */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={ANIMATION.sheetSpring}
            className="fixed bottom-0 inset-x-0 z-50 rounded-t-2xl px-6 pt-6 pb-10 flex flex-col items-center"
            style={{ background: '#1C1F2E', minHeight: '55vh' }}
          >
            {/* Mascot */}
            <img
              src={mascotSrc}
              alt={mascotName}
              className="object-contain"
              style={{ width: 96, height: 96 }}
            />
            <p className="text-xs font-bold mt-1 mb-5" style={{ color: primary }}>
              {mascotName}
            </p>

            {/* Heading */}
            <h2 className="text-white font-bold text-[22px] text-center mb-3">
              Wait — you're so close!
            </h2>

            {/* Subtext */}
            <p className="text-center text-[15px] mb-8" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {questionsAnswered === 0
                ? 'Quit now and lose 1 energy — no credit for starting this session.'
                : 'Quit now and lose all XP from this session — plus 1 energy penalty for quitting early.'}
            </p>

            {/* Buttons */}
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={onKeepGoing}
                className="w-full py-4 rounded-2xl font-bold text-white text-sm uppercase tracking-wider"
                style={{ background: primary }}
              >
                Keep Going
              </button>
              <button
                onClick={onQuit}
                className="w-full py-3 font-bold text-sm uppercase tracking-wider"
                style={{ color: 'rgba(239,68,68,0.8)' }}
              >
                Quit and Lose Progress
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
