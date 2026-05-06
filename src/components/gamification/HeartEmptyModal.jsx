import { useNavigate } from 'react-router-dom'

export default function HeartEmptyModal({ wrongQuestionIds = [], onEndSession }) {
  const navigate = useNavigate()
  const reviewParam = wrongQuestionIds.slice(0, 3).join(',')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">💔</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Out of hearts</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          You've made too many mistakes in this session. Rest and come back, or understand why with Max.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate(`/tutor${reviewParam ? `?review=${reviewParam}` : ''}`)}
            className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors"
          >
            Ask Max to explain my mistakes
          </button>
          <button
            onClick={onEndSession}
            className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
          >
            End session
          </button>
        </div>
      </div>
    </div>
  )
}
