import { useNavigate } from 'react-router-dom'
import { computeInsightCards, SYSTEM_LABELS, SUBJECT_TO_SYSTEM } from '../../lib/insightEngine'

const CARD_ICONS = {
  biggest_drop: '📉',
  plateau:      '↔️',
  fatigue:      '😴',
  strongest:    '💪',
}

function InsightCard({ card }) {
  const navigate = useNavigate()

  const drillSubject = card.subject ||
    (card.system ? Object.entries(SUBJECT_TO_SYSTEM).find(([, v]) => v === card.system)?.[0] : null)

  const handleDrill = () => {
    if (drillSubject) {
      navigate('/question-bank', { state: { prefilterSubject: drillSubject } })
    }
  }

  const icon = Object.entries(CARD_ICONS).find(([k]) => card.id.startsWith(k))?.[1] ?? '💡'

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex gap-3">
      <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-white mb-0.5">{card.title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{card.body}</p>
        {drillSubject && (
          <button
            onClick={handleDrill}
            className="mt-2 text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
          >
            Drill this area →
          </button>
        )}
      </div>
    </div>
  )
}

export default function InsightCards({ attempts, practiceAccuracy }) {
  const cards = computeInsightCards(attempts, practiceAccuracy)
  if (!cards.length) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {cards.map((c) => <InsightCard key={c.id} card={c} />)}
    </div>
  )
}
