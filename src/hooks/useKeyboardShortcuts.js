import { useEffect } from 'react'

export function useKeyboardShortcuts({
  onSelectAnswer,
  onToggleEliminate,
  onMark,
  onNext,
  onPrev,
  onConfirm,
  focusedChoice = null,
  disabled = false,
} = {}) {
  useEffect(() => {
    if (disabled) return

    const handler = (e) => {
      // Never fire shortcuts when user is typing
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.target.isContentEditable) return

      switch (e.key) {
        case '1': onSelectAnswer?.(0); break
        case '2': onSelectAnswer?.(1); break
        case '3': onSelectAnswer?.(2); break
        case '4': onSelectAnswer?.(3); break
        case 'e':
        case 'E':
          if (focusedChoice !== null) onToggleEliminate?.(focusedChoice)
          break
        case 'm':
        case 'M':
          onMark?.()
          break
        case 'Enter':
          e.preventDefault()
          onConfirm?.()
          break
        case 'ArrowLeft':
          e.preventDefault()
          onPrev?.()
          break
        case 'ArrowRight':
          e.preventDefault()
          onNext?.()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [disabled, focusedChoice, onSelectAnswer, onToggleEliminate, onMark, onNext, onPrev, onConfirm])
}
