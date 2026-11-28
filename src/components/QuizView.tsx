import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, RotateCcw, Target, X } from 'lucide-react'
import { loadProgress, setMastery } from '../core/storage'
import { levelCountFor, type LanguageAdapter, type WordView } from '../core/types'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Progress } from './ui/progress'

export interface QuizViewProps {
  adapter: LanguageAdapter
  onPracticeWord: (wordId: string) => void
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

interface Question {
  word: WordView
  options: string[]
}

/** First gloss line of a word (the meaning shown as the quiz prompt in word mode). */
function firstGloss(w: WordView): string {
  return w.below.find((l) => l.tone === 'gloss')?.text ?? ''
}

/**
 * v8 quiz (from the Spanish / Korean / HSK reference sites): four
 * choices, score, wrong-word review at the end.
 *
 * Two question shapes, by language:
 * - "code" (Cantonese SGPB, Japanese romaji, Chinese pinyin): the
 *   answer differs from the display — show the word, pick its code.
 * - "word" (Korean, Spanish): the answer IS the word — show the
 *   meaning, pick the word.
 */
export function QuizView({ adapter, onPracticeWord }: QuizViewProps) {
  const [progress, setProgress] = useState(() => loadProgress(adapter.id))
  const totalLevels = levelCountFor(adapter.words.length)
  const nextLevel =
    progress.completedLevels.length === 0
      ? 1
      : Math.min(Math.max(...progress.completedLevels) + 1, totalLevels)
  const [level, setLevel] = useState(nextLevel)
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [qIndex, setQIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongList, setWrongList] = useState<{ word: WordView; picked: string }[]>([])
  const [done, setDone] = useState(false)

  // Answer differs from display for code-type languages.
  const mode: 'code' | 'word' = useMemo(() => {
    const first = adapter.words[0]
    return first && first.answer !== first.display ? 'code' : 'word'
  }, [adapter])

  const buildOptions = useCallback(
    (word: WordView, pool: WordView[]): string[] => {
      const keyOf = (w: WordView) => (mode === 'code' ? w.answer : w.display)
      const correct = keyOf(word)
      const seen = new Set([correct])
      const distractors: string[] = []
      const takeFrom = (list: WordView[]) => {
        for (const w of shuffle(list)) {
          if (distractors.length >= 3) break
          if (w.id === word.id) continue
          // Word mode asks by meaning: a distractor sharing the question
          // word's gloss (e.g. Spanish el / la, both "这") would make the
          // question unanswerable, so exclude it as well.
          if (mode === 'word') {
            const g = firstGloss(w)
            if (g && g === firstGloss(word)) continue
          }
          const k = keyOf(w)
          if (!seen.has(k)) {
            seen.add(k)
            distractors.push(k)
          }
        }
      }
      takeFrom(pool)
      if (distractors.length < 3) takeFrom(adapter.words)
      return shuffle([correct, ...distractors])
    },
    [adapter.words, mode],
  )

  const start = useCallback(
    (lv: number) => {
      const pool = adapter.words.filter((w) => w.level === lv)
      const qs = shuffle(pool).map((word) => ({
        word,
        options: buildOptions(word, pool),
      }))
      setQuestions(qs)
      setQIndex(0)
      setPicked(null)
      setCorrectCount(0)
      setWrongList([])
      setDone(false)
    },
    [adapter.words, buildOptions],
  )

  const applyMastery = useCallback(
    (wordId: string, correct: boolean) => {
      const p = loadProgress(adapter.id)
      const cur = p.mastery?.[wordId] ?? 0
      const next = correct ? Math.max(cur, 1) : 1
      if (next !== cur) setMastery(adapter.id, wordId, next)
      setProgress(loadProgress(adapter.id))
    },
    [adapter.id],
  )

  const question = questions?.[qIndex]
  const total = questions?.length ?? 0

  const pick = useCallback(
    (option: string) => {
      if (!question || picked !== null) return
      setPicked(option)
      const correct = option === (mode === 'code' ? question.word.answer : question.word.display)
      if (correct) {
        setCorrectCount((c) => c + 1)
      } else {
        setWrongList((list) => [...list, { word: question.word, picked: option }])
      }
      applyMastery(question.word.id, correct)
    },
    [applyMastery, mode, picked, question],
  )

  const next = useCallback(() => {
    if (!questions) return
    setPicked(null)
    if (qIndex + 1 >= questions.length) setDone(true)
    else setQIndex((i) => i + 1)
  }, [qIndex, questions])

  // Keyboard: 1–4 picks an option, Enter moves on.
  useEffect(() => {
    if (!questions || done) return
    const onKey = (e: KeyboardEvent) => {
      if (picked === null) {
        const n = Number(e.key)
        if (n >= 1 && n <= 4 && question && question.options[n - 1]) {
          pick(question.options[n - 1] as string)
        }
      } else if (e.key === 'Enter') {
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, next, pick, picked, question, questions])

  if (!questions) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h3 className="font-display text-lg font-bold">四選一測驗</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === 'code'
                  ? '睇住個詞，揀啱佢嘅編碼／拼音／羅馬音。'
                  : '睇住意思，揀啱邊個詞。'}
                鍵盤 1–4 作答，Enter 下一題。
              </p>
            </div>
            <div>
              <label htmlFor="qz-level" className="mb-1 block text-sm font-medium">
                揀一課
              </label>
              <div className="flex gap-2">
                <select
                  id="qz-level"
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-base"
                >
                  {Array.from({ length: totalLevels }, (_, i) => i + 1).map((lv) => (
                    <option key={lv} value={lv}>
                      第 {lv} 課
                      {progress.completedLevels.includes(lv) ? '（已完成）' : ''}
                    </option>
                  ))}
                </select>
                <Button onClick={() => start(level)}>開始測驗</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (done) {
    const pct = total === 0 ? 0 : Math.round((correctCount / total) * 100)
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-5 text-center">
            <div
              className="mx-auto mb-3 grid h-28 w-28 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#16a34a ${pct}%, var(--muted) 0)`,
              }}
            >
              <div className="grid h-24 w-24 place-items-center rounded-full bg-card">
                <span className="font-display text-3xl font-bold tabular-nums">{pct}%</span>
              </div>
            </div>
            <h3 className="font-display text-xl font-bold">測驗完成！</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              答啱 {correctCount} / {total} 題
            </p>
            {wrongList.length > 0 && (
              <div className="mt-4 text-left">
                <h4 className="mb-2 text-sm font-semibold">答錯嘅詞（撳入去再練）</h4>
                <ul className="space-y-1.5">
                  {wrongList.map(({ word, picked: p }) => (
                    <li key={word.id}>
                      <button
                        type="button"
                        onClick={() => onPracticeWord(word.id)}
                        className="flex w-full items-baseline justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span className="font-medium">{word.display}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          你揀咗 {p} · 正確 {mode === 'code' ? word.answer : word.display}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-5 flex flex-col gap-2">
              <Button onClick={() => start(level)}>
                <RotateCcw className="h-4 w-4" /> 再測一次
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setQuestions(null)
                  setDone(false)
                }}
              >
                揀另一課
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!question) return null
  const word = question.word
  const correctKey = mode === 'code' ? word.answer : word.display
  const glossLines = word.below.filter((l) => l.tone === 'gloss' || l.tone === 'gloss2')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Target className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">
          第 {level} 課 · {qIndex + 1}/{total}
        </span>
        <Progress value={(qIndex / total) * 100} className="h-2 flex-1" />
        <span className="text-sm text-muted-foreground">啱 {correctCount}</span>
      </div>

      <Card>
        <CardContent className="p-5 text-center">
          <div className="text-xs tracking-widest text-muted-foreground">
            {mode === 'code' ? '揀啱佢嘅編碼／拼音／羅馬音' : '邊個詞係呢個意思？'}
          </div>
          {mode === 'code' && (
            <div className="mt-2 text-5xl font-bold leading-tight tracking-wide">{word.display}</div>
          )}
          <div className="mt-2 space-y-0.5">
            {glossLines.map((line, i) => (
              <div
                key={i}
                className={line.tone === 'gloss' ? 'text-lg font-medium' : 'text-base text-muted-foreground'}
              >
                {line.text}
              </div>
            ))}
            {mode === 'word' && word.above.length > 0 && (
              <div className="text-sm text-muted-foreground">{word.above[0]?.text}</div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {question.options.map((opt, i) => {
          const isCorrect = opt === correctKey
          const isPicked = picked === opt
          return (
            <button
              key={opt}
              type="button"
              disabled={picked !== null}
              onClick={() => pick(opt)}
              className={cn(
                'flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 text-left shadow-sm transition-colors',
                picked === null && 'hover:border-primary',
                picked !== null && isCorrect && 'border-green-600 bg-green-500/10',
                picked !== null && isPicked && !isCorrect && 'border-red-500 bg-red-500/10',
                picked !== null && !isPicked && !isCorrect && 'opacity-55',
              )}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs">
                {i + 1}
              </span>
              <span className={cn('min-w-0 flex-1 break-words font-medium', mode === 'code' ? 'font-mono' : 'text-xl')}>
                {opt}
              </span>
              {picked !== null && isCorrect && <Check className="h-5 w-5 shrink-0 text-green-600" />}
              {picked !== null && isPicked && !isCorrect && <X className="h-5 w-5 shrink-0 text-red-500" />}
            </button>
          )
        })}
      </div>

      <div className="flex min-h-9 items-center justify-between">
        <span
          className={cn(
            'text-sm font-medium',
            picked === null
              ? 'text-muted-foreground'
              : picked === correctKey
                ? 'text-green-600'
                : 'text-red-500',
          )}
        >
          {picked === null
            ? '撳一個答案（鍵盤 1–4）'
            : picked === correctKey
              ? '啱！'
              : `唔啱，正確答案係 ${correctKey}`}
        </span>
        {picked !== null && (
          <Button onClick={next}>
            {qIndex + 1 >= total ? '睇成績' : '下一題'} <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
