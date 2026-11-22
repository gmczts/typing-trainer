import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Home,
  RotateCcw,
  Shuffle,
} from 'lucide-react'
import { usePractice } from '../hooks/usePractice'
import type { LanguageAdapter, WordView } from '../core/types'
import { levelCountFor } from '../core/types'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Progress } from './ui/progress'

function toneClass(tone: WordView['above'][number]['tone']): string {
  switch (tone) {
    case 'jyutping':
    case 'roman':
      // User preference: Jyutping / Romanization ENLARGED and orange-red.
      return 'text-2xl sm:text-3xl font-bold text-brand dark:text-brand-dark tracking-wide'
    case 'pinyin':
      // Mandarin pinyin SMALLER and grey.
      return 'text-sm text-muted-foreground'
    case 'gloss':
      return 'text-base sm:text-lg font-medium'
    case 'gloss2':
      return 'text-sm text-muted-foreground'
    case 'example':
      return 'text-sm text-muted-foreground leading-relaxed'
    case 'muted':
      return 'text-xs text-muted-foreground'
  }
}

export interface PracticeScreenProps {
  adapter: LanguageAdapter
  level: number
  random: boolean
  focusWordId?: string | null
  onRandomChange: (random: boolean) => void
  onExit: () => void
  onGoLevel: (level: number) => void
}

/**
 * Practice screen — designed FIRST for the visible area above the
 * on-screen keyboard on phones:
 * - the whole screen is exactly `var(--vv)` tall (visualViewport height),
 * - header + word card scroll, input stays pinned at the bottom,
 * - compact spacing on small screens, no fixed heights that push the
 *   input below the fold.
 *
 * HARD LESSON (IME leak): the <input> is keyed by
 * `${adapter.id}:${level}:${sessionId}:${index}` so React remounts a
 * FRESH input element on every word change — composition state from the
 * previous word can never leak into the next word.
 */
