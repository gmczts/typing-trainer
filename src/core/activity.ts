/**
 * v8: daily activity log — the home dashboard's streak, daily-goal ring
 * and 7-day chart. Stored under a NEW key (`typing-trainer:activity`)
 * so existing per-language progress is untouched.
 *
 * Each day records total words practised (completed levels) plus a
 * per-language breakdown. A level completion is the unit of record:
 * partial sessions are not counted.
 */
import { loadProgress } from './storage'
import type { LanguageId } from './types'

export interface DayActivity {
  /** Local date, yyyy-mm-dd */
  date: string
  words: number
  sessions: number
  byLang: Partial<Record<LanguageId, number>>
}

const ACTIVITY_KEY = 'typing-trainer:activity'
const GOAL_KEY = 'typing-trainer:daily-goal'

export const DAILY_GOAL_OPTIONS = [10, 20, 30, 50] as const

export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isDayActivity(x: unknown): x is DayActivity {
  if (typeof x !== 'object' || x === null) return false
  const d = x as Partial<DayActivity>
  return (
    typeof d.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(d.date) &&
    typeof d.words === 'number' &&
    typeof d.sessions === 'number' &&
    typeof d.byLang === 'object'
  )
}

export function loadActivity(): DayActivity[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isDayActivity)
  } catch {
    return []
  }
}

export function saveActivity(days: DayActivity[]): void {
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(days))
  } catch {
    // ignore
  }
}

/** Add a completed level (10 words, or fewer on a short final level). */
export function recordActivity(lang: LanguageId, words: number): void {
  const days = loadActivity()
  const key = todayKey()
  const today = days.find((d) => d.date === key)
  if (today) {
    today.words += words
    today.sessions += 1
    today.byLang[lang] = (today.byLang[lang] ?? 0) + words
  } else {
    days.push({ date: key, words, sessions: 1, byLang: { [lang]: words } })
  }
  // Keep a rolling year of history.
  saveActivity(days.slice(-365))
}

/**
 * One-time seed from pre-v8 completed-level results (each completed
 * level = 10 words for the original three languages). Only runs when no
 * activity log exists yet, so an existing daily user keeps their streak.
 * Dates come from the result's ISO timestamp, converted to local time.
 */
export function seedActivityFromResults(langIds: LanguageId[]): void {
  try {
    if (localStorage.getItem(ACTIVITY_KEY)) return
    const byDate = new Map<string, DayActivity>()
    for (const id of langIds) {
      const p = loadProgress(id)
      for (const r of Object.values(p.results)) {
        const date = todayKey(new Date(r.date))
        const cur = byDate.get(date) ?? { date, words: 0, sessions: 0, byLang: {} }
        cur.words += 10
        cur.sessions += 1
        cur.byLang[id] = (cur.byLang[id] ?? 0) + 10
        byDate.set(date, cur)
      }
    }
    if (byDate.size > 0) {
      saveActivity([...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)))
    }
  } catch {
    // ignore
  }
}

/** Consecutive days with practice, ending today (or yesterday if today is untouched yet). */
export function getStreak(days: DayActivity[]): number {
  const set = new Set(days.filter((d) => d.words > 0).map((d) => d.date))
  let streak = 0
  const d = new Date()
  if (!set.has(todayKey(d))) d.setDate(d.getDate() - 1)
  while (set.has(todayKey(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export interface DayBar {
  date: string
  /** Short weekday label, e.g. "週五" */
  label: string
  words: number
  isToday: boolean
}

/** Last 7 days, oldest first, for the bar chart. */
export function last7Days(days: DayActivity[]): DayBar[] {
  const map = new Map(days.map((d) => [d.date, d.words]))
  const out: DayBar[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = todayKey(d)
    out.push({
      date: key,
      label: d.toLocaleDateString('zh-HK', { weekday: 'short' }),
      words: map.get(key) ?? 0,
      isToday: i === 0,
    })
  }
  return out
}

export function loadDailyGoal(): number {
  try {
    const v = Number(localStorage.getItem(GOAL_KEY))
    if ((DAILY_GOAL_OPTIONS as readonly number[]).includes(v)) return v
  } catch {
    // ignore
  }
  return 20
}

export function saveDailyGoal(n: number): void {
  try {
    localStorage.setItem(GOAL_KEY, String(n))
  } catch {
    // ignore
  }
}
