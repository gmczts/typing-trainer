import { useEffect, useState } from 'react'

function readHeight(): number {
  if (typeof window === 'undefined') return 0
  return window.visualViewport ? window.visualViewport.height : window.innerHeight
}

/**
 * HARD LESSON (keyboard covering the practice screen): size the app to the
 * *visual* viewport — the area above the on-screen keyboard — not the
 * layout viewport. Whenever the keyboard opens/closes (or the device
 * rotates), --vv updates and the practice screen reflows to fit.
 */
export function useVisualViewport(): void {
  useEffect(() => {
    const update = () => {
      document.documentElement.style.setProperty('--vv', `${readHeight()}px`)
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

/**
 * Current visual-viewport height as React state (updates when the
 * on-screen keyboard opens/closes). PracticeScreen uses it to switch
 * to a compact word card while typing, so the word stays fully visible
 * above the keyboard. Returns 0 on the very first render (before the
 * effect runs) — callers should treat 0 as "unknown, not compact".
 */
export function useVisualViewportHeight(): number {
  const [height, setHeight] = useState<number>(0)
  useEffect(() => {
    const update = () => setHeight(readHeight())
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
  return height
}
