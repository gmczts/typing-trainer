import { useCallback, useState } from 'react'
import { ArrowLeft, BookOpen, Bookmark, ChartBar, Keyboard, Layers, Play, Target } from 'lucide-react'
import { loadProgress } from '../core/storage'
import { levelCountFor, type LanguageAdapter, type LanguageProgress, type WordView } from '../core/types'
import { cn } from '../lib/utils'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Progress } from './ui/progress'
import { DictionaryView } from './DictionaryView'
import { FlashcardView } from './FlashcardView'
import { KeymapView } from './KeymapView'
import { LevelGrid } from './LevelGrid'
import { PracticeScreen } from './PracticeScreen'
import { QuizView } from './QuizView'
import { StatsView } from './StatsView'
import { WordBookView } from './WordBookView'

export type LanguageTab = 'practice' | 'flashcards' | 'quiz' | 'wordbook' | 'stats' | 'dictionary' | 'keymap'

export interface LanguageHomeProps {
  adapter: LanguageAdapter
  onBack: () => void
}

interface PracticeTarget {
  level: number
  focusWordId: string | null
}

/**
 * Per-language screen: level picker + progress, stats, dictionary, keymap.
 * Practice itself is a full-screen takeover (PracticeScreen) so the
 * keyboard-fit layout owns the whole visible area.
 */
