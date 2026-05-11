import { motion } from 'framer-motion'
import { getSystemConfig } from '../../constants/systemConfig'

export default function MotivationBreak({ currentSystem, message, mood, onContinue, progressPct, energy, maxEnergy }) {
  const cfg       = getSystemConfig(currentSystem)
  const mascotSrc = cfg?.mascot  ?? '/mascots/sparky.png'
  const primary   = cfg?.primary ?? '#6366F1'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: '#080d18', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes kf-celebrating {
          0%,100%{transform:translateY(0)}
          25%{transform:translateY(-10px)}
          50%{transform:translateY(0)}
          75%{transform:translateY(-6px)}
        }
        @keyframes kf-excited {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-5px)}
          40%{transform:translateX(5px)}
          60%{transform:translateX(-4px)}
          80%{transform:translateX(4px)}
        }
        @keyframes kf-encouraging {
          0%,100%{transform:rotate(0deg)}
          30%{transform:rotate(-5deg)}
          60%{transform:rotate(3deg)}
        }
        @keyframes kf-concerned {
          0%,100%{transform:translateX(0)}
          25%{transform:translateX(-4px)}
          75%{transform:translateX(4px)}
        }
        @keyframes kf-surprised {
          0%{transform:translateY(20px)}
          40%{transform:translateY(-12px)}
          70%{transform:translateY(4px)}
          100%{transform:translateY(0)}
        }
        .mood-celebrating { animation: kf-celebrating 600ms ease-in-out; }
        .mood-excited      { animation: kf-excited 500ms ease-in-out; }
        .mood-encouraging  { animation: kf-encouraging 600ms ease-in-out; }
        .mood-concerned    { animation: kf-concerned 800ms ease-in-out; }
        .mood-surprised    { animation: kf-surprised 600ms cubic-bezier(0.34,1.56,0.64,1); }
      `}</style>

      {/* Top bar */}
      <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        {/* Progress bar */}
        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
          <div style={{ width: `${progressPct}%`, height: '100%', background: primary, borderRadius: 2 }} />
        </div>
        {/* Energy counter */}
        <span style={{ color: '#FDE047', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>⚡ {energy}/{maxEnergy}</span>
        {/* X dismiss */}
        <button
          onClick={onContinue}
          style={{ color: 'rgba(255,255,255,0.4)', fontSize: 22, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          aria-label="Continue"
        >
          ✕
        </button>
      </div>

      {/* Empty middle */}
      <div style={{ flex: 1 }} />

      {/* Subtle divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

      {/* Bottom section: mascot + speech bubble + button */}
      <div style={{ display: 'flex', alignItems: 'flex-end', padding: '16px 20px 48px 20px', gap: 12, flexShrink: 0 }}>
        {/* Mascot — peeks up from bottom, shows head + shoulders */}
        <motion.img
          key={mood}
          className={`mood-${mood}`}
          src={mascotSrc}
          alt=""
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{ width: 90, height: 110, objectFit: 'cover', objectPosition: 'top center', flexShrink: 0 }}
        />

        {/* Right column: speech bubble + continue button */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-end' }}>
          {/* Speech bubble */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.25 }}
            style={{ alignSelf: 'stretch', position: 'relative', background: '#1C1F2E', borderRadius: 12, padding: '14px 16px' }}
          >
            {/* Left-pointing triangle tail */}
            <div style={{ position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderRight: '10px solid #1C1F2E' }} />
            <p style={{ color: 'white', fontSize: 16, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{message}</p>
          </motion.div>

          {/* CONTINUE button */}
          <button
            onClick={onContinue}
            style={{ background: primary, color: 'white', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 28px', borderRadius: 16, border: 'none', cursor: 'pointer' }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
