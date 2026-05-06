export default function PlanRestoreConfirm({ onConfirm, onCancel, loading }) {
  return (
    <div className="flex items-center gap-3 mt-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
      <p className="text-xs text-amber-800 dark:text-amber-200 flex-1">
        Restoring this plan will archive your current active plan. Continue?
      </p>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-3 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-3 py-1 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50"
        >
          {loading ? 'Restoring…' : 'Yes, restore'}
        </button>
      </div>
    </div>
  )
}
