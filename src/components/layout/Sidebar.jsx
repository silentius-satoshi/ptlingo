import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home, FileText, PenLine, BookOpen, BarChart2,
  Lightbulb, Award, ClipboardList, User, ChevronDown,
} from 'lucide-react'
import SidebarHeader from './SidebarHeader'
import SidebarFooter from '../gamification/SidebarFooter'

const MOCK_EXAMS = ['Mock Exam 1', 'Mock Exam 2']

function NavItem({ to, icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
          isActive
            ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
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

  return (
    <aside className="w-60 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 hidden md:flex md:flex-col h-full">
      <SidebarHeader />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-0 py-2 space-y-0.5">
        <NavItem to="/" end label="Dashboard" icon={<Home className="w-5 h-5" />} />
        <NavItem to="/profile" label="Profile" icon={<User className="w-5 h-5" />} />
        <NavItem to="/submissions" label="Submissions" icon={<FileText className="w-5 h-5" />} />
        <NavItem to="/notes" label="My Notes" icon={<PenLine className="w-5 h-5" />} />

        {/* Section label */}
        <div className="pt-3 pb-1">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
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
            className="w-full flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors duration-150"
            style={{ width: 'calc(100% - 16px)' }}
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
                        ? 'text-teal-400 font-medium'
                        : 'text-slate-500 hover:text-white dark:text-slate-400 dark:hover:text-white'
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
    </aside>
  )
}
