import { useState } from 'react'
import { motion } from 'framer-motion'

const MODES = [
  {
    id: 'standard',
    icon: '📋',
    label: 'Standard',
    preview: (
      <div className="flex gap-1 w-full h-14 p-2 bg-slate-900 rounded-lg">
        <div className="flex-1 flex flex-col gap-1 justify-center">
          <div className="h-1.5 bg-slate-600 rounded w-3/4" />
          <div className="h-1.5 bg-slate-600 rounded w-full" />
          <div className="h-1.5 bg-slate-600 rounded w-5/6" />
        </div>
        <div className="flex-1 flex flex-col gap-1 justify-center">
          <div className="h-2.5 bg-slate-700 rounded" />
          <div className="h-2.5 bg-slate-700 rounded" />
          <div className="h-2.5 bg-slate-700 rounded" />
        </div>
      </div>
    ),
    desc: 'Full desktop layout with question panel, answer panel, and review toolbar. Best for focused study sessions.',
  },
  {
    id: 'ptlingo',
    icon: '🎮',
    label: 'PT Lingo',
    preview: (
      <div className="flex flex-col gap-1 w-full h-14 p-2 bg-slate-900 rounded-lg justify-center">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-5 h-5 rounded-full bg-teal-700 flex-shrink-0" />
          <div className="flex-1 h-3 bg-slate-700 rounded-xl" />
        </div>
        <div className="h-2 bg-slate-700 rounded-lg" />
        <div className="h-2 bg-slate-700 rounded-lg" />
      </div>
    ),
    desc: 'Mascot-guided experience with large answer cards. PT Lingo style — gamified and mobile-friendly.',
  },
]

export default function QuizModeOnboarding({ onComplete }) {
  const [selected, setSelected] = useState('standard')

  function handleConfirm() {
    localStorage.setItem('ptlingo_quiz_mode', selected)
    localStorage.setItem('ptlingo_quiz_mode_set', 'true')
    onComplete()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-5"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-[480px] rounded-2xl px-6 py-8"
        style={{ background: '#1C1F2E' }}
      >
        <h2 className="text-white font-bold text-center mb-1" style={{ fontSize: 22 }}>
          How do you like to study?
        </h2>
        <p className="text-slate-400 text-sm text-center mb-6">
          Choose your preferred quiz experience
        </p>

        <div className="flex gap-3 mb-4">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className={`flex-1 rounded-xl p-3 border-2 transition-colors text-left ${
                selected === m.id ? 'border-amber-400' : 'border-slate-700 bg-slate-800'
              }`}
            >
              <div className="mb-2">{m.preview}</div>
              <div className="flex items-center gap-1.5">
                <span className="text-base">{m.icon}</span>
                <span className="text-white text-sm font-semibold">{m.label}</span>
              </div>
            </button>
          ))}
        </div>

        <p className="text-slate-400 text-xs text-center mb-6 min-h-[32px]">
          {MODES.find((m) => m.id === selected)?.desc}
        </p>

        <button
          onClick={handleConfirm}
          className="w-full py-4 rounded-2xl font-bold text-white text-sm"
          style={{ background: '#F59E0B' }}
        >
          Let's go!
        </button>
        <p className="text-slate-500 text-xs text-center mt-3">
          You can change this anytime in Settings → Preferences
        </p>
      </motion.div>
    </motion.div>
  )
}
