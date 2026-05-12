import useGamificationStore, { getPtLingoLevel } from '../stores/gamificationStore'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '../lib/achievements'
import AchievementCard from '../components/gamification/AchievementCard'
import { getSystemConfig } from '../constants/systemConfig'

export default function AchievementsPage() {
  const { achievements, loaded, ptLingoScore, activeSystem } = useGamificationStore()

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-teal-600" />
      </div>
    )
  }

  const earned = new Set(achievements)

  const cfg = getSystemConfig(activeSystem)
  const { level, title, next } = getPtLingoLevel(ptLingoScore)
  const levelStarts = [0, 17, 34, 51, 68, 85]
  const prev = levelStarts[level - 1] ?? 0
  const fillPct = next > prev ? Math.min(100, ((ptLingoScore - prev) / (next - prev)) * 100) : 100

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">

      {/* Level hero */}
      <div className="mb-8 flex flex-col items-center text-center gap-3">
        <img
          src={cfg?.mascot ?? '/mascots/sparky.png'}
          style={{ width: 80, height: 80, objectFit: 'contain' }}
          alt=""
        />
        <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Level {level} — {title}
        </p>
        <p className="text-5xl font-black" style={{ color: cfg?.primary ?? '#6366F1' }}>
          {ptLingoScore}
        </p>
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{ptLingoScore}</span>
            <span>{next}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${fillPct}%`, background: cfg?.primary ?? '#6366F1' }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            PT Lingo Score — based on your NPTE blueprint mastery
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Achievements</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {achievements.length} / {ACHIEVEMENTS.length} unlocked
        </p>
      </div>

      {/* XP summary */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-4 mb-8">
        <p className="text-sm text-amber-700 dark:text-amber-400">
          <span className="font-bold">{achievements.length * 50} XP</span> earned from achievements so far
        </p>
      </div>

      {/* Categories */}
      {ACHIEVEMENT_CATEGORIES.map((cat) => {
        const catItems = ACHIEVEMENTS.filter((a) => a.category === cat)
        if (!catItems.length) return null

        const catEarned = catItems.filter((a) => earned.has(a.id)).length

        return (
          <section key={cat} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {cat}
              </h2>
              <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                {catEarned} / {catItems.length}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {catItems.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  earned={earned.has(achievement.id)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
