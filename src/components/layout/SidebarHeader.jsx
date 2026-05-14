import { Sun, Moon, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUiStore } from '../../store/uiStore'

export default function SidebarHeader() {
  const navigate = useNavigate()
  const { darkMode, toggleDarkMode } = useUiStore()

  return (
    <div className="mx-3 mt-3 mb-2 p-3 md:mx-1 md:p-1.5 lg:mx-3 lg:p-3 bg-slate-800/50 border border-slate-700 rounded-xl space-y-2">
      {/* Row 1: Logo + dark mode toggle */}
      <div className="flex items-center md:justify-center lg:justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/icons/manifest-icon-192.maskable.png"
            alt="PT Lingo"
            className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
          />
          <span className="hidden lg:inline text-sm font-bold text-white">
            PT <span className="font-normal text-slate-400">Lingo</span>
          </span>
        </div>
        <button
          onClick={toggleDarkMode}
          className="hidden lg:block p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Row 2: Achievements link */}
      <button
        onClick={() => navigate('/achievements')}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors text-xs font-medium md:justify-center lg:justify-start"
      >
        <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="hidden lg:block flex-1 text-left">Achievements</span>
        <span className="hidden lg:block text-slate-600">›</span>
      </button>
    </div>
  )
}
