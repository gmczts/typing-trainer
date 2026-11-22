import { emptyProgress, type LanguageId, type LanguageProgress } from './types'

const PREFIX = 'typing-trainer'

function key(lang: LanguageId): string {
  return `${PREFIX}:${lang}`
}

/** Load progress for a language; returns a fresh empty record if none / corrupt. */
export function loadProgress(lang: LanguageId): LanguageProgress {
  try {
    const raw = localStorage.getItem(key(lang))
    if (!raw) return emptyProgress()
    const parsed = JSON.parse(raw) as Partial<LanguageProgress>
    return { ...emptyProgress(), ...parsed }
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(lang: LanguageId, progress: LanguageProgress): void {
  try {
    localStorage.setItem(key(lang), JSON.stringify(progress))
  } catch {
    // Storage full / private mode — practice still works in-memory.
  }
}

/** Dark-mode preference (not per-language). */
const THEME_KEY = `${PREFIX}:theme`

export function loadTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    // ignore
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function saveTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // ignore
  }
}
