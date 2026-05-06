import useGamificationStore from '../../stores/gamificationStore'

export default function HeartBar({ count }) {
  const hearts = count ?? useGamificationStore((s) => s.hearts)

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-base leading-none transition-all ${
          i < hearts ? 'text-red-500' : 'text-slate-300 dark:text-slate-600'
        }`}>
          {i < hearts ? '♥' : '♡'}
        </span>
      ))}
    </div>
  )
}
