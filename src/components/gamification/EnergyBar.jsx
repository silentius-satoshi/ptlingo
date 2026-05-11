import { Zap } from 'lucide-react'

export default function EnergyBar({ energy, maxEnergy = 25 }) {
  return (
    <div className="flex items-center gap-1 text-xs font-bold">
      <Zap className="w-3.5 h-3.5 text-yellow-400" />
      <span className="text-white">{energy}</span>
      <span className="text-slate-500">/{maxEnergy}</span>
    </div>
  )
}
