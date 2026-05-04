import { useUiStore } from '../../store/uiStore'

// Icons kept inline so the toolbar file is self-contained
const Icon = ({ d, filled = false }) => (
  <svg
    className="w-5 h-5"
    fill={filled ? 'currentColor' : 'none'}
    viewBox="0 0 24 24"
    stroke={filled ? 'none' : 'currentColor'}
    strokeWidth={1.8}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
)

const ICONS = {
  submit:      <Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  pause:       <Icon d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  resume:      <Icon d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  progress:    <Icon d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />,
  calculator:  <Icon d="M9 7H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-2M9 7a2 2 0 002 2h2a2 2 0 002-2M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-6 9l2 2 4-4" />,
  highlight:   <Icon d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />,
  notes:       <Icon d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
  mark:        <Icon d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />,
  report:      <Icon d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />,
  end:         <Icon d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  sun:         <Icon d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />,
  moon:        <Icon d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />,
}

function ToolItem({ icon, label, active, danger, expanded, onClick, kbd }) {
  return (
    <button
      onClick={onClick}
      title={!expanded ? label : undefined}
      className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-left transition-colors ${
        danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
          : active
          ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      {expanded && (
        <>
          <span className="flex-1 text-sm font-medium whitespace-nowrap">{label}</span>
          {kbd && (
            <span className="text-[10px] text-slate-400 dark:text-slate-600 font-mono">
              {kbd}
            </span>
          )}
        </>
      )}
    </button>
  )
}

export default function ExamToolbar({
  expanded,
  activePanel,
  onSetPanel,
  paused,
  onPause,
  isMarked,
  onMark,
  highlightMode,
  onToggleHighlight,
  onSubmit,
  onEnd,
  onReport,
}) {
  const { darkMode, toggleDarkMode } = useUiStore()
  const togglePanel = (panel) =>
    onSetPanel(activePanel === panel ? null : panel)

  return (
    <div
      className={`flex-shrink-0 flex flex-col border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden transition-[width] duration-200 ${
        expanded ? 'w-44' : 'w-14'
      }`}
    >
      {/* Main actions */}
      <nav className="flex-1 px-1.5 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        <ToolItem
          icon={ICONS.submit}
          label="Submit Session"
          expanded={expanded}
          onClick={onSubmit}
        />
        <ToolItem
          icon={ICONS.pause}
          label="Pause Session"
          expanded={expanded}
          onClick={onPause}
        />

        {/* Divider */}
        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1.5 mx-1" />

        <ToolItem
          icon={ICONS.progress}
          label="Progress"
          active={activePanel === 'progress'}
          expanded={expanded}
          onClick={() => togglePanel('progress')}
        />
        <ToolItem
          icon={ICONS.calculator}
          label="Calculator"
          active={activePanel === 'calculator'}
          expanded={expanded}
          onClick={() => togglePanel('calculator')}
        />
        <ToolItem
          icon={ICONS.highlight}
          label="Highlight"
          active={highlightMode}
          expanded={expanded}
          onClick={onToggleHighlight}
        />
        <ToolItem
          icon={ICONS.notes}
          label="Notes"
          active={activePanel === 'notes'}
          expanded={expanded}
          onClick={() => togglePanel('notes')}
        />

        {/* Divider */}
        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1.5 mx-1" />

        <ToolItem
          icon={ICONS.mark}
          label="Mark for Review"
          active={isMarked}
          expanded={expanded}
          onClick={onMark}
        />
        <ToolItem
          icon={ICONS.report}
          label="Report Question"
          expanded={expanded}
          onClick={onReport}
        />
      </nav>

      {/* Dark mode + End Session — pinned bottom */}
      <div className="px-1.5 pb-3 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
        <ToolItem
          icon={darkMode ? ICONS.sun : ICONS.moon}
          label={darkMode ? 'Light Mode' : 'Dark Mode'}
          expanded={expanded}
          onClick={toggleDarkMode}
        />
        <ToolItem
          icon={ICONS.end}
          label="End Session"
          danger
          expanded={expanded}
          onClick={onEnd}
        />
      </div>
    </div>
  )
}
