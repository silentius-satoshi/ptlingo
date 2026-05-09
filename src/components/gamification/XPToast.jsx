import { useEffect } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import useGamificationStore from '../../stores/gamificationStore'

function FloatToast({ toast, offsetIndex, onDone }) {
  const isBig = toast.amount >= 50
  const isLevelUp = toast.levelUp

  useEffect(() => {
    const t = setTimeout(onDone, offsetIndex * 200 + 900)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ y: 0, opacity: 1, scale: 1 }}
      animate={{ y: -70, opacity: 0, scale: isBig ? 1.3 : 1.1 }}
      transition={{ duration: 0.9, ease: 'easeOut', delay: offsetIndex * 0.2 }}
      className={`font-black pointer-events-none select-none drop-shadow-lg text-amber-400 ${
        isBig ? 'text-2xl' : 'text-lg'
      }`}
    >
      {isLevelUp ? `Level Up! 🎓` : `+${toast.amount} XP ⚡`}
    </motion.div>
  )
}

export default function XPToast() {
  const { toastQueue, dismissToast } = useGamificationStore()

  useEffect(() => {
    toastQueue.forEach((t) => {
      if (t.amount >= 50 && !t._confettiFired) {
        t._confettiFired = true
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { x: 0.5, y: 0.6 },
          colors: ['#14b8a6', '#f59e0b', '#22c55e'],
        })
      }
    })
  }, [toastQueue])

  if (toastQueue.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center">
      <div className="flex flex-col items-center gap-1" style={{ marginTop: '-10%' }}>
        {toastQueue.map((t, i) => (
          <FloatToast key={t.id} toast={t} offsetIndex={i} onDone={() => dismissToast(t.id)} />
        ))}
      </div>
    </div>
  )
}
