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

const SYSTEM_WEIGHTS = {
  'Musculoskeletal':            0.32,
  'Neuromuscular':              0.23,
  'Cardiovascular and Pulmonary': 0.17,
  'Other Systems':              0.13,
  'Integumentary':              0.08,
  'Nonsystem Domains':          0.07,
}

function computePtLingoScore(subjectMastery) {
  const total = Object.entries(SYSTEM_WEIGHTS).reduce(
    (sum, [key, w]) => sum + (subjectMastery[key]?.pct ?? 0) * w,
    0
  )
  return Math.round(total)
}

export function getPtLingoLevel(score) {
  if (score >= 85) return { level: 6, title: 'NPTE Expert',     next: 100 }
  if (score >= 68) return { level: 5, title: 'NPTE Advanced',   next: 85  }
  if (score >= 51) return { level: 4, title: 'NPTE Proficient', next: 68  }
  if (score >= 34) return { level: 3, title: 'NPTE Competent',  next: 51  }
  if (score >= 17) return { level: 2, title: 'NPTE Developing', next: 34  }
  return             { level: 1, title: 'NPTE Novice',          next: 17  }
}

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
  // Energy system (replaces hearts)
  energy: 25,
  maxEnergy: 25,
  lastEnergyUpdate: null,
  coins: 0,
  // Deprecated alias — mirrors energy for any existing callers
  hearts: 25,
  subjectMastery: {},
  dailyMissions: {},
  achievements: [],
  loaded: false,
  ptLingoScore: 0,
  activeSystem: 'Neuromuscular',

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

      const missions       = row.daily_missions ?? {}
      const energy         = row.energy        ?? 25
      const coercedMastery = coerceMastery(row.subject_mastery)
      set({
        userId,
        xp:               row.xp             ?? 0,
        level:            row.level           ?? 1,
        streak:           row.streak          ?? 0,
        longestStreak:    row.longest_streak  ?? 0,
        energy,
        maxEnergy:        row.max_energy      ?? 25,
        lastEnergyUpdate: row.last_energy_update ?? null,
        coins:            row.coins           ?? 0,
        hearts:           energy,             // deprecated alias
        subjectMastery:   coercedMastery,
        ptLingoScore:     computePtLingoScore(coercedMastery),
        dailyMissions:    missions,
        achievements:     row.achievements    ?? [],
        loaded: true,
      })

      get().rechargeEnergy()

      // Generate missions if they are stale or missing
      if (!missions.date || missions.date !== todayStr()) {
        await get().generateDailyMissions()
      }
    } catch (err) {
      console.warn('Gamification table not found or fetch failed:', err)
      set({ userId, loaded: true })
    }
  },

  // ── Energy ────────────────────────────────────────────────────────────────
  rechargeEnergy: async () => {
    const { userId, energy, maxEnergy, lastEnergyUpdate } = get()
    if (energy >= maxEnergy || !lastEnergyUpdate) return
    const now  = new Date()
    const last = new Date(lastEnergyUpdate)
    const gained = Math.floor((now - last) / (30 * 60 * 1000))
    if (gained <= 0) return
    const newEnergy = Math.min(energy + gained, maxEnergy)
    // Advance by gained*30min (preserves leftover fractional minutes)
    const newTs = new Date(last.getTime() + gained * 30 * 60 * 1000).toISOString()
    set({ energy: newEnergy, hearts: newEnergy, lastEnergyUpdate: newTs })
    await upsertGamification(userId, { energy: newEnergy, last_energy_update: newTs })
  },

  deductEnergy: async () => {
    const { userId, energy } = get()
    if (energy <= 0) return
    const newEnergy = energy - 1
    const now = new Date().toISOString()
    set({ energy: newEnergy, hearts: newEnergy, lastEnergyUpdate: now })
    await upsertGamification(userId, { energy: newEnergy, last_energy_update: now })
  },

  // Deprecated alias — existing callers (QuitWarningModal onQuit) forward here
  deductHeart: () => get().deductEnergy(),

  // ── Coins ─────────────────────────────────────────────────────────────────
  addCoins: async (amount) => {
    const { userId, coins } = get()
    const newCoins = coins + amount
    set({ coins: newCoins })
    await upsertGamification(userId, { coins: newCoins })
  },

  rechargeEnergyWithCoins: async () => {
    const { userId, coins, maxEnergy } = get()
    if (coins < 500) return
    const now = new Date().toISOString()
    const newCoins = coins - 500
    set({ energy: maxEnergy, hearts: maxEnergy, lastEnergyUpdate: now, coins: newCoins })
    await upsertGamification(userId, { energy: maxEnergy, last_energy_update: now, coins: newCoins })
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
  updateSubjectMastery: async (subject, data) => {
    const { userId, subjectMastery } = get()
    const entry = typeof data === 'number' ? { pct: data, correct: 0, total: 0 } : data
    const updated = { ...subjectMastery, [subject]: entry }
    set({ subjectMastery: updated, ptLingoScore: computePtLingoScore(updated) })
    await upsertGamification(userId, { subject_mastery: updated })
    get().checkAchievements()
  },

  refreshSubjectMastery: async () => {
    const { userId } = get()
    const accuracy = await fetchAccuracyBySubject(userId)
    const { subjectMastery } = get()
    const updated = { ...subjectMastery, ...accuracy }
    set({ subjectMastery: updated, ptLingoScore: computePtLingoScore(updated) })
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
      await get().awardXP(50, 'all_missions_complete')
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
    const getPct = (v) => typeof v === 'number' ? v : (v?.pct ?? 0)
    const msk   = getPct(subjectMastery['Musculoskeletal'])
    const neuro = getPct(subjectMastery['Neuromuscular'])
    const vals  = Object.values(subjectMastery).map(getPct)
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

function coerceMastery(raw) {
  const out = {}
  Object.entries(raw ?? {}).forEach(([subj, val]) => {
    out[subj] = typeof val === 'number' ? { pct: val, correct: 0, total: 0 } : val
  })
  return out
}

function getPreviousDay() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export default useGamificationStore