export function LanguageHome({ adapter, onBack }: LanguageHomeProps) {
  const [tab, setTab] = useState<LanguageTab>('practice')
  const [progress, setProgress] = useState<LanguageProgress>(() => loadProgress(adapter.id))
  const [random, setRandom] = useState(false)
  const [practiceTarget, setPracticeTarget] = useState<PracticeTarget | null>(null)
  // Deck pushed in from the word book (flashcard review of one group).
  const [flashDeck, setFlashDeck] = useState<{ words: WordView[]; title: string } | null>(null)

  const totalLevels = levelCountFor(adapter.words.length)
  const nextLevel =
    progress.completedLevels.length === 0
      ? 1
      : Math.min((Math.max(...progress.completedLevels) + 1), totalLevels)
  const [selectedLevel, setSelectedLevel] = useState(nextLevel)

  const reloadProgress = useCallback(() => {
    setProgress(loadProgress(adapter.id))
  }, [adapter.id])

  const practiceWord = useCallback((wordId: string) => {
    const word = adapter.words.find((w) => w.id === wordId)
    if (!word) return
    setPracticeTarget({ level: word.level, focusWordId: word.id })
  }, [adapter.words])

  if (practiceTarget) {
    return (
      <PracticeScreen
        // Remount on level / focus-word change: usePractice initialises
        // its session state once, so without this key a level change
        // (e.g. summary "下一課") only changed the header text while
        // the old session stayed on the summary screen (bug 2026-11-22).
        // Random is deliberately NOT in the key: toggling it mid-lesson
        // must not reset the current session.
        key={`${practiceTarget.level}:${practiceTarget.focusWordId ?? ''}`}
        adapter={adapter}
        level={practiceTarget.level}
        random={random}
        focusWordId={practiceTarget.focusWordId}
        onRandomChange={setRandom}
        onExit={() => {
          setPracticeTarget(null)
          reloadProgress()
        }}
        onGoLevel={(level) => setPracticeTarget({ level, focusWordId: null })}
      />
    )
  }

  const tabs: { id: LanguageTab; label: string; icon: typeof Play }[] = [
    { id: 'practice', label: '練習', icon: Play },
    { id: 'flashcards', label: '閃卡', icon: Layers },
    { id: 'quiz', label: '測驗', icon: Target },
    { id: 'wordbook', label: '生詞本', icon: Bookmark },
    { id: 'stats', label: '統計', icon: ChartBar },
    { id: 'dictionary', label: '字典', icon: BookOpen },
    { id: 'keymap', label: '鍵盤', icon: Keyboard },
  ]

  return (
    <div className="mx-auto flex min-h-[var(--vv)] w-full max-w-2xl flex-col px-4 pb-8 pt-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="返主頁">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-2xl font-bold">
          {adapter.name}
          <span className="ml-2 font-sans text-base font-normal text-muted-foreground">
            {adapter.englishName}
          </span>
        </h1>
        {adapter.isStub && <Badge variant="secondary">試行版詞庫</Badge>}
      </div>
      <p className="mt-1 text-base text-muted-foreground">{adapter.tagline}</p>

      {adapter.isStub && (
        <Card className="mt-3 border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="p-3 text-sm">
            西班牙文而家用緊 55 詞試行版詞庫，完整 6,000 詞詞庫就快到——到時會自動取代，進度唔會受影響。
          </CardContent>
        </Card>
      )}

      {/* Tab bar — scrolls horizontally on narrow phones (7 tabs).
          The right-edge fade (phones only) hints more tabs hide
          off-screen to the right (review P2 #8). */}
      <div className="relative mt-4">
        <div className="thin-scroll flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-base font-medium transition-colors',
                tab === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-current={tab === id ? 'true' : undefined}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-lg bg-gradient-to-l from-muted to-transparent md:hidden"
        />
      </div>

      <div className="mt-4">
        {tab === 'practice' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-base text-muted-foreground">已完成</span>
                  <span className="text-base font-semibold">
                    {progress.completedLevels.length} / {totalLevels} 課
                  </span>
                </div>
                <Progress
                  value={totalLevels === 0 ? 0 : (progress.completedLevels.length / totalLevels) * 100}
                  className="mt-2"
                />
                <div className="mt-4 flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => setPracticeTarget({ level: selectedLevel, focusWordId: null })}
                  >
                    <Play className="h-4 w-4" /> 練第 {selectedLevel} 課
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPracticeTarget({ level: nextLevel, focusWordId: null })}
                  >
                    繼續
                  </Button>
                </div>
                <label className="mt-3 flex cursor-pointer items-center justify-between text-base">
                  <span>隨機順序</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={random}
                    onClick={() => setRandom((r) => !r)}
                    className={cn(
                      'relative h-5 w-9 rounded-full transition-colors',
                      random ? 'bg-primary' : 'bg-input',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-all',
                        random ? 'left-[18px]' : 'left-0.5',
                      )}
                    />
                  </button>
                </label>
              </CardContent>
            </Card>
            <div>
              <h2 className="mb-2 text-base font-semibold text-muted-foreground">
                全部課數（撳一課即練）
              </h2>
              <LevelGrid
                wordCount={adapter.words.length}
                completedLevels={progress.completedLevels}
                currentLevel={selectedLevel}
                onSelect={(level) => {
                  setSelectedLevel(level)
                  setPracticeTarget({ level, focusWordId: null })
                }}
              />
            </div>
          </div>
        )}
        {tab === 'flashcards' && (
          <FlashcardView
            adapter={adapter}
            initialDeck={flashDeck}
            onClearDeck={() => setFlashDeck(null)}
            onPracticeWord={practiceWord}
          />
        )}
        {tab === 'quiz' && <QuizView adapter={adapter} onPracticeWord={practiceWord} />}
        {tab === 'wordbook' && (
          <WordBookView
            adapter={adapter}
            onPracticeWord={practiceWord}
            onFlashcardDeck={(deck) => {
              setFlashDeck(deck)
              setTab('flashcards')
            }}
          />
        )}
        {tab === 'stats' && (
          <StatsView adapter={adapter} progress={progress} onPracticeWord={practiceWord} />
        )}
        {tab === 'dictionary' && (
          <DictionaryView adapter={adapter} onPracticeWord={practiceWord} />
        )}
        {tab === 'keymap' && <KeymapView adapter={adapter} />}
      </div>
    </div>
  )
}
