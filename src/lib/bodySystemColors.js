export const SYSTEM_COLORS = {
  neuromuscular:   { bg: 'bg-red-500',    border: 'border-red-500',    text: 'text-red-400',    light: 'bg-red-500/10',    hex: '#ef4444', emoji: '🧠' },
  musculoskeletal: { bg: 'bg-green-500',  border: 'border-green-500',  text: 'text-green-400',  light: 'bg-green-500/10',  hex: '#22c55e', emoji: '🦴' },
  cardiovascular:  { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-400', light: 'bg-orange-500/10', hex: '#f97316', emoji: '🫀' },
  integumentary:   { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-400', light: 'bg-purple-500/10', hex: '#a855f7', emoji: '🩹' },
  other:           { bg: 'bg-blue-500',   border: 'border-blue-500',   text: 'text-blue-400',   light: 'bg-blue-500/10',   hex: '#3b82f6', emoji: '📋' },
  pediatrics:      { bg: 'bg-pink-500',   border: 'border-pink-500',   text: 'text-pink-400',   light: 'bg-pink-500/10',   hex: '#ec4899', emoji: '👶' },
}

export function getSystemColors(systemName) {
  if (!systemName) return SYSTEM_COLORS.other
  const key = systemName.toLowerCase().replace(/[\s/\-&]/g, '')
  if (SYSTEM_COLORS[key]) return SYSTEM_COLORS[key]
  const found = Object.keys(SYSTEM_COLORS).find((k) => key.startsWith(k))
  return SYSTEM_COLORS[found] ?? SYSTEM_COLORS.other
}
