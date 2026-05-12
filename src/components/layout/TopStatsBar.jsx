import { useState } from 'react'
import { Zap, Gem } from 'lucide-react'
import { getSystemConfig } from '../../constants/systemConfig'
import { AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useGamificationStore from '../../stores/gamificationStore'
import StreakModal from '../streak/StreakModal'

const EXAM_DATE = new Date('2026-07-29')

export default function TopStatsBar() {
  const navigate = useNavigate()
  const { streak, energy, coins, ptLingoScore, activeSystem } = useGamificationStore()
  const [showStreak, setShowStreak] = useState(false)

  const daysLeft = Math.ceil((EXAM_DATE - new Date()) / (1000 * 60 * 60 * 24))
  const pillColor = daysLeft <= 14 ? '#EF4444' : daysLeft <= 30 ? '#F97316' : '#6B7280'

  return (
    <>
      <div
        className="md:hidden flex items-center justify-between px-4 bg-slate-900 border-b border-slate-700 flex-shrink-0"
        style={{ height: 48 }}
      >
        {/* PT Lingo Score */}
        <button onClick={() => navigate('/achievements')} className="flex items-center gap-1.5">
          <img
            src={getSystemConfig(activeSystem)?.mascot ?? '/mascots/sparky.png'}
            style={{ width: 28, height: 28, objectFit: 'contain' }}
            alt=""
          />
          <span className="text-base font-bold text-white">{ptLingoScore}</span>
        </button>

        {/* Streak */}
        <button onClick={() => setShowStreak(true)} className="flex items-center gap-1.5">
          <span style={{ fontSize: 20, lineHeight: 1 }}>🔥</span>
          <span className="text-base font-bold text-white">{streak}</span>
        </button>

        {/* Gems */}
        <button onClick={() => navigate('/shop')} className="flex items-center gap-1.5">
          <Gem className="w-5 h-5" style={{ color: '#60A5FA' }} />
          <span className="text-base font-bold text-white">{coins}</span>
        </button>

        {/* Charge — pink pill */}
        <div
          className="flex flex-shrink-0 items-center gap-1"
          style={{ background: '#EC4899', borderRadius: 9999, padding: '5px 10px', fontSize: 13, fontWeight: 700, color: 'white' }}
        >
          <Zap style={{ width: 12, height: 12 }} />
          {energy}
        </div>

        {/* Exam countdown pill */}
        <div
          className="flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white flex-shrink-0"
          style={{ background: pillColor }}
        >
          {daysLeft}d
        </div>
      </div>

      <AnimatePresence>
        {showStreak && <StreakModal streak={streak} onClose={() => setShowStreak(false)} />}
      </AnimatePresence>
    </>
  )
}
