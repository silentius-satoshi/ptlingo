const MODES = [
  { id: 'free',      label: 'Open Chat',           sub: 'Ask anything, no structure' },
  { id: 'drill',     label: 'Drill Mode',           sub: 'Quiz on weak questions' },
  { id: 'rationale', label: 'Rationale Deep Dive',  sub: 'Review missed questions' },
  { id: 'concept',   label: 'Concept Explainer',    sub: 'Learn any PT concept' },
]

function accuracyColor(pct) {
  if (pct >= 70) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  if (pct >= 60) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
}

const TOPIC_TEMPLATES = [
  { tag: null, text: 'UMN vs LMN lesion patterns', message: "Can you explain the difference between UMN and LMN lesion presentations and why I keep confusing them?" },
  { tag: null, text: 'Dermatome vs myotome mapping', message: "Walk me through dermatome and myotome mapping — which levels correspond to which tests?" },
  { tag: null, text: 'Special tests sensitivity vs specificity', message: "I struggle with remembering which special tests are sensitive vs specific. Can you help me build a framework?" },
  { tag: null, text: 'Gait deviation analysis', message: "Can you explain how to systematically analyze gait deviations and their underlying causes?" },
]

export default function TutorContextPanel({ context, sessionMode, onModeChange, onTopicSelect }) {
  const subjects = context?.subjectAccuracy
    ? Object.entries(context.subjectAccuracy).sort((a, b) => a[1] - b[1])
    : []
  const flaggedCount = context?.flaggedQuestions?.length ?? 0
  const weakestTags = context?.weakestTags ?? []

  // Generate topic chips from weak tags + templates
  const topicChips = [
    ...weakestTags.slice(0, 2).map((tag) => ({
      text: tag,
      message: `I keep getting questions about "${tag}" wrong. Can you explain the key concepts and common pitfalls?`,
    })),
    ...TOPIC_TEMPLATES.slice(0, Math.max(0, 4 - Math.min(2, weakestTags.length))),
  ].slice(0, 4)

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto px-4 py-5">

      {/* Performance snapshot */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
          Performance
        </p>
        {subjects.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {subjects.map(([subj, pct]) => (
              <div key={subj} className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{subj}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${accuracyColor(pct)}`}>
                  {pct}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">No data yet.</p>
        )}
        {flaggedCount > 0 && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-2">
            {flaggedCount} question{flaggedCount !== 1 ? 's' : ''} flagged for review
          </p>
        )}
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800" />

      {/* Session mode selector */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
          Session Mode
        </p>
        <div className="flex flex-col gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                sessionMode === m.id
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <p className={`text-xs font-semibold ${sessionMode === m.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {m.label}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{m.sub}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800" />

      {/* Suggested topics */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
          Suggested Topics
        </p>
        <div className="flex flex-col gap-1.5">
          {topicChips.map((chip, i) => (
            <button
              key={i}
              onClick={() => onTopicSelect(chip.message)}
              className="text-left px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 transition-colors"
            >
              {chip.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
