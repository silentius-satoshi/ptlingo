export function rollXP(base = 50) {
  const roll = Math.random()
  if (roll < 0.05)  return { xp: Math.round(base * 2.5), tier: 'jackpot'  }
  if (roll < 0.25)  return { xp: Math.round(base * 1.5), tier: 'bonus'    }
  if (roll < 0.75)  return { xp: base,                    tier: 'standard' }
  return              { xp: Math.round(base * 0.75),      tier: 'reduced'  }
}
