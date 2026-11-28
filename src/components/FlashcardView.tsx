import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Layers, RotateCcw, Shuffle, Star } from 'lucide-react'
import { loadProgress, setMastery, toggleFavorite } from '../core/storage'
import { levelCountFor, type LanguageAdapter, type WordView } from '../core/types'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Progress } from './ui/progress'

export interface FlashcardViewProps {
  adapter: LanguageAdapter
  /** Deck pushed in from the word book (review wrong/favourite words). */
  initialDeck?: { words: WordView[]; title: string } | null
  onClearDeck?: () => void
  onPracticeWord: (wordId: string) => void
}

type DeckSource =
  | { kind: 'level'; level: number }
  | { kind: 'wrong' }
  | { kind: 'favorites' }
  | { kind: 'unmastered' }

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

/** Small tone styling for the card faces (same roles as PracticeScreen). */
function toneClass(tone: WordView['above'][number]['tone']): string {
  switch (tone) {
    case 'jyutping':
    case 'roman':
      return 'text-lg font-bold text-brand dark:text-brand-dark'
    case 'pinyin':
      return 'text-sm font-medium text-teal-700 dark:text-teal-300'
    case 'gloss':
      return 'text-base font-medium'
    case 'gloss2':
    case 'example':
    case 'muted':
      return 'text-sm text-muted-foreground'
  }
}

/**
 * v8 flashcards (from the Spanish / Korean / HSK reference sites):
 * tap to flip, Space flips, arrows move, "記住了 / 還要再看" records
 * mastery (2 / 1) per word. Decks: one level, wrong words, favourites,
 * or unmastered words.
 */
