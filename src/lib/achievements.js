export const ACHIEVEMENTS = [
  // ── Streaks ──────────────────────────────────────────────────────────────────
  { id: 'streak_3',   category: 'Streaks',    title: '3-Day Streak',         desc: 'Practice 3 days in a row',             icon: 'Flame',        xp: 50  },
  { id: 'streak_7',   category: 'Streaks',    title: 'Week Warrior',          desc: 'Practice 7 days in a row',             icon: 'Flame',        xp: 100 },
  { id: 'streak_30',  category: 'Streaks',    title: 'Unstoppable',           desc: 'Practice 30 days in a row',            icon: 'Zap',          xp: 300 },

  // ── Mastery ──────────────────────────────────────────────────────────────────
  { id: 'msk_70',     category: 'Mastery',    title: 'MSK Master',            desc: 'Reach 70% in Musculoskeletal',         icon: 'Bone',         xp: 100 },
  { id: 'neuro_70',   category: 'Mastery',    title: 'Neuro Breakthrough',    desc: 'Reach 70% in Neuromuscular',           icon: 'Brain',        xp: 150 },
  { id: 'all_60',     category: 'Mastery',    title: 'All Systems Go',        desc: 'Reach 60%+ in every subject',          icon: 'CheckCircle',  xp: 200 },
  { id: 'all_70',     category: 'Mastery',    title: 'Comprehensive Scholar', desc: 'Reach 70%+ in every subject',          icon: 'Star',         xp: 300 },

  // ── Exams ────────────────────────────────────────────────────────────────────
  { id: 'exam1_done', category: 'Exams',      title: 'First Legendary',       desc: 'Complete Mock Exam 1',                 icon: 'Trophy',       xp: 200 },
  { id: 'exam1_pass', category: 'Exams',      title: 'Mock Passer',           desc: 'Score 75%+ on a Mock Exam',            icon: 'Medal',        xp: 300 },
  { id: 'exam_all',   category: 'Exams',      title: 'Triple Crown',          desc: 'Complete all 3 Mock Exams',            icon: 'Crown',        xp: 500 },

  // ── Questions ────────────────────────────────────────────────────────────────
  { id: 'q100',       category: 'Questions',  title: 'Century',               desc: 'Answer 100 questions',                 icon: 'Hash',         xp: 50  },
  { id: 'q500',       category: 'Questions',  title: 'Grinder',               desc: 'Answer 500 questions',                 icon: 'Hash',         xp: 100 },
  { id: 'q1000',      category: 'Questions',  title: 'Question Machine',      desc: 'Answer 1,000 questions',               icon: 'Hash',         xp: 200 },

  // ── Tutor (Ask Max) ──────────────────────────────────────────────────────────
  { id: 'max_first',  category: 'Tutor',      title: 'Meet Max',              desc: 'Complete your first AI Tutor session', icon: 'BrainCircuit', xp: 50  },
  { id: 'max_10',     category: 'Tutor',      title: 'Max Regular',           desc: 'Complete 10 AI Tutor sessions',        icon: 'BrainCircuit', xp: 100 },

  // ── Missions ─────────────────────────────────────────────────────────────────
  { id: 'mission_7',  category: 'Missions',   title: 'Mission Accepted',      desc: 'Complete daily missions 7 days',       icon: 'Target',       xp: 150 },
  { id: 'mission_30', category: 'Missions',   title: 'On a Mission',          desc: 'Complete daily missions 30 days',      icon: 'Target',       xp: 300 },
]

export const ACHIEVEMENT_CATEGORIES = ['Streaks', 'Mastery', 'Exams', 'Questions', 'Tutor', 'Missions']
