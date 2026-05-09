import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, BookOpen, Lightbulb, BarChart2, User } from 'lucide-react'

const tapTransition = { type: 'spring', stiffness: 600, damping: 20 }

function Tab({ to, icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 flex-1 py-2 text-[10px] font-medium transition-colors ${
          isActive ? 'text-teal-500 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'
        }`
      }
    >
      {() => (
        <>
          <motion.div
            whileTap={{ scale: 0.8 }}
            transition={tapTransition}
            className="w-6 h-6 flex items-center justify-center flex-shrink-0"
          >
            {icon}
          </motion.div>
          {label}
        </>
      )}
    </NavLink>
  )
}

function SheetCard({ to, emoji, title, subtitle, onNavigate }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => { navigate(to); onNavigate() }}
      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-slate-800 border border-slate-700 hover:border-teal-600 transition-colors text-left"
    >
      <span className="text-2xl flex-shrink-0">{emoji}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-400 truncate">{subtitle}</p>
      </div>
    </button>
  )
}

const QUESTIONS_PATHS = ['/question-bank', '/exam/']

export default function BottomNav() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setSheetOpen(false) }, [location.pathname])

  const questionsActive = QUESTIONS_PATHS.some((p) => location.pathname.startsWith(p))

  return (
    <>
      {sheetOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSheetOpen(false)}
        />
      )}

      {/* Questions slide-up sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-900 rounded-t-2xl border-t border-slate-700 shadow-2xl transition-transform duration-300 ${
          sheetOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mt-3 mb-4" />
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-3">
            Questions
          </p>
          <SheetCard
            to="/question-bank"
            emoji="📝"
            title="Quiz"
            subtitle="Practice questions by subject"
            onNavigate={() => setSheetOpen(false)}
          />
          <SheetCard
            to="/exam/1/start"
            emoji="📋"
            title="Mock Exam 1"
            subtitle="Simulate the full NPTE exam"
            onNavigate={() => setSheetOpen(false)}
          />
          <SheetCard
            to="/exam/2/start"
            emoji="📋"
            title="Mock Exam 2"
            subtitle="Simulate the full NPTE exam"
            onNavigate={() => setSheetOpen(false)}
          />
        </div>
      </div>

      {/* Fixed bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Tab to="/" end label="Dashboard" icon={<Home className="w-6 h-6" />} />

        {/* Questions tab — opens sheet */}
        <button
          type="button"
          onClick={() => setSheetOpen((v) => !v)}
          className={`flex flex-col items-center gap-0.5 flex-1 py-2 text-[10px] font-medium transition-colors ${
            questionsActive || sheetOpen ? 'text-teal-500 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <motion.div
            whileTap={{ scale: 0.8 }}
            transition={tapTransition}
            className="w-6 h-6 flex items-center justify-center flex-shrink-0"
          >
            <BookOpen className="w-6 h-6" />
          </motion.div>
          Questions
        </button>

        <Tab to="/tutor"       label="AI Tutor"     icon={<Lightbulb className="w-6 h-6" />} />
        <Tab to="/performance" label="Performance"  icon={<BarChart2 className="w-6 h-6" />} />
        <Tab to="/profile"     label="Profile"      icon={<User className="w-6 h-6" />} />
      </nav>
    </>
  )
}
