import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flame } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { ANIMATION } from '../../constants/design'
import StreakCalendar from './StreakCalendar'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default function StreakModal({ streak, onClose }) {
  const { user } = useAuthStore()
  const [practicedDays, setPracticedDays] = useState(new Set())
  const [daysPracticed, setDaysPracticed] = useState(0)
  const now = new Date()

  useEffect(() => {
    if (!user) return
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    supabase
      .from('sessions')
      .select('started_at')
      .eq('user_id', user.id)
      .eq('status', 'submitted')
      .gte('started_at', start)
      .lte('started_at', end)
      .then(({ data }) => {
        if (data) {
          const days = new Set(data.map(s => s.started_at.slice(0, 10)))
          setPracticedDays(days)
          setDaysPracticed(days.size)
        }
      })
  }, [user])

  const nextMilestone = Math.floor(streak / 10) * 10 + 10
  const fillPct = Math.min(100, (streak / nextMilestone) * 100)

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={ANIMATION.sheetSpring}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl overflow-y-auto"
        style={{ maxHeight: '90vh', background: '#080d18' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="relative flex items-center justify-center px-5 py-3">
          <button
            onClick={onClose}
            className="absolute left-5 p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-sm font-semibold text-white">Streak</p>
        </div>

        <div className="px-6 pb-8 space-y-6">
          {/* Hero */}
          <div className="flex flex-col items-center pt-2 pb-1">
            <div className="relative">
              <Flame
                style={{ position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 8, width: 52, height: 52, color: '#FF9600' }}
                strokeWidth={1.5}
              />
              <p className="font-bold text-7xl leading-none" style={{ color: '#FF9600' }}>
                {streak}
              </p>
            </div>
            <p className="font-bold text-lg mt-1" style={{ color: '#FF9600' }}>day streak!</p>
          </div>

          {/* Body text */}
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Keep your streak by completing at least one session every day!
          </p>

          {/* Calendar */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
            </p>
            <StreakCalendar practicedDays={practicedDays} month={now} />
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-4 text-center" style={{ background: '#1C1F2E' }}>
              <p className="text-2xl font-bold text-white">{daysPracticed}</p>
              <p className="text-xs text-slate-400 mt-1">Days practiced this month</p>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: '#1C1F2E' }}>
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-xs text-slate-400 mt-1">Freezes used</p>
            </div>
          </div>

          {/* Streak Goal */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Streak Goal</p>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: '#1C1F2E' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${fillPct}%`,
                  background: 'linear-gradient(to right, #FF9600, #FF4B4B)',
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs font-bold" style={{ color: '#FF9600' }}>{streak}</span>
              <span className="text-xs text-slate-500">{nextMilestone}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
