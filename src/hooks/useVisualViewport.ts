import { useEffect } from 'react'

/**
 * HARD LESSON (keyboard covering the practice screen): size the app to the
 * *visual* viewport — the area above the on-screen keyboard — not the
 * layout viewport. Whenever the keyboard opens/closes (or the device
 * rotates), --vv updates and the practice screen reflows to fit.
 */
export function useVisualViewport(): void {
  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport
      const height = vv ? vv.height : window.innerHeight
      document.documentElement.style.setProperty('--vv', `${height}px`)
    }
    update()
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
}
