// Icon renderer for achievement icons (uses inline SVG paths)
function AchIcon({ icon }) {
  const icons = {
    Flame:        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />,
    Zap:          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />,
    Bone:         <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />,
    Brain:        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />,
    CheckCircle:  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
    Star:         <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />,
    Trophy:       <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    Medal:        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
    Crown:        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
    Hash:         <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />,
    BrainCircuit: <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />,
    Target:       <><circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="2" strokeLinecap="round" strokeLinejoin="round" /></>,
  }
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      {icons[icon] ?? icons.Star}
    </svg>
  )
}

export default function AchievementCard({ achievement, earned, earnedDate }) {
  return (
    <div className={`flex flex-col gap-3 p-4 rounded-2xl border transition-all ${
      earned
        ? 'border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900'
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-40'
    }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        earned
          ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
      }`}>
        <AchIcon icon={achievement.icon} />
      </div>

      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">
          {achievement.title}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug mb-2">
          {achievement.desc}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            +{achievement.xp} XP
          </span>
          {earned && earnedDate ? (
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
              Earned {new Date(earnedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          ) : !earned ? (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Locked</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
