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

/** v8: set per-word mastery (0 unseen, 1 learning, 2 known). */
export function setMastery(lang: LanguageId, wordId: string, level: number): void {
  const p = loadProgress(lang)
  p.mastery = { ...(p.mastery ?? {}), [wordId]: level }
  saveProgress(lang, p)
}

/** v8: toggle a word's favourite star. Returns the new state. */
export function toggleFavorite(lang: LanguageId, wordId: string): boolean {
  const p = loadProgress(lang)
  const favs = new Set(p.favorites ?? [])
  if (favs.has(wordId)) favs.delete(wordId)
  else favs.add(wordId)
  p.favorites = [...favs]
  saveProgress(lang, p)
  return favs.has(wordId)
}

/** App theme: light / dark / memphis (Memphis Design). */
export type Theme = 'light' | 'dark' | 'memphis'

/** Theme preference (not per-language). */
const THEME_KEY = `${PREFIX}:theme`

export function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark' || saved === 'light' || saved === 'memphis') return saved
  } catch {
    // ignore
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // ignore
  }
}

/** The light/dark theme Memphis was toggled from, so toggling Memphis
 *  off restores it. */
const THEME_PREV_KEY = `${PREFIX}:theme-prev`

export function loadPrevTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(THEME_PREV_KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    // ignore
  }
  return 'light'
}

export function savePrevTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(THEME_PREV_KEY, theme)
  } catch {
    // ignore
  }
}
