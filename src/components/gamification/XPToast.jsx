import { useEffect, useState } from 'react'
import useGamificationStore from '../../stores/gamificationStore'
import { getLevelTitle } from '../../lib/xpFormulas'

function Toast({ toast, onDone }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 10)
    const hide = setTimeout(() => { setVisible(false); setTimeout(onDone, 300) }, 2500)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [onDone])

  const isLevelUp    = toast.levelUp
  const isAllMissions = toast.source === 'all_missions_complete'
  const bg = isLevelUp ? 'bg-teal-600' : 'bg-amber-500'

  return (
    <div
      className={`${bg} text-white rounded-xl px-4 py-3 shadow-2xl text-sm min-w-[180px] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {isLevelUp ? (
        <>
          <p className="font-bold">+1 Level! 🎓</p>
          <p className="text-xs opacity-90 mt-0.5">
            {getLevelTitle(toast.oldLevel).title} → {getLevelTitle(toast.newLevel).title}
          </p>
        </>
      ) : isAllMissions ? (
        <p className="font-bold text-base">+50 XP — All missions complete! 🔥</p>
      ) : (
        <>
          <p className="font-bold">+{toast.amount} XP ⚡</p>
          <p className="text-xs opacity-90 mt-0.5 truncate max-w-[180px]">{toast.source}</p>
        </>
      )}
    </div>
  )
}

export default function XPToast() {
  const { toastQueue, dismissToast } = useGamificationStore()
  const [current, setCurrent] = useState(null)

  useEffect(() => {
    if (!current && toastQueue.length > 0) {
      setCurrent(toastQueue[0])
    }
  }, [toastQueue, current])

  const handleDone = () => {
    if (current) dismissToast(current.id)
    setCurrent(null)
  }

  if (!current) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end">
      <Toast key={current.id} toast={current} onDone={handleDone} />
    </div>
  )
}
