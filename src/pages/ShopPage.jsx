import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import useGamificationStore from '../stores/gamificationStore'

const SHOP_ITEMS = [
  {
    id: 'energy',
    icon: '⚡',
    name: 'Energy Recharge',
    desc: 'Instantly restore your energy to 25/25',
    cost: 500,
  },
  {
    id: 'xpboost',
    icon: '⭐',
    name: 'XP Boost',
    desc: 'Earn 2× XP on your next quiz session',
    cost: 750,
  },
  {
    id: 'freeze',
    icon: '🧊',
    name: 'Streak Freeze',
    desc: 'Protect your streak if you miss a day',
    cost: 1000,
  },
  {
    id: 'shield',
    icon: '🛡️',
    name: 'Streak Shield',
    desc: '7-day streak protection — miss without losing',
    cost: 3000,
  },
]

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function ShopPage() {
  const navigate = useNavigate()
  const {
    coins, energy, maxEnergy,
    xpBoostActive, streakFreezeCount, streakShieldExpiry,
    rechargeEnergyWithCoins, purchaseXpBoost,
    purchaseStreakFreeze, purchaseStreakShield,
  } = useGamificationStore()

  const [confirmItem, setConfirmItem] = useState(null)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    if (!notification) return
    const t = setTimeout(() => setNotification(null), 3000)
    return () => clearTimeout(t)
  }, [notification])

  const shieldActive = streakShieldExpiry && new Date(streakShieldExpiry) > new Date()

  function getItemStatus(item) {
    if (item.id === 'energy' && energy >= maxEnergy) return { disabled: true, label: 'Already full' }
    if (item.id === 'xpboost' && xpBoostActive)      return { disabled: true, label: 'Already active' }
    if (item.id === 'shield'  && shieldActive)        return { disabled: true, label: `Active until ${formatDate(streakShieldExpiry)}` }
    if (coins < item.cost)                            return { disabled: true, label: 'Need more gems' }
    return { disabled: false, label: 'Buy' }
  }

  function getItemBadge(item) {
    if (item.id === 'xpboost' && xpBoostActive) return 'Active — next session'
    if (item.id === 'freeze')                   return `You have: ${streakFreezeCount} freeze${streakFreezeCount !== 1 ? 's' : ''}`
    if (item.id === 'shield')                   return shieldActive ? `Active until ${formatDate(streakShieldExpiry)}` : 'Not active'
    return null
  }

  function handleBuyTap(item) {
    const { disabled } = getItemStatus(item)
    if (disabled) {
      if (coins < item.cost) {
        setNotification('Not enough gems — earn more by completing sessions and milestones.')
      }
      return
    }
    setConfirmItem(item)
  }

  async function handleConfirm() {
    if (!confirmItem) return
    const item = confirmItem
    setConfirmItem(null)
    if (item.id === 'energy')  await rechargeEnergyWithCoins()
    if (item.id === 'xpboost') await purchaseXpBoost()
    if (item.id === 'freeze')  await purchaseStreakFreeze()
    if (item.id === 'shield')  await purchaseStreakShield()
    setNotification(`💎 Purchased! ${item.name} activated.`)
  }

  return (
    <div className="min-h-screen bg-[#080d18] px-4 py-6 pb-24">

      {/* Header */}
      <div className="flex items-center mb-1">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <p className="flex-1 text-center text-lg font-bold text-white">Shop</p>
        <div style={{ width: 48 }} />
      </div>

      {/* Gems balance */}
      <p className="text-center text-2xl font-black mb-6" style={{ color: '#F59E0B' }}>
        💎 {coins.toLocaleString()} gems
      </p>

      {/* Notification bar */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 rounded-xl px-4 py-3 text-sm font-semibold text-center"
            style={{ background: '#1C1F2E', color: '#F59E0B' }}
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subscription card */}
      <div className="rounded-2xl overflow-hidden mb-6" style={{ background: '#1C1F2E' }}>
        {/* Gold banner */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ background: 'linear-gradient(90deg, #B45309, #F59E0B, #B45309)' }}
        >
          <p className="text-white font-black text-sm tracking-wider uppercase">PT Lingo Pro</p>
          <span className="text-white/80 text-xs font-semibold">✦ Premium</span>
        </div>
        <div className="px-5 py-4">
          <p className="text-white font-semibold mb-3">Unlimited energy, 2× XP, and more</p>
          <ul className="space-y-1.5 mb-4">
            {[
              'Unlimited energy — never run out',
              '2× XP on every session',
              'Streak protection built-in',
              'Priority access to new features',
            ].map((perk) => (
              <li key={perk} className="flex items-start gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <span style={{ color: '#F59E0B' }}>✓</span>
                {perk}
              </li>
            ))}
          </ul>
          <button
            disabled
            className="w-full py-3 rounded-xl font-bold text-sm"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', cursor: 'not-allowed' }}
          >
            Coming Soon
          </button>
          <p className="text-center text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Payment options being finalized
          </p>
        </div>
      </div>

      {/* Items section */}
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
        Spend Your Gems
      </p>

      <div className="space-y-3">
        {SHOP_ITEMS.map((item) => {
          const { disabled, label } = getItemStatus(item)
          const badge = getItemBadge(item)

          return (
            <div
              key={item.id}
              className="rounded-2xl px-5 py-4 flex items-center gap-4"
              style={{ background: '#1C1F2E' }}
            >
              <span style={{ fontSize: 32, flexShrink: 0 }}>{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-base">{item.name}</p>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.desc}</p>
                {badge && (
                  <p className="text-xs mt-1 font-semibold" style={{ color: '#F59E0B' }}>{badge}</p>
                )}
                <p className="text-sm font-bold mt-1" style={{ color: '#F59E0B' }}>
                  💎 {item.cost.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => handleBuyTap(item)}
                disabled={disabled}
                className="flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-opacity"
                style={{
                  background: disabled ? 'rgba(255,255,255,0.08)' : '#F59E0B',
                  color: disabled ? 'rgba(255,255,255,0.3)' : 'white',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  border: 'none',
                  minWidth: 80,
                }}
              >
                {label}
              </button>
            </div>
          )
        })}
      </div>

      {/* Confirmation sheet */}
      <AnimatePresence>
        {confirmItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setConfirmItem(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 36 }}
              className="fixed bottom-0 inset-x-0 z-50 rounded-t-2xl px-6 pt-6 pb-10"
              style={{ background: '#1C1F2E' }}
            >
              <div className="flex flex-col items-center text-center gap-2 mb-6">
                <span style={{ fontSize: 40 }}>{confirmItem.icon}</span>
                <p className="text-white font-bold text-lg">{confirmItem.name}</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{confirmItem.desc}</p>
                <p className="text-base font-bold mt-1" style={{ color: '#F59E0B' }}>
                  💎 {confirmItem.cost.toLocaleString()}
                </p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Your balance: 💎 {coins.toLocaleString()} → 💎 {(coins - confirmItem.cost).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirm}
                  className="w-full py-4 rounded-2xl font-bold text-white text-sm uppercase tracking-wider"
                  style={{ background: '#F59E0B', border: 'none', cursor: 'pointer' }}
                >
                  Confirm Purchase
                </button>
                <button
                  onClick={() => setConfirmItem(null)}
                  className="w-full py-2 font-bold text-sm"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
