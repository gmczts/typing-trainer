import { useCallback, useEffect, useRef, useState } from 'react'
import { loadProgress, saveProgress } from '../core/storage'
import {
  WORDS_PER_LEVEL,
  type LanguageAdapter,
  type LanguageProgress,
  type LevelResult,
  type WordView,
} from '../core/types'

export type PracticePhase = 'practicing' | 'summary'

export interface WrongEntry {
  word: WordView
  attempts: string[]
}

export interface PracticeSession {
  /** Words in this level run, in the order they are practised */
  order: WordView[]
  index: number
  word: WordView
  phase: PracticePhase
  errors: number
  correctFirstTry: number
  wrongEntries: WrongEntry[]
  wrongAttemptsForCurrent: string[]
  shakeKey: number
  justCorrect: boolean
  startedAt: number
  elapsedSeconds: number
  random: boolean
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i] as T
    a[i] = a[j] as T
    a[j] = tmp
  }
  return a
}

export interface UsePracticeOptions {
  adapter: LanguageAdapter
  level: number
  random: boolean
  /** If set, this word goes first in the level run (dictionary / review jump). */
  focusWordId?: string | null
  onLevelComplete: (progress: LanguageProgress, result: LevelResult) => void
}

/**
 * The shared practice engine. One hook drives all languages: correct
 * advances, wrong input shakes + counts errors, finishing a level shows
 * a summary and persists the result.
 *
 * HARD LESSON (IME leak): the input element is keyed by
 * `${level}:${index}:${sessionId}` in PracticeScreen, so React remounts a
 * FRESH input on every word change — composition state from the previous
 * word can never leak into the next word and cause false errors.
 */
export function usePractice({ adapter, level, random, focusWordId, onLevelComplete }: UsePracticeOptions) {
  const levelWords = adapter.words.slice(
    (level - 1) * WORDS_PER_LEVEL,
    level * WORDS_PER_LEVEL,
  )

  const initialOrder = useCallback((): WordView[] => {
    const base = random ? shuffle(levelWords) : levelWords
    if (!focusWordId) return base
    const focus = base.find((w) => w.id === focusWordId)
    if (!focus) return base
    return [focus, ...base.filter((w) => w.id !== focusWordId)]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter.id, level, random, focusWordId])

  const [sessionId, setSessionId] = useState(0)
  const [order, setOrder] = useState<WordView[]>(initialOrder)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<PracticePhase>('practicing')
  const [errors, setErrors] = useState(0)
  const [correctFirstTry, setCorrectFirstTry] = useState(0)
  const [wrongEntries, setWrongEntries] = useState<WrongEntry[]>([])
  const [wrongAttempts, setWrongAttempts] = useState<string[]>([])
  const [hintUsed, setHintUsed] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const [justCorrect, setJustCorrect] = useState(false)
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<number | null>(null)

  // Elapsed-time ticker while practising.
  useEffect(() => {
    if (phase !== 'practicing') return
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 500)
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    }
  }, [phase, startedAt])

  const word = order[index] as WordView

  const finishLevel = useCallback(
    (finalErrors: number, finalCorrectFirstTry: number, finalWrong: WrongEntry[]) => {
      const total = order.length
      const seconds = Math.floor((Date.now() - startedAt) / 1000)
      const result: LevelResult = {
        level,
        accuracy: total === 0 ? 0 : finalCorrectFirstTry / total,
        errors: finalErrors,
        seconds,
        date: new Date().toISOString(),
        wrongWordIds: finalWrong.map((w) => w.word.id),
      }
      const progress = loadProgress(adapter.id)
      progress.completedLevels = Array.from(new Set([...progress.completedLevels, level])).sort(
        (a, b) => a - b,
      )
      progress.results[level] = result
      progress.totalAnswered += total
      progress.totalCorrect += finalCorrectFirstTry
      progress.totalSessions += 1
      progress.lastPlayed = result.date
      for (const entry of finalWrong) {
        progress.wrongWords[entry.word.id] = (progress.wrongWords[entry.word.id] ?? 0) + 1
      }
      saveProgress(adapter.id, progress)
      setElapsed(seconds)
      setPhase('summary')
      onLevelComplete(progress, result)
    },
    [adapter.id, level, order, startedAt, onLevelComplete],
  )

  /** Submit an answer for the current word. Returns true when correct. */
  const submit = useCallback(
    (value: string): boolean => {
      if (phase !== 'practicing' || !word) return false
      if (adapter.matches(value, word)) {
        const wasFirstTry = wrongAttempts.length === 0 && !hintUsed
        const nextCorrect = correctFirstTry + (wasFirstTry ? 1 : 0)
        setCorrectFirstTry(nextCorrect)
        setJustCorrect(true)
        setWrongAttempts([])
        setHintUsed(false)
        // Brief green flash, then advance (or finish).
        window.setTimeout(() => {
          setJustCorrect(false)
          if (index + 1 >= order.length) {
            finishLevel(errors, nextCorrect, wrongEntries)
          } else {
            setIndex(index + 1)
          }
        }, 220)
        return true
      }
      // Wrong: shake, count the error, remember the attempt.
      const nextErrors = errors + 1
      setErrors(nextErrors)
      const attempts = [...wrongAttempts, value]
      setWrongAttempts(attempts)
      setShakeKey((k) => k + 1)
      setWrongEntries((prev) => {
        const existing = prev.find((e) => e.word.id === word.id)
        if (existing) {
          return prev.map((e) => (e.word.id === word.id ? { ...e, attempts } : e))
        }
        return [...prev, { word, attempts }]
      })
      return false
    },
    [adapter, correctFirstTry, errors, finishLevel, hintUsed, index, order.length, phase, word, wrongAttempts, wrongEntries],
  )

  /** Reveal the answer: the word no longer counts as first-try correct. */
  const revealHint = useCallback(() => {
    if (phase !== 'practicing' || !word || hintUsed) return
    setHintUsed(true)
    setWrongEntries((prev) => {
      if (prev.some((e) => e.word.id === word.id)) return prev
      return [...prev, { word, attempts: ['（睇咗答案）'] }]
    })
  }, [hintUsed, phase, word])

  const restart = useCallback(() => {
    setOrder(initialOrder())
    setSessionId((s) => s + 1)
    setIndex(0)
    setPhase('practicing')
    setErrors(0)
    setCorrectFirstTry(0)
    setWrongEntries([])
    setWrongAttempts([])
    setHintUsed(false)
    setJustCorrect(false)
    setStartedAt(Date.now())
    setElapsed(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrder])

  const session: PracticeSession = {
    order,
    index,
    word,
    phase,
    errors,
    correctFirstTry,
    wrongEntries,
    wrongAttemptsForCurrent: wrongAttempts,
    shakeKey,
    justCorrect,
    startedAt,
    elapsedSeconds: elapsed,
    random,
  }

  return { session, submit, restart, revealHint, hintUsed, sessionId }
}
