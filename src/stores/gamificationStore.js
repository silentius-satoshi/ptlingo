import { create } from 'zustand'
import {
  fetchOrCreateGamification,
  upsertGamification,
  fetchAccuracyBySubject,
  fetchTotalQuestionsAnswered,
} from '../lib/gamificationQueries'
import { generateDailyMissions } from '../lib/missionGenerator'
import { getLevelFromXP, xpForLevel } from '../lib/xpFormulas'
import { ACHIEVEMENTS } from '../lib/achievements'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const useGamificationStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  userId: null,
  xp: 0,
  level: 1,
  streak: 0,
  longestStreak: 0,
  hearts: 5,
  subjectMastery: {},
  dailyMissions: {},
  achievements: [],
  loaded: false,

  // XP toast queue: [{ id, amount, source, levelUp, oldTitle, newTitle }]
  toastQueue: [],

  // ── Boot ───────────────────────────────────────────────────────────────────
  load: async (userId) => {
    try {
      const row = await fetchOrCreateGamification(userId)
      if (!row) {
        set({ userId, loaded: true })
        return
      }

      const missions = row.daily_missions ?? {}
      set({
        userId,
        xp:             row.xp             ?? 0,
        level:          row.level           ?? 1,
        streak:         row.streak          ?? 0,
        longestStreak:  row.longest_streak  ?? 0,
        hearts:         row.hearts          ?? 5,
        subjectMastery: row.subject_mastery ?? {},
        dailyMissions:  missions,
        achievements:   row.achievements    ?? [],
        loaded: true,
      })

      get().resetHeartsIfNewDay(userId, row.hearts_last_reset)

      // Generate missions if they are stale or missing
      if (!missions.date || missions.date !== todayStr()) {
        await get().generateDailyMissions()
      }
    } catch (err) {
      console.warn('Gamification table not found or fetch failed:', err)
      set({ userId, loaded: true })
    }
  },

  // ── Hearts ─────────────────────────────────────────────────────────────────
  resetHeartsIfNewDay: async (userId, heartsLastReset) => {
    const today = todayStr()
    if (heartsLastReset !== today) {
      set({ hearts: 5 })
      await upsertGamification(userId, { hearts: 5, hearts_last_reset: today })
    }
  },

  deductHeart: async () => {
    const { userId, hearts } = get()
    const newHearts = Math.max(0, hearts - 1)
    set({ hearts: newHearts })
    await upsertGamification(userId, { hearts: newHearts })
  },

  refillHeart: async () => {
    const { userId, hearts } = get()
    const newHearts = Math.min(5, hearts + 1)
    set({ hearts: newHearts })
    await upsertGamification(userId, { hearts: newHearts })
  },

  // ── XP + Level ────────────────────────────────────────────────────────────
  awardXP: async (amount, source) => {
    const { userId, xp: oldXP, level: oldLevel } = get()
    const newXP    = oldXP + amount
    const newLevel = getLevelFromXP(newXP)
    const leveledUp = newLevel > oldLevel

    set({ xp: newXP, level: newLevel })
    await upsertGamification(userId, { xp: newXP, level: newLevel })

    get()._enqueueToast({ amount, source, levelUp: leveledUp, oldLevel, newLevel })
    get().checkAchievements()
  },

  _enqueueToast: (toast) => {
    const id = Date.now() + Math.random()
    set((s) => ({ toastQueue: [...s.toastQueue, { id, ...toast }] }))
  },

  dismissToast: (id) => {
    set((s) => ({ toastQueue: s.toastQueue.filter((t) => t.id !== id) }))
  },

  // ── Streak ────────────────────────────────────────────────────────────────
  advanceStreak: async () => {
    const { userId, streak, longestStreak } = get()
    const today    = todayStr()
    const row      = await fetchOrCreateGamification(userId)
    const lastDate = row?.last_activity_date

    if (lastDate === today) return // already counted today

    const newStreak = lastDate === getPreviousDay() ? streak + 1 : 1
    const newLongest = Math.max(longestStreak, newStreak)

    set({ streak: newStreak, longestStreak: newLongest })
    await upsertGamification(userId, {
      streak: newStreak,
      longest_streak: newLongest,
      last_activity_date: today,
    })

    if (newStreak === 7) await get().awardXP(100, '7-day streak')
    get().checkAchievements()
  },

  // ── Subject Mastery ───────────────────────────────────────────────────────
  updateSubjectMastery: async (subject, pct) => {
    const { userId, subjectMastery } = get()
    const updated = { ...subjectMastery, [subject]: pct }
    set({ subjectMastery: updated })
    await upsertGamification(userId, { subject_mastery: updated })
    get().checkAchievements()
  },

  refreshSubjectMastery: async () => {
    const { userId } = get()
    const accuracy = await fetchAccuracyBySubject(userId)
    const { subjectMastery } = get()
    const updated = { ...subjectMastery, ...accuracy }
    set({ subjectMastery: updated })
    await upsertGamification(userId, { subject_mastery: updated })
    get().checkAchievements()
  },

  // ── Missions ──────────────────────────────────────────────────────────────
  generateDailyMissions: async () => {
    const { userId, subjectMastery } = get()
    const missions = await generateDailyMissions(userId, subjectMastery)
    set({ dailyMissions: missions })
    await upsertGamification(userId, { daily_missions: missions })
  },

  advanceMission: async (type, subject) => {
    const { userId, dailyMissions } = get()
    if (!dailyMissions?.missions) return

    const missions = dailyMissions.missions.map((m) => {
      if (m.completed) return m
      if (m.type !== type) return m
      if (type === 'questions' && subject && m.subject && m.subject !== subject) return m

      const newProgress = m.progress + 1
      const completed   = newProgress >= m.target
      return { ...m, progress: newProgress, completed }
    })

    const all_complete = missions.every((m) => m.completed)
    const updated = { ...dailyMissions, missions, all_complete }
    set({ dailyMissions: updated })
    await upsertGamification(userId, { daily_missions: updated })

    // Award XP for newly completed missions
    missions.forEach((m, i) => {
      const old = dailyMissions.missions[i]
      if (m.completed && !old.completed) {
        get().awardXP(m.xp_reward, `Mission: ${m.description}`)
      }
    })

    if (all_complete && !dailyMissions.all_complete) {
      await get().awardXP(100, 'All missions complete')
      await get().advanceStreak()
    }
  },

  // ── Achievements ──────────────────────────────────────────────────────────
  unlockAchievement: async (id) => {
    const { userId, achievements } = get()
    if (achievements.includes(id)) return

    const updated = [...achievements, id]
    set({ achievements: updated })
    await upsertGamification(userId, { achievements: updated })
    await get().awardXP(50, `Achievement: ${id}`)
  },

  checkAchievements: () => {
    const { streak, subjectMastery, achievements } = get()

    const earn = (id) => {
      if (!achievements.includes(id)) get().unlockAchievement(id)
    }

    // Streaks
    if (streak >= 3)  earn('streak_3')
    if (streak >= 7)  earn('streak_7')
    if (streak >= 30) earn('streak_30')

    // Mastery
    const msk   = subjectMastery['Musculoskeletal']         ?? 0
    const neuro = subjectMastery['Neuromuscular']           ?? 0
    const vals  = Object.values(subjectMastery)
    const allAbove60 = vals.length >= 5 && vals.every((v) => v >= 60)
    const allAbove70 = vals.length >= 5 && vals.every((v) => v >= 70)

    if (msk   >= 70) earn('msk_70')
    if (neuro >= 70) earn('neuro_70')
    if (allAbove60)  earn('all_60')
    if (allAbove70)  earn('all_70')
  },

  checkQuestionCountAchievements: async () => {
    const { userId } = get()
    const total = await fetchTotalQuestionsAnswered(userId)
    if (total >= 100)  get().unlockAchievement('q100')
    if (total >= 500)  get().unlockAchievement('q500')
    if (total >= 1000) get().unlockAchievement('q1000')
  },
}))

function getPreviousDay() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export default useGamificationStore
