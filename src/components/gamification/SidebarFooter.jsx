import { useNavigate } from 'react-router-dom'
import useGamificationStore from '../../stores/gamificationStore'
import HeartBar from './HeartBar'
import StreakBadge from './StreakBadge'
import LevelBadge from './LevelBadge'

export default function SidebarFooter() {
  const navigate = useNavigate()
  const { streak, level, xp, hearts, loaded } = useGamificationStore()

  if (!loaded) return null

  return (
    <button
      onClick={() => navigate('/achievements')}
      className="w-full px-3 py-3 mx-0 border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
    >
      {/* Top row: streak | level | hearts */}
      <div className="flex items-center justify-between mb-2">
        <StreakBadge streak={streak} compact />
        <LevelBadge level={level} xp={xp} compact />
        <HeartBar count={hearts} />
      </div>
      {/* XP progress bar */}
      <LevelBadge level={level} xp={xp} />
    </button>
  )
}
