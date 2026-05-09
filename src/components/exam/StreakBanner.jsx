import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import confetti from 'canvas-confetti'

const STREAK_TRIGGERS = new Set([3, 5, 7, 10, 15, 20])

export default function StreakBanner({ correctStreak }) {
  const [visible, setVisible] = useState(false)
  const [displayStreak, setDisplayStreak] = useState(0)

  useEffect(() => {
    if (!STREAK_TRIGGERS.has(correctStreak)) return
    setDisplayStreak(correctStreak)
    setVisible(true)

    if (correctStreak >= 10) {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { x: 0.5, y: 0.1 },
        colors: ['#f59e0b', '#fbbf24', '#ffffff'],
      })
    }

    const t = setTimeout(() => setVisible(false), 2000)
    return () => clearTimeout(t)
  }, [correctStreak])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={displayStreak}
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="flex-shrink-0 w-full px-4 py-2 flex items-center gap-2 bg-slate-900 border-l-4 border-amber-400 text-amber-400 font-bold text-sm shadow-lg"
        >
          🔥 <span>{displayStreak} in a row!</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
