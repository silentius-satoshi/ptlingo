export default function OutOfEnergyModal({ onKeepGoing, onEndSession }) {
  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div
          className="w-full max-w-sm rounded-2xl px-6 pt-8 pb-8 flex flex-col items-center text-center"
          style={{ background: '#1C1F2E' }}
        >
          <div className="text-5xl mb-4">⚡</div>
          <h2 className="text-xl font-bold text-white mb-3">Out of Energy!</h2>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Energy recharges over time — 1 charge every 30 minutes. Come back later or keep going with what you have.
          </p>
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={onKeepGoing}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm uppercase tracking-wider"
              style={{ background: '#22C55E' }}
            >
              Keep Going
            </button>
            <button
              onClick={onEndSession}
              className="w-full py-3 font-bold text-sm uppercase tracking-wider"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              End Session
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
