import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../store/authStore'
import { getActivePlan, getPlanHistory } from '../../lib/studyPlanStorage'
import StudyPlanGenerator from './StudyPlanGenerator'
import StudyPlan from './StudyPlan'
import PlanHistory from './PlanHistory'

export default function StudyPlanTab({ practiceAccuracy }) {
  const { user } = useAuthStore()
  const [activePlan, setActivePlan] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [plan, hist] = await Promise.all([
        getActivePlan(user.id),
        getPlanHistory(user.id),
      ])
      setActivePlan(plan)
      setHistory(hist)
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => { load() }, [load])

  const handlePlanGenerated = (saved) => {
    setActivePlan(saved)
    setRegenerating(false)
    load()
  }

  const handleRegenerate = () => setRegenerating(true)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-teal-600" />
      </div>
    )
  }

  const showGenerator = !activePlan || regenerating

  return (
    <div className="flex flex-col gap-6">
      {showGenerator ? (
        <StudyPlanGenerator
          userId={user.id}
          practiceAccuracy={practiceAccuracy}
          activePlan={activePlan}
          onPlanGenerated={handlePlanGenerated}
        />
      ) : (
        <StudyPlan activePlan={activePlan} onRegenerate={handleRegenerate} />
      )}

      {history.length > 0 && (
        <PlanHistory
          history={history}
          userId={user.id}
          currentPlan={activePlan}
          onRestored={load}
        />
      )}
    </div>
  )
}
