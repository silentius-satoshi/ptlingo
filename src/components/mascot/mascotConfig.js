export const MASCOT_IMAGES = {
  flex:   '/mascots/flex.png',
  sparky: '/mascots/sparky.png',
  pulse:  '/mascots/pulse.png',
  patch:  '/mascots/patch.png',
  flora:  '/mascots/flora.png',
  page:   '/mascots/page.png',
}

// Maps subject keys from Supabase/gamificationStore to mascot names
export const SUBJECT_MASCOT_MAP = {
  musculoskeletal:   'flex',
  neuromuscular:     'sparky',
  cardiovascular:    'pulse',
  integumentary:     'patch',
  other_systems:     'flora',
  nonsystem_domains: 'page',
}

// Character-specific idle animation params
export const IDLE_VARIANTS = {
  flex: {
    y: [0, -7, 0],
    transition: {
      duration: 2.0,
      repeat: Infinity,
      repeatType: 'loop',
      ease: 'easeInOut',
    },
  },
  sparky: {
    y: [0, -9, 0],
    rotate: [0, -2, 2, 0],
    transition: {
      duration: 1.7,
      repeat: Infinity,
      repeatType: 'loop',
      ease: 'easeInOut',
    },
  },
  pulse: {
    scale: [1, 1.05, 1],
    y: [0, -3, 0],
    transition: {
      duration: 1.4,
      repeat: Infinity,
      repeatType: 'loop',
      ease: 'easeInOut',
    },
  },
  patch: {
    y: [0, -5, 0],
    transition: {
      duration: 2.6,
      repeat: Infinity,
      repeatType: 'loop',
      ease: 'easeInOut',
    },
  },
  flora: {
    y: [0, -4, 2, -3, 0],
    rotate: [0, 1.2, -1.2, 0.6, 0],
    transition: {
      duration: 3.0,
      repeat: Infinity,
      repeatType: 'loop',
      ease: 'easeInOut',
    },
  },
  page: {
    y: [0, -5, 0],
    rotate: [0, -0.8, 0, 0.8, 0],
    transition: {
      duration: 2.4,
      repeat: Infinity,
      repeatType: 'loop',
      ease: 'easeInOut',
    },
  },
}

// Spring configs used across animation triggers
export const SPRINGS = {
  bouncy: { type: 'spring', stiffness: 500, damping: 18, mass: 0.8 },
  snappy: { type: 'spring', stiffness: 700, damping: 22 },
  gentle: { type: 'spring', stiffness: 300, damping: 25 },
}