export function FlashcardView({ adapter, initialDeck, onClearDeck, onPracticeWord }: FlashcardViewProps) {
  const [progress, setProgress] = useState(() => loadProgress(adapter.id))
  const totalLevels = levelCountFor(adapter.words.length)
  const nextLevel =
    progress.completedLevels.length === 0
      ? 1
      : Math.min(Math.max(...progress.completedLevels) + 1, totalLevels)
  const [level, setLevel] = useState(nextLevel)
  const [deck, setDeck] = useState<WordView[] | null>(() =>
    initialDeck ? shuffle(initialDeck.words) : null,
  )
  const [deckTitle, setDeckTitle] = useState(initialDeck?.title ?? '')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [knownCount, setKnownCount] = useState(0)
  const [done, setDone] = useState(false)
  const [starred, setStarred] = useState<Set<string>>(
    () => new Set(progress.favorites ?? []),
  )

  // A deck pushed in from the word book starts immediately.
  useEffect(() => {
    if (initialDeck) {
      setDeck(shuffle(initialDeck.words))
      setDeckTitle(initialDeck.title)
      setIndex(0)
      setFlipped(false)
      setKnownCount(0)
      setDone(false)
    }
  }, [initialDeck])

  const reload = useCallback(() => {
    setProgress(loadProgress(adapter.id))
  }, [adapter.id])

  const buildDeck = (source: DeckSource): { words: WordView[]; title: string } | null => {
    const p = loadProgress(adapter.id)
    if (source.kind === 'level') {
      const words = adapter.words.filter((w) => w.level === source.level)
      return { words, title: `第 ${source.level} 課` }
    }
    if (source.kind === 'wrong') {
      const words = Object.keys(p.wrongWords)
        .map((id) => adapter.words.find((w) => w.id === id))
        .filter((w): w is WordView => !!w)
      return { words, title: '錯詞複習' }
    }
    if (source.kind === 'favorites') {
      const words = (p.favorites ?? [])
        .map((id) => adapter.words.find((w) => w.id === id))
        .filter((w): w is WordView => !!w)
      return { words, title: '收藏複習' }
    }
    // Unmastered: seen but not known (mastery 1, or wrong and not known).
    const words = adapter.words.filter((w) => {
      const m = p.mastery?.[w.id] ?? 0
      if (m === 2) return false
      return m === 1 || w.id in p.wrongWords
    })
    return { words, title: '學習中嘅詞' }
  }

  const startDeck = (source: DeckSource) => {
    const built = buildDeck(source)
    if (!built || built.words.length === 0) return
    setDeck(shuffle(built.words))
    setDeckTitle(built.title)
    setIndex(0)
    setFlipped(false)
    setKnownCount(0)
    setDone(false)
    reload()
  }

  const counts = useMemo(() => {
    const p = progress
    const unmastered = adapter.words.filter((w) => {
      const m = p.mastery?.[w.id] ?? 0
      return m !== 2 && (m === 1 || w.id in p.wrongWords)
    }).length
    return {
      wrong: Object.keys(p.wrongWords).length,
      favorites: (p.favorites ?? []).length,
      unmastered,
    }
  }, [adapter.words, progress])

  const word = deck?.[index]
  const total = deck?.length ?? 0

  const go = useCallback(
    (delta: number) => {
      if (!deck) return
      setFlipped(false)
      const next = index + delta
      if (next >= deck.length) setDone(true)
      else if (next >= 0) setIndex(next)
    },
    [deck, index],
  )

  const mark = useCallback(
    (known: boolean) => {
      if (!word) return
      setMastery(adapter.id, word.id, known ? 2 : 1)
      if (known) setKnownCount((c) => c + 1)
      reload()
      go(1)
    },
    [adapter.id, go, reload, word],
  )

  // Keyboard: Space flips, arrows move (same as the reference sites).
  useEffect(() => {
    if (!deck || done) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (e.key === 'ArrowRight') {
        go(1)
      } else if (e.key === 'ArrowLeft') {
        go(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deck, done, go])

  const resetToSetup = () => {
    setDeck(null)
    setDeckTitle('')
    setIndex(0)
    setFlipped(false)
    setKnownCount(0)
    setDone(false)
    onClearDeck?.()
    reload()
  }

  const reshuffle = () => {
    if (!deck) return
    setDeck(shuffle(deck))
    setIndex(0)
    setFlipped(false)
    setKnownCount(0)
    setDone(false)
  }

  if (!deck) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h3 className="font-display text-lg font-bold">閃卡記憶</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                點卡翻面睇答案，記住就撳「記住了」。鍵盤：空白鍵翻面，← → 換卡。
              </p>
            </div>
            <div>
              <label htmlFor="fc-level" className="mb-1 block text-sm font-medium">
                揀一課
              </label>
              <div className="flex gap-2">
                <select
                  id="fc-level"
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
                <Button onClick={() => startDeck({ kind: 'level', level })}>開始</Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                disabled={counts.wrong === 0}
                onClick={() => startDeck({ kind: 'wrong' })}
              >
                錯詞（{counts.wrong}）
              </Button>
              <Button
                variant="outline"
                disabled={counts.favorites === 0}
                onClick={() => startDeck({ kind: 'favorites' })}
              >
                收藏（{counts.favorites}）
              </Button>
              <Button
                variant="outline"
                disabled={counts.unmastered === 0}
                onClick={() => startDeck({ kind: 'unmastered' })}
              >
                學習中（{counts.unmastered}）
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (done || !word) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-5 text-center">
            <Layers className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <h3 className="font-display text-xl font-bold">{deckTitle}完成！</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              記住咗 {knownCount} / {total} 張
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button onClick={reshuffle}>
                <RotateCcw className="h-4 w-4" /> 再嚟一次（洗牌）
              </Button>
              <Button variant="outline" onClick={resetToSetup}>
                揀另一組
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {deckTitle} · {index + 1}/{total}
        </span>
        <Progress value={((index + (flipped ? 0.5 : 0)) / total) * 100} className="h-2 flex-1" />
        <span className="text-sm text-muted-foreground">記住 {knownCount}</span>
        <Button variant="ghost" size="icon" onClick={reshuffle} aria-label="洗牌">
          <Shuffle className="h-4 w-4" />
        </Button>
      </div>

      <div className="flip-scene">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setFlipped((f) => !f)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setFlipped((f) => !f)
            }
          }}
          className={cn(
            'flip-card block h-[320px] w-full cursor-pointer text-center sm:h-[340px]',
            flipped && 'flipped',
          )}
          aria-label={flipped ? '翻返正面' : '翻面睇答案'}
        >
          {/* Front */}
          <div className="flip-face rounded-2xl border bg-card p-6 shadow">
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <div className="space-y-1">
                {word.above.map((line, i) => (
                  <div key={i} className={toneClass(line.tone)}>
                    {line.text}
                  </div>
                ))}
              </div>
              <div className="py-1 text-5xl font-bold leading-tight tracking-wide sm:text-6xl">
                {word.display}
              </div>
              <div className="text-xs tracking-widest text-muted-foreground">點卡翻面 · 空白鍵</div>
            </div>
          </div>
          {/* Back */}
          <div className="flip-face back rounded-2xl border bg-muted p-6 shadow">
            <div className="flex h-full flex-col items-center justify-center gap-1.5 overflow-y-auto">
              <div className="text-2xl font-bold">{word.display}</div>
              {word.below.map((line, i) => (
                <div key={i} className={toneClass(line.tone)}>
                  {line.text}
                </div>
              ))}
              <div className="mt-2 font-mono text-base font-semibold text-brand dark:text-brand-dark">
                {word.answer}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={(e) => {
                  e.stopPropagation()
                  onPracticeWord(word.id)
                }}
              >
                練呢個字
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" onClick={() => go(-1)} disabled={index === 0} aria-label="上一張">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-1 gap-2">
          <Button variant="outline" className="flex-1" onClick={() => mark(false)}>
            還要再看
          </Button>
          <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => mark(true)}>
            記住了
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={starred.has(word.id) ? '取消收藏' : '收藏'}
          onClick={() => {
            const next = toggleFavorite(adapter.id, word.id)
            setStarred((s) => {
              const copy = new Set(s)
              if (next) copy.add(word.id)
              else copy.delete(word.id)
              return copy
            })
            reload()
          }}
        >
          <Star
            className={cn(
              'h-5 w-5',
              starred.has(word.id) ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground',
            )}
          />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => go(1)} aria-label="下一張">
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        空白鍵翻面 · ← → 換卡 · 記住嘅詞會標做「已掌握」
      </p>
    </div>
  )
}
