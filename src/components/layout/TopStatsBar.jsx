import { Flame, Zap, Heart, Trophy, Sun, Moon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useGamificationStore from '../../stores/gamificationStore'
import { useUiStore } from '../../store/uiStore'

const EXAM_DATE = new Date('2026-07-29')

export default function TopStatsBar() {
  const navigate = useNavigate()
  const { streak, xp, hearts } = useGamificationStore()
  const { darkMode, toggleDarkMode } = useUiStore()

  const daysLeft = Math.max(0, Math.ceil((EXAM_DATE - new Date()) / 86400000))
  const pillColor = daysLeft < 30 ? 'bg-red-500' : 'bg-amber-500'

  return (
    <div
      className="md:hidden flex items-center justify-between px-4 bg-slate-900 border-b border-slate-700 flex-shrink-0"
      style={{ height: 44 }}
    >
      {/* Left: stats → /profile */}
      <button
        onClick={() => navigate('/profile')}
        className="flex items-center gap-3"
      >
        <span className="flex items-center gap-1 text-xs font-bold text-orange-400">
          <Flame className="w-3.5 h-3.5" />
          {streak}
        </span>
        <span className="flex items-center gap-1 text-xs font-bold text-yellow-400">
          <Zap className="w-3.5 h-3.5" />
          {xp}
        </span>
        <span className="flex items-center gap-1 text-xs font-bold text-red-400">
          <Heart className="w-3.5 h-3.5" />
          {hearts}/5
        </span>
      </button>

      {/* Right: countdown + trophy + theme toggle */}
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${pillColor}`}>
          {daysLeft}d
        </span>
        <button
          onClick={() => navigate('/achievements')}
          className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Achievements"
        >
          <Trophy className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
        </button>
        <button
          onClick={toggleDarkMode}
          className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode
            ? <Sun style={{ width: 18, height: 18 }} />
            : <Moon style={{ width: 18, height: 18 }} />
          }
        </button>
      </div>
    </div>
  )
}
