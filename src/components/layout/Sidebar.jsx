import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home, FileText, PenLine, BookOpen, BarChart2,
  Lightbulb, Award, ClipboardList, User, LogOut, ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import DarkModeToggle from '../shared/DarkModeToggle'
import SidebarFooter from '../gamification/SidebarFooter'

const MOCK_EXAMS = ['Mock Exam 1', 'Mock Exam 2']

function NavItem({ to, icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
        }`
      }
    >
      <span className="w-5 h-5 flex-shrink-0">{icon}</span>
      {label}
    </NavLink>
  )
}

export default function Sidebar() {
  const [mockExpanded, setMockExpanded] = useState(false)
  const { signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 hidden md:flex md:flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-200 dark:border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">NP</span>
        </div>
        <span className="font-semibold text-slate-900 dark:text-white text-sm tracking-wide">
          NPTE Prep
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <NavItem to="/" end label="Dashboard" icon={<Home className="w-5 h-5" />} />
        <NavItem to="/profile" label="Profile" icon={<User className="w-5 h-5" />} />
        <NavItem to="/submissions" label="Submissions" icon={<FileText className="w-5 h-5" />} />
        <NavItem to="/notes" label="My Notes" icon={<PenLine className="w-5 h-5" />} />

        {/* Divider */}
        <div className="pt-3 pb-1">
          <p className="px-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Content
          </p>
        </div>

        <NavItem to="/question-bank" label="Question Bank" icon={<BookOpen className="w-5 h-5" />} />
        <NavItem to="/performance" label="Performance" icon={<BarChart2 className="w-5 h-5" />} />
        <NavItem to="/tutor" label="AI Tutor" icon={<Lightbulb className="w-5 h-5" />} />
        <NavItem to="/achievements" label="Achievements" icon={<Award className="w-5 h-5" />} />

        {/* Mock Exams expandable */}
        <div>
          <button
            onClick={() => setMockExpanded((v) => !v)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="w-5 h-5 flex-shrink-0">
              <ClipboardList className="w-5 h-5" />
            </span>
            <span className="flex-1 text-left">Mock Exams</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${mockExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          {mockExpanded && (
            <div className="ml-8 mt-0.5 space-y-0.5">
              {MOCK_EXAMS.map((name, i) => (
                <NavLink
                  key={i}
                  to={`/exam/${i + 1}/start`}
                  className={({ isActive }) =>
                    `block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'text-teal-700 font-medium dark:text-teal-400'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`
                  }
                >
                  {name}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Gamification footer strip */}
      <SidebarFooter />

      {/* Footer */}
      <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <DarkModeToggle />
        <button
          onClick={handleSignOut}
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
