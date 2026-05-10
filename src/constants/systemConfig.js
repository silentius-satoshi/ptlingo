export const SYSTEM_CONFIG = {
  Musculoskeletal: {
    mascot: '/mascots/flex.png', mascotName: 'Flex',
    primary: '#DC2626', light: '#FEE2E2', dark: '#991B1B', nodeIcon: '💪',
  },
  Neuromuscular: {
    mascot: '/mascots/sparky.png', mascotName: 'Sparky',
    primary: '#EAB308', light: '#FEF9C3', dark: '#A16207', nodeIcon: '⚡',
  },
  'Cardiovascular/Pulmonary': {
    mascot: '/mascots/pulse.png', mascotName: 'Pulse',
    primary: '#F43F5E', light: '#FFE4E6', dark: '#BE123C', nodeIcon: '❤️',
  },
  Integumentary: {
    mascot: '/mascots/patch.png', mascotName: 'Patch',
    primary: '#FB923C', light: '#FFEDD5', dark: '#C2410C', nodeIcon: '🩹',
  },
  'Other Systems': {
    mascot: '/mascots/flora.png', mascotName: 'Flora',
    primary: '#22C55E', light: '#DCFCE7', dark: '#15803D', nodeIcon: '🦠',
  },
  'Nonsystem Domains': {
    mascot: '/mascots/page.png', mascotName: 'Page',
    primary: '#3B82F6', light: '#DBEAFE', dark: '#1D4ED8', nodeIcon: '📋',
  },
}

export function getSystemConfig(systemName) {
  if (systemName === 'Cardiovascular and Pulmonary') return SYSTEM_CONFIG['Cardiovascular/Pulmonary']
  if (systemName === 'Pediatrics') return SYSTEM_CONFIG['Other Systems']
  const key = Object.keys(SYSTEM_CONFIG).find(k =>
    k.toLowerCase().includes(systemName?.toLowerCase()) ||
    systemName?.toLowerCase().includes(k.toLowerCase())
  )
  return key ? SYSTEM_CONFIG[key] : null
}
