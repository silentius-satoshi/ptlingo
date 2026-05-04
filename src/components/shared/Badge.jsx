export default function Badge({ children, color = 'gray', className = '' }) {
  const colors = {
    gray:   'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    teal:   'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    green:  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    red:    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    amber:  'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    blue:   'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]} ${className}`}
    >
      {children}
    </span>
  )
}