export function PracticeScreen({
  adapter,
  level,
  random,
  focusWordId,
  onRandomChange,
  onExit,
  onGoLevel,
}: PracticeScreenProps) {
  const { session, submit, restart, revealHint, hintUsed, sessionId } = usePractice({
    adapter,
    level,
    random,
    focusWordId,
    onLevelComplete: () => undefined,
  })
  const [value, setValue] = useState('')
  const [composing, setComposing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const word = session.word
  const totalLevels = levelCountFor(adapter.words.length)

  // Refocus the fresh input whenever the word changes.
  useEffect(() => {
    setValue('')
    inputRef.current?.focus()
  }, [session.index, sessionId])

  if (!word) return null

  if (session.phase === 'summary') {
    const total = session.order.length
    const accuracy = total === 0 ? 0 : Math.round((session.correctFirstTry / total) * 100)
    return (
      <div className="mx-auto flex h-[calc(var(--vv)-2.75rem)] w-full max-w-lg flex-col overflow-y-auto px-4 py-4">
        <div className="animate-pop rounded-xl border bg-card p-5 text-center shadow">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15 text-green-600">
            <Check className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold">第 {level} 課完成！</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {adapter.name} · {total} 個詞 · {Math.floor(session.elapsedSeconds / 60)}分
            {session.elapsedSeconds % 60}秒
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted p-3">
              <div className="text-2xl font-bold">{accuracy}%</div>
              <div className="text-xs text-muted-foreground">準確率</div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="text-2xl font-bold">{session.correctFirstTry}/{total}</div>
              <div className="text-xs text-muted-foreground">一次答啱</div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="text-2xl font-bold">{session.errors}</div>
              <div className="text-xs text-muted-foreground">錯咗幾次</div>
            </div>
          </div>

          {session.wrongEntries.length > 0 && (
            <div className="mt-4 text-left">
              <h3 className="mb-2 text-sm font-semibold">要再練嘅詞</h3>
              <ul className="space-y-1.5">
                {session.wrongEntries.map((entry) => (
                  <li
                    key={entry.word.id}
                    className="flex items-baseline justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{entry.word.display}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {entry.word.answer}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2">
            {level < totalLevels && (
              <Button onClick={() => onGoLevel(level + 1)}>
                下一課 <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" onClick={restart}>
              <RotateCcw className="h-4 w-4" /> 再練一次
            </Button>
            <Button variant="ghost" onClick={onExit}>
              <Home className="h-4 w-4" /> 返{adapter.name}主頁
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const handleChange = (next: string) => {
    setValue(next)
    // Auto-advance on a correct answer (but never mid-IME-composition).
    if (!composing && next.trim() !== '' && adapter.matches(next, word)) {
      submit(next)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim() !== '') {
      submit(value)
      if (!adapter.matches(value, word)) setValue('')
    }
  }

  return (
    <div className="mx-auto flex h-[calc(var(--vv)-2.75rem)] w-full max-w-lg flex-col overflow-hidden px-4 pb-3 pt-3">
      {/* Compact header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onExit} aria-label="返回">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {adapter.name} · 第 {level} 課
          </div>
          <Progress value={((session.index + (session.justCorrect ? 1 : 0)) / session.order.length) * 100} className="mt-1 h-1.5" />
        </div>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
          {session.index + 1}/{session.order.length}
        </span>
        <Button
          variant={random ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => onRandomChange(!random)}
          aria-label="隨機順序"
          title={random ? '隨機順序：開' : '隨機順序：關'}
        >
          <Shuffle className="h-4 w-4" />
        </Button>
      </div>

      {/* Word card — scrolls if the screen is short */}
      <div className="thin-scroll mt-3 flex-1 overflow-y-auto">
        {/* keyed by shakeKey so the shake animation replays on every wrong answer */}
        <div key={session.shakeKey} className={session.shakeKey > 0 ? 'animate-shake' : ''}>
        <div
          className={cn(
            'animate-pop rounded-xl border bg-card p-4 text-center shadow sm:p-5',
            session.justCorrect && 'border-green-500/60',
          )}
        >
          <div className="space-y-1">
            {word.above.map((line, i) => (
              <div key={i} className={toneClass(line.tone)}>
                {line.text}
              </div>
            ))}
          </div>
          <div className="py-2 text-5xl font-bold leading-tight tracking-wide sm:text-6xl">
            {word.display}
          </div>
          <div className="space-y-1.5">
            {word.below.map((line, i) => (
              <div key={i} className={toneClass(line.tone)}>
                {line.text}
              </div>
            ))}
          </div>
          {word.prompt && (
            <div className="mt-3 rounded-lg bg-muted px-3 py-1.5 font-mono text-sm text-muted-foreground">
              {word.promptLabel ? `${word.promptLabel}：` : ''}
              {word.prompt}
            </div>
          )}
        </div>
        </div>

        {session.wrongAttemptsForCurrent.length > 0 && (
          <div className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            啱啱打錯咗：{session.wrongAttemptsForCurrent.join(' · ')}
            <span className="ml-2 text-muted-foreground">正確答案：{word.answer}</span>
          </div>
        )}
      </div>

      {/* Input — pinned at the bottom of the visible area */}
      <div className="mt-3 shrink-0">
        <Input
          key={`${adapter.id}:${level}:${sessionId}:${session.index}`}
          ref={inputRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={(e) => {
            setComposing(false)
            handleChange(e.currentTarget.value)
          }}
          placeholder={word.hint}
          autoFocus
          autoCapitalize={adapter.inputProps.autoCapitalize}
          autoCorrect={adapter.inputProps.autoCorrect}
          spellCheck={adapter.inputProps.spellCheck}
          inputMode={adapter.inputProps.inputMode}
          lang={adapter.inputProps.lang}
          aria-label="輸入答案"
          className={cn(
            'h-12 text-center text-lg tracking-wider',
            session.justCorrect && 'border-green-500 ring-2 ring-green-500/40',
          )}
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {hintUsed ? `答案：${word.answer}` : `提示：${word.hint}`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              revealHint()
            }}
            disabled={hintUsed}
          >
            <Eye className="h-3.5 w-3.5" /> 睇答案
          </Button>
        </div>
      </div>
    </div>
  )
}
