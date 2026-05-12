import { useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'
import confetti from 'canvas-confetti'
import useGamificationStore from '../../stores/gamificationStore'

const TOAST_STYLES = {
  standard: { bg: '#F59E0B', gradient: null,                                         scale: 1,    duration: 2500, label: null          },
  bonus:    { bg: '#22C55E', gradient: null,                                         scale: 1.05, duration: 3000, label: 'Bonus!'      },
  jackpot:  { bg: null,      gradient: 'linear-gradient(135deg, #FFD700, #FF9600)', scale: 1.15, duration: 4000, label: '🎰 JACKPOT!' },
  reduced:  { bg: '#64748B', gradient: null,                                         scale: 0.95, duration: 2000, label: null          },
}

function FloatToast({ toast, offsetIndex, onDone }) {
  const style = TOAST_STYLES[toast.tier ?? 'standard']
  const isLevelUp = toast.levelUp
  const controls = useAnimation()

  useEffect(() => {
    const run = async () => {
      if (toast.tier === 'jackpot') {
        await new Promise(r => setTimeout(r, 300 + offsetIndex * 200))
        await controls.start({ x: [0, -5, 5, -4, 4, 0], transition: { duration: 0.4 } })
      } else {
        await new Promise(r => setTimeout(r, offsetIndex * 200))
      }
      await controls.start({
        y: -70, opacity: 0,
        transition: { duration: style.duration / 1000, ease: 'easeOut' },
      })
      onDone()
    }
    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const bgStyle = style.gradient
    ? { background: style.gradient }
    : { backgroundColor: style.bg }

  return (
    <motion.div
      animate={controls}
      initial={{ y: 0, opacity: 1, scale: style.scale }}
      className="font-black pointer-events-none select-none rounded-xl px-4 py-2 text-white flex flex-col items-center drop-shadow-lg"
      style={bgStyle}
    >
      <span className={style.scale >= 1.1 ? 'text-2xl' : 'text-lg'}>
        {isLevelUp ? 'Level Up! 🎓' : `+${toast.amount} XP ⚡`}
      </span>
      {style.label && (
        <p className="text-xs font-bold opacity-90">{style.label}</p>
      )}
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
