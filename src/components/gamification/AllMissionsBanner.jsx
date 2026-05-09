import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { MascotPNG } from '../mascot'

export default function AllMissionsBanner({ onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className="fixed bottom-20 md:bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto"
      >
        <MascotPNG mascot="sparky" size={80} trigger="celebrate" />
        <div>
          <p className="font-bold text-base">🎉 All Missions Complete!</p>
          <p className="text-sm font-normal opacity-90">+50 XP bonus earned</p>
        </div>
      </motion.div>
    </div>
  )
}
