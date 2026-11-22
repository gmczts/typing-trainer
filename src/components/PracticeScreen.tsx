import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useVisualViewportHeight } from '../hooks/useVisualViewport'
import type { LanguageAdapter, WordView } from '../core/types'
import { levelCountFor } from '../core/types'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Progress } from './ui/progress'

/**
 * Secondary-line styling, colour-coded by role (readability pass):
 * - Jyutping / Romanization: orange-red brand (user preference), kept.
 * - Mandarin pinyin: its own teal (teal-700 light / teal-300 dark, both
 *   AA on the card; Memphis uses a darker teal via .tone-pinyin).
 * - Gloss: strong foreground colour.
 * - Example: readable secondary (muted) tone.
 * - Prompt / breakdown: violet accent (distinct from all the above).
 * Secondary lines use font-medium so strokes read clearly on phones.
 * Sizes are one step up from before; compact mode keeps them smaller.
 */
function toneClass(tone: WordView['above'][number]['tone'], compact = false): string {
  switch (tone) {
    case 'jyutping':
    case 'roman':
      // User preference: Jyutping / Romanization ENLARGED and orange-red.
      return compact
        ? 'text-xl font-bold text-brand dark:text-brand-dark tracking-wide'
        : 'text-3xl sm:text-4xl font-bold text-brand dark:text-brand-dark tracking-wide'
    case 'pinyin':
      // Mandarin pinyin SMALLER than Jyutping, in its own teal.
      return compact
        ? 'tone-pinyin text-sm font-medium text-teal-700 dark:text-teal-300'
        : 'tone-pinyin text-base font-medium text-teal-700 dark:text-teal-300'
    case 'gloss':
      return compact ? 'text-base font-medium' : 'text-lg sm:text-xl font-medium'
    case 'gloss2':
      return compact
        ? 'text-sm text-muted-foreground'
        : 'text-base text-muted-foreground'
    case 'example':
      return compact
        ? 'text-sm font-medium text-muted-foreground leading-relaxed'
        : 'text-base font-medium text-muted-foreground leading-relaxed'
    case 'muted':
      return compact ? 'text-xs text-muted-foreground' : 'text-sm text-muted-foreground'
  }
}

/** Visual-viewport height below which the practice screen switches to
 *  its compact word card (keyboard open on a phone). 600px covers the
 *  keyboard-open heights seen on Android (~390–460px) with headroom;
 *  at 600px the full card is borderline, so compact is the safe side. */
const COMPACT_VV_HEIGHT = 600

/** Card-area height below which the compact card is used. HARD LESSON
 *  (2026-11-22, real phone): the visual-viewport height does NOT
 *  always reflect the visible area — on the user's Brave + Sogou
 *  keyboard the word was still clipped at full size while the viewport
 *  reported >= 600px. So compact is ALSO driven by the card area's
 *  own measured height (ResizeObserver): if the full card cannot fit
 *  in the space the layout actually gives it, shrink it. The area
 *  height comes from the flex-1 wrapper, which does not change when
 *  the card shrinks, so this cannot oscillate. */
