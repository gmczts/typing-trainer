import { useMemo, useState } from 'react'
import { Bookmark, Layers, Play, Star } from 'lucide-react'
import { loadProgress, toggleFavorite } from '../core/storage'
import type { LanguageAdapter, WordView } from '../core/types'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export interface WordBookViewProps {
  adapter: LanguageAdapter
  onPracticeWord: (wordId: string) => void
  /** Open the flashcard tab with a ready-made deck. */
  onFlashcardDeck: (deck: { words: WordView[]; title: string }) => void
}

function WordRow({
  word,
  sub,
  starred,
  onToggleStar,
  onPractice,
}: {
  word: WordView
  sub: string
  starred: boolean
  onToggleStar: () => void
  onPractice: () => void
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
      <button
        type="button"
        onClick={onPractice}
        className="min-w-0 flex-1 text-left"
        aria-label={`練習 ${word.display}`}
      >
        <span className="block truncate font-medium">{word.display}</span>
        <span className="block truncate font-mono text-xs text-muted-foreground">
          {word.answer} · {sub}
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleStar}
        aria-label={starred ? '取消收藏' : '收藏'}
        className="shrink-0 rounded-md p-1"
      >
        <Star
          className={cn(
            'h-4 w-4',
            starred ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground',
          )}
        />
      </button>
      <Button variant="outline" size="sm" className="shrink-0" onClick={onPractice}>
        <Play className="h-3.5 w-3.5" /> 練
      </Button>
    </li>
  )
}

/**
 * v8 word book (from the HSK reference site's 生詞本): favourites,
 * most-mistaken words and unmastered words in one place, with
 * one-tap flashcard review of any group.
 */
export function WordBookView({ adapter, onPracticeWord, onFlashcardDeck }: WordBookViewProps) {
  const [progress, setProgress] = useState(() => loadProgress(adapter.id))

  const groups = useMemo(() => {
    const byId = new Map(adapter.words.map((w) => [w.id, w]))
    const favorites = (progress.favorites ?? [])
      .map((id) => byId.get(id))
      .filter((w): w is WordView => !!w)
    const wrong = Object.entries(progress.wrongWords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id, count]) => {
        const w = byId.get(id)
        return w ? { word: w, count } : null
      })
      .filter((x): x is { word: WordView; count: number } => x !== null)
    const unmastered = adapter.words.filter((w) => {
      const m = progress.mastery?.[w.id] ?? 0
      return m !== 2 && (m === 1 || w.id in progress.wrongWords)
    })
    return { favorites, wrong, unmastered }
  }, [adapter.words, progress])

  const starred = useMemo(() => new Set(progress.favorites ?? []), [progress])

  const refresh = () => setProgress(loadProgress(adapter.id))

  const toggleStar = (wordId: string) => {
    toggleFavorite(adapter.id, wordId)
    refresh()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bookmark className="h-4 w-4" /> 生詞本
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            收藏、錯得最多同學習中嘅詞集中喺呢度。撳星星收藏，撳「練」即刻練嗰個字。
          </p>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">收藏（{groups.favorites.length}）</h3>
              <Button
                variant="outline"
                size="sm"
                disabled={groups.favorites.length === 0}
                onClick={() => onFlashcardDeck({ words: groups.favorites, title: '收藏複習' })}
              >
                <Layers className="h-3.5 w-3.5" /> 閃卡複習
              </Button>
            </div>
            {groups.favorites.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                未收藏任何詞——喺字典、閃卡撳星星就可以加入。
              </p>
            ) : (
              <ul className="space-y-1.5">
                {groups.favorites.slice(0, 20).map((w) => (
                  <WordRow
                    key={w.id}
                    word={w}
                    sub={`第 ${w.level} 課`}
                    starred
                    onToggleStar={() => toggleStar(w.id)}
                    onPractice={() => onPracticeWord(w.id)}
                  />
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">錯得最多（{groups.wrong.length}）</h3>
              <Button
                variant="outline"
                size="sm"
                disabled={groups.wrong.length === 0}
                onClick={() =>
                  onFlashcardDeck({ words: groups.wrong.map((x) => x.word), title: '錯詞複習' })
                }
              >
                <Layers className="h-3.5 w-3.5" /> 閃卡複習
              </Button>
            </div>
            {groups.wrong.length === 0 ? (
              <p className="text-sm text-muted-foreground">未有錯字記錄——練返一課先啦。</p>
            ) : (
              <ul className="space-y-1.5">
                {groups.wrong.map(({ word, count }) => (
                  <WordRow
                    key={word.id}
                    word={word}
                    sub={`錯 ${count} 次 · 第 ${word.level} 課`}
                    starred={starred.has(word.id)}
                    onToggleStar={() => toggleStar(word.id)}
                    onPractice={() => onPracticeWord(word.id)}
                  />
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">學習中（{groups.unmastered.length}）</h3>
              <Button
                variant="outline"
                size="sm"
                disabled={groups.unmastered.length === 0}
                onClick={() =>
                  onFlashcardDeck({
                    words: groups.unmastered.slice(0, 50),
                    title: '學習中嘅詞',
                  })
                }
              >
                <Layers className="h-3.5 w-3.5" /> 閃卡複習
              </Button>
            </div>
            {groups.unmastered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                未有學習中嘅詞——練過嘅詞會喺呢度出現，直到你喺閃卡撳「記住了」。
              </p>
            ) : (
              <ul className="space-y-1.5">
                {groups.unmastered.slice(0, 20).map((w) => (
                  <WordRow
                    key={w.id}
                    word={w}
                    sub={`第 ${w.level} 課`}
                    starred={starred.has(w.id)}
                    onToggleStar={() => toggleStar(w.id)}
                    onPractice={() => onPracticeWord(w.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
