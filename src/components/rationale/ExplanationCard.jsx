import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

export default function ExplanationCard({ question, selectedAnswer, activeIndex, accentColor }) {
  const { user } = useAuthStore()
  const [feedback, setFeedback] = useState(null)

  useEffect(() => { setFeedback(null) }, [activeIndex])

  const correct = question.correct_index
  const rationaleText =
    question.rationale_map?.[String(activeIndex)] ||
    (Array.isArray(question.rationale) ? question.rationale[activeIndex] : null) ||
    'No explanation available.'

  const isActiveCorrect = activeIndex === correct
  const isActiveWrong   = activeIndex === selectedAnswer && activeIndex !== correct
  const headerText  = isActiveCorrect ? '✓ Why this is correct'
                    : 'Rationale for this Wrong Answer Choice'
  const headerColor = isActiveCorrect ? '#22C55E' : '#EF4444'

  const handleFeedback = async (helpful) => {
    if (feedback !== null) return
    setFeedback(helpful)
    if (!user?.id) return
    await supabase.from('question_feedback').upsert(
      { user_id: user.id, question_id: question.id, answer_index: activeIndex, helpful },
      { onConflict: 'user_id,question_id,answer_index' },
    )
  }

  const choiceText = question.choices[activeIndex] ?? ''
  const renderRationale = () => {
    if (!choiceText) return rationaleText
    const escaped = choiceText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const parts = rationaleText.split(new RegExp(`(${escaped})`, 'i'))
    let highlighted = false
    return parts.map((part, i) => {
      if (!highlighted && part.toLowerCase() === choiceText.toLowerCase()) {
        highlighted = true
        return <span key={i} style={{ color: accentColor, fontWeight: 700 }}>{part}</span>
      }
      return part
    })
  }

  return (
    <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: '#1C1F2E' }}>
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: headerColor }}>
        {headerText}
      </p>
      <p className="text-white/80 text-sm leading-relaxed">{renderRationale()}</p>
      <div className="flex justify-end gap-4 pt-2 border-t border-white/10">
        <button
          onClick={() => handleFeedback(true)}
          aria-label="Helpful"
          style={{ opacity: feedback === null || feedback === true ? 1 : 0.25 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={feedback === true ? accentColor : 'rgba(255,255,255,0.4)'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
          </svg>
        </button>
        <button
          onClick={() => handleFeedback(false)}
          aria-label="Not helpful"
          style={{ opacity: feedback === null || feedback === false ? 1 : 0.25 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={feedback === false ? '#EF4444' : 'rgba(255,255,255,0.4)'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
            <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
