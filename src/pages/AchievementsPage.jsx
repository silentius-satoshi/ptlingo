import useGamificationStore from '../stores/gamificationStore'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '../lib/achievements'
import AchievementCard from '../components/gamification/AchievementCard'

export default function AchievementsPage() {
  const { achievements, loaded } = useGamificationStore()

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-teal-600" />
      </div>
    )
  }

  const earned = new Set(achievements)

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
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
