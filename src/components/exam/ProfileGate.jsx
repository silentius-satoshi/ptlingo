import { motion } from 'framer-motion'

export default function ProfileGate({ correctCount, totalQuestions, onSignUp, onLater }) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-between px-6 py-12"
      style={{ background: '#080d18', zIndex: 100 }}
    >
      {/* Mascot + score */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
        <motion.img
          src="/mascots/sparky.png"
          alt="Sparky"
          className="w-32 h-32 object-contain"
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        />
        <div>
          <p className="text-6xl font-black" style={{ color: '#F59E0B' }}>
            {correctCount}/{totalQuestions}
          </p>
          <p className="text-white text-lg font-bold mt-1">
            You got {correctCount} of {totalQuestions} right!
          </p>
        </div>
        <div className="max-w-xs">
          <h2 className="text-2xl font-black text-white">Save your progress</h2>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            Create a free account to keep your streak, unlock all questions, and track your progress.
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={onSignUp}
          className="w-full py-4 rounded-2xl text-white font-black text-base"
          style={{ background: '#22C55E' }}
        >
          CREATE ACCOUNT
        </button>
        <button
          onClick={onLater}
          className="w-full py-3 rounded-2xl border border-slate-600 text-slate-300 text-sm font-medium"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
