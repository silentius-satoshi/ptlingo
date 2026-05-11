import { useState } from 'react'
import { Sun, Moon, Flame, Zap, Heart, Trophy } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useGamificationStore from '../../stores/gamificationStore'
import { useUiStore } from '../../store/uiStore'
import StreakModal from '../streak/StreakModal'

const EXAM_DATE = new Date('2026-07-29')

export default function SidebarHeader() {
  const navigate = useNavigate()
  const { streak, xp, hearts, loaded } = useGamificationStore()
  const { darkMode, toggleDarkMode } = useUiStore()
  const [showStreak, setShowStreak] = useState(false)

  const daysLeft = Math.max(0, Math.ceil((EXAM_DATE - new Date()) / 86400000))
  const pillColor = daysLeft < 30 ? 'bg-red-500' : 'bg-amber-500'

  return (
    <>
    <div className="mx-3 mt-3 mb-2 p-3 bg-slate-800/50 border border-slate-700 rounded-xl space-y-3">
      {/* Row 1: Logo + dark mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-teal-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[10px] font-bold">PT</span>
          </div>
          <span className="text-sm font-bold text-white">
            PT <span className="font-normal text-slate-400">Lingo</span>
          </span>
        </div>
        <button
          onClick={toggleDarkMode}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Row 2: Exam countdown pill */}
      <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold ${pillColor}`}>
        <span>🗓</span>
        <span>{daysLeft} days to exam · July 29, 2026</span>
      </div>

      {/* Row 3: Stats strip */}
      {loaded && (
        <div className="flex items-center justify-around px-2 py-2 rounded-lg">
          <button
            onClick={() => setShowStreak(true)}
            className="flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-1 text-orange-400">
              <Flame className="w-3.5 h-3.5" />
              <span className="text-sm font-bold text-white">{streak}</span>
            </div>
            <span className="text-[9px] text-slate-500">streak</span>
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-1 text-yellow-400">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-sm font-bold text-white">{xp.toLocaleString()}</span>
            </div>
            <span className="text-[9px] text-slate-500">XP</span>
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-1 text-red-400">
              <Heart className="w-3.5 h-3.5" />
              <span className="text-sm font-bold text-white">{hearts}/5</span>
            </div>
            <span className="text-[9px] text-slate-500">hearts</span>
          </button>
        </div>
      )}

      {/* Row 4: Trophy row → /achievements */}
      <button
        onClick={() => navigate('/achievements')}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors text-xs font-medium"
      >
        <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="flex-1 text-left">Achievements</span>
        <span className="text-slate-600">›</span>
      </button>
    </div>

    <AnimatePresence>
      {showStreak && <StreakModal streak={streak} onClose={() => setShowStreak(false)} />}
    </AnimatePresence>
    </>
  )
}
