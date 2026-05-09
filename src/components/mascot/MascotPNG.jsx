import { useEffect, useRef } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { MASCOT_IMAGES, IDLE_VARIANTS, SPRINGS } from './mascotConfig'

export function MascotPNG({
  mascot = 'sparky',
  trigger = null,
  size = 120,
  className = '',
  onClick = null,
}) {
  const controls = useAnimation()
  const idleConfig = IDLE_VARIANTS[mascot] || IDLE_VARIANTS.sparky
  const prevTrigger = useRef(null)
  const isAnimating = useRef(false)

  useEffect(() => {
    controls.start(idleConfig)
  }, [mascot]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!trigger || trigger === prevTrigger.current) return
    prevTrigger.current = trigger

    const fireAndReturn = async (sequence) => {
      if (isAnimating.current) return
      isAnimating.current = true
      await controls.stop()
      for (const step of sequence) {
        await controls.start(step)
      }
      isAnimating.current = false
      controls.start(idleConfig)
    }

    switch (trigger) {
      case 'correct':
        fireAndReturn([
          { y: -30, scale: 1.18, rotate: 4, transition: SPRINGS.bouncy },
          { y: 0, scale: [1.18, 0.92, 1], rotate: 0, transition: { duration: 0.35, ease: 'easeOut' } },
        ])
        break

      case 'incorrect':
        fireAndReturn([
          { x: [-10, 10, -8, 8, -4, 4, 0], y: [0, 0, 0, 0, 0, 0, 4], scale: [1, 1, 1, 1, 1, 1, 0.96], transition: { duration: 0.45, ease: 'easeInOut' } },
          { x: 0, y: 0, scale: 1, transition: SPRINGS.gentle },
        ])
        break

      case 'celebrate':
        fireAndReturn([
          { y: -45, scale: 1.25, rotate: 8, transition: SPRINGS.bouncy },
          { rotate: -8, transition: { duration: 0.15, ease: 'easeInOut' } },
          { y: 0, scale: [1.25, 0.85, 1.05, 1], rotate: 0, transition: { duration: 0.5, ease: 'easeOut' } },
        ])
        break

      case 'tap':
        fireAndReturn([
          { scale: 0.85, transition: SPRINGS.snappy },
          { scale: 1.1, transition: SPRINGS.snappy },
          { scale: 1, transition: SPRINGS.snappy },
        ])
        break

      default:
        break
    }
  }, [trigger]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = async () => {
    if (!isAnimating.current) {
      isAnimating.current = true
      await controls.stop()
      await controls.start({ scale: 0.85, transition: SPRINGS.snappy })
      await controls.start({ scale: 1.1,  transition: SPRINGS.snappy })
      await controls.start({ scale: 1,    transition: SPRINGS.snappy })
      isAnimating.current = false
      controls.start(idleConfig)
    }
    onClick?.()
  }

  return (
    <motion.div
      animate={controls}
      style={{ width: size, height: size, display: 'inline-flex' }}
      className={`cursor-pointer select-none ${className}`}
      onClick={handleClick}
    >
      <img
        src={MASCOT_IMAGES[mascot]}
        alt={`${mascot} mascot`}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        draggable={false}
      />
    </motion.div>
  )
}
