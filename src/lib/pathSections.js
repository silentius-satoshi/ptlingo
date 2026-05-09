export const PATH_SECTIONS = [
  {
    system: 'neuromuscular',
    masteryKey: 'Neuromuscular',
    label: 'Neuromuscular & Nervous Systems',
    mascot: 'sparky',
    color: '#7c3aed',
    lightBg: '#f5f3ff',
    emoji: '⚡',
    nodes: [
      { id: 'neuro-1', topic: 'Lesion Identification',    masteryThreshold: 0  },
      { id: 'neuro-2', topic: 'Stroke & CVA',             masteryThreshold: 20 },
      { id: 'neuro-3', topic: 'SCI & ASIA Levels',        masteryThreshold: 40 },
      { id: 'neuro-4', topic: 'TBI & Rancho Levels',      masteryThreshold: 60 },
      { id: 'neuro-5', topic: 'Gait & Balance Disorders', masteryThreshold: 80 },
    ],
  },
  {
    system: 'musculoskeletal',
    masteryKey: 'Musculoskeletal',
    label: 'Musculoskeletal System',
    mascot: 'flex',
    color: '#ef4444',
    lightBg: '#fef2f2',
    emoji: '💪',
    nodes: [
      { id: 'msk-1', topic: 'Orthopedic Tests',    masteryThreshold: 0  },
      { id: 'msk-2', topic: 'Joint Mobilization',  masteryThreshold: 20 },
      { id: 'msk-3', topic: 'Fractures & Healing', masteryThreshold: 40 },
      { id: 'msk-4', topic: 'Post-Op Protocols',   masteryThreshold: 60 },
      { id: 'msk-5', topic: 'Sports Injuries',     masteryThreshold: 80 },
    ],
  },
  {
    system: 'cardiovascular',
    masteryKey: 'Cardiovascular and Pulmonary',
    label: 'Cardiovascular & Pulmonary',
    mascot: 'pulse',
    color: '#ec4899',
    lightBg: '#fdf2f8',
    emoji: '❤️',
    nodes: [
      { id: 'cardio-1', topic: 'Cardiac Conditions',   masteryThreshold: 0  },
      { id: 'cardio-2', topic: 'Pulmonary Conditions', masteryThreshold: 20 },
      { id: 'cardio-3', topic: 'Exercise Physiology',  masteryThreshold: 40 },
      { id: 'cardio-4', topic: 'Airway Clearance',     masteryThreshold: 60 },
      { id: 'cardio-5', topic: 'ICU & Acute Care',     masteryThreshold: 80 },
    ],
  },
  {
    system: 'integumentary',
    masteryKey: 'Integumentary',
    label: 'Integumentary System',
    mascot: 'patch',
    color: '#f97316',
    lightBg: '#fff7ed',
    emoji: '🩹',
    nodes: [
      { id: 'integ-1', topic: 'Wound Classification', masteryThreshold: 0  },
      { id: 'integ-2', topic: 'Wound Debridement',    masteryThreshold: 20 },
      { id: 'integ-3', topic: 'Burns Staging',        masteryThreshold: 40 },
      { id: 'integ-4', topic: 'Dressings & Healing',  masteryThreshold: 60 },
      { id: 'integ-5', topic: 'Lymphedema',           masteryThreshold: 80 },
    ],
  },
  {
    system: 'other_systems',
    masteryKey: 'Other',
    label: 'Non-Systems & EBP',
    mascot: 'page',
    color: '#1e3a5f',
    lightBg: '#eff6ff',
    emoji: '📋',
    nodes: [
      { id: 'other-1', topic: 'Research & EBP',          masteryThreshold: 0  },
      { id: 'other-2', topic: 'Ethics & Standards',      masteryThreshold: 20 },
      { id: 'other-3', topic: 'Outcome Measures',        masteryThreshold: 40 },
      { id: 'other-4', topic: 'Sensitivity/Specificity', masteryThreshold: 60 },
      { id: 'other-5', topic: 'Documentation',           masteryThreshold: 80 },
    ],
  },
  {
    system: 'other',
    masteryKey: 'Pediatrics',
    label: 'Other Systems & Pediatrics',
    mascot: 'flora',
    color: '#14b8a6',
    lightBg: '#f0fdfa',
    emoji: '🌿',
    nodes: [
      { id: 'peds-1', topic: 'Developmental Milestones', masteryThreshold: 0  },
      { id: 'peds-2', topic: 'Pediatric Conditions',     masteryThreshold: 20 },
      { id: 'peds-3', topic: 'GI & GU',                  masteryThreshold: 40 },
      { id: 'peds-4', topic: 'Metabolic & Endocrine',    masteryThreshold: 60 },
      { id: 'peds-5', topic: 'Oncology & Lymphatic',     masteryThreshold: 80 },
    ],
  },
]

export function getNodeState(masteryPct, node) {
  if (masteryPct >= node.masteryThreshold + 20) return 'completed'
  if (masteryPct >= node.masteryThreshold)       return 'active'
  return 'locked'
}