const COMPACT_AREA_HEIGHT = 480

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
  // Compact card while the keyboard is open: the visual viewport is
  // short, so shrink the word card (smaller word/Jyutping, example
  // sentence and breakdown hidden) so the WORD stays fully visible
  // above the keyboard with no scrolling. Driven by the visual
  // viewport height (not a CSS media query — media queries use the
  // layout viewport, which does not shrink when the keyboard opens)
  // AND by the card area's measured height (see COMPACT_AREA_HEIGHT —
  // the viewport height alone proved unreliable on a real phone).
  // vvHeight / areaHeight are 0 on the very first render: treat that
  // as not compact.
  const vvHeight = useVisualViewportHeight()
  const cardAreaRef = useRef<HTMLDivElement>(null)
  const [areaHeight, setAreaHeight] = useState(0)
  useEffect(() => {
    const el = cardAreaRef.current
    if (!el) return
    const update = () => setAreaHeight(el.clientHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [session.phase])
  // THIRD trigger (2026-11-22, real phone): input focus on a touch
  // device. On the user's Brave + Sogou keyboard the keyboard does NOT
  // shrink the visual viewport at all — no resize event fires, --vv
  // stays at full height, so NEITHER measurement trigger above can
  // fire. But focus is deterministic: on a phone, a focused input
  // means the keyboard is open (or about to be), so the compact card
  // is the right call. Desktop (fine pointer) is unaffected — a mouse
  // click there does not mean a keyboard is covering the screen.
  // The input is auto-focused during practice, so on phones the
  // compact card stays on for the whole session; dismissing the
  // keyboard blurs the input and the full card returns.
  const [inputFocused, setInputFocused] = useState(false)
  const isCoarsePointer = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse)').matches,
    [],
  )
  const compact =
    (vvHeight > 0 && vvHeight < COMPACT_VV_HEIGHT) ||
    (areaHeight > 0 && areaHeight < COMPACT_AREA_HEIGHT) ||
    (inputFocused && isCoarsePointer)

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
          <div className="truncate text-base font-semibold">
            {adapter.name} · 第 {level} 課
          </div>
          <Progress value={((session.index + (session.justCorrect ? 1 : 0)) / session.order.length) * 100} className="mt-1 h-1.5" />
        </div>
        <span className="shrink-0 text-base font-medium tabular-nums text-muted-foreground">
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
      <div ref={cardAreaRef} className="thin-scroll mt-3 flex-1 overflow-y-auto">
        {/* keyed by shakeKey so the shake animation replays on every wrong answer */}
        <div key={session.shakeKey} className={session.shakeKey > 0 ? 'animate-shake' : ''}>
        <div
          className={cn(
            'animate-pop rounded-xl border bg-card text-center shadow',
            compact ? 'p-3' : 'p-4 sm:p-5',
            session.justCorrect && 'border-green-500/60',
          )}
        >
          <div className="space-y-1">
            {word.above.map((line, i) => (
              <div key={i} className={toneClass(line.tone, compact)}>
                {line.text}
              </div>
            ))}
          </div>
          <div
            className={cn(
              'font-bold leading-tight tracking-wide',
              compact ? 'py-1 text-4xl' : 'py-2 text-6xl sm:text-7xl',
            )}
          >
            {word.display}
          </div>
          <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
            {(compact
              ? word.below.filter((line) => line.tone !== 'example')
              : word.below
            ).map((line, i) => (
              <div key={i} className={toneClass(line.tone, compact)}>
                {line.text}
              </div>
            ))}
          </div>
          {word.prompt && !compact && (
            <div className="mt-3 rounded-lg bg-muted px-3 py-1.5 font-mono text-base font-medium text-violet-700 dark:text-violet-300">
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

      {/* Input — pinned at the bottom of the visible area.
          autoComplete="off" + neutral name/id: mobile browsers must NOT
          treat this as a credential field (Brave showed a
          password-manager key icon over it). type="text" explicit. */}
      <div className="mt-3 shrink-0">
        {/* The form carries autoComplete="off" too: some mobile browsers
            only honour the opt-out at form level. onSubmit is prevented —
            Enter is already handled by the input's onKeyDown. */}
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        <Input
          key={`${adapter.id}:${level}:${sessionId}:${session.index}`}
          ref={inputRef}
          id="typing-answer"
          name="typing-answer"
          type="text"
          autoComplete="off"
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
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          autoCapitalize={adapter.inputProps.autoCapitalize}
          autoCorrect={adapter.inputProps.autoCorrect}
          spellCheck={adapter.inputProps.spellCheck}
          inputMode={adapter.inputProps.inputMode}
          lang={adapter.inputProps.lang}
          aria-label="輸入答案"
          className={cn(
            // Bigger on purpose (mobile h-14, desktop h-20) — the input
            // is the main touch target while typing. The placeholder
            // shows the same hint code as the hint line below, in the
            // prominent brand colour. md:text-2xl is needed because the
            // base Input sets md:text-sm, which would otherwise shrink
            // the text back to 14px on desktop widths.
            'practice-input h-14 text-center text-xl tracking-wider sm:h-20 sm:text-2xl md:text-2xl placeholder:font-semibold placeholder:text-brand dark:placeholder:text-brand-dark',
            session.justCorrect && 'border-green-500 ring-2 ring-green-500/40',
          )}
        />
        </form>
        <div className="mt-2 flex items-center justify-between text-sm font-medium text-muted-foreground sm:text-base">
          <span>
            {hintUsed ? (
              <>
                答案：
                <span className="font-semibold text-brand sm:text-lg dark:text-brand-dark">
                  {word.answer}
                </span>
              </>
            ) : (
              <>
                提示：
                <span className="font-semibold text-brand sm:text-lg dark:text-brand-dark">
                  {word.hint}
                </span>
              </>
            )}
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
