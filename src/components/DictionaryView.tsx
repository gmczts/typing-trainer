import { useMemo, useState } from 'react'
import { Play, Search, Star } from 'lucide-react'
import { loadProgress, toggleFavorite } from '../core/storage'
import type { LanguageAdapter, WordView } from '../core/types'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'

export interface DictionaryViewProps {
  adapter: LanguageAdapter
  onPracticeWord: (wordId: string) => void
}

const PAGE_SIZE = 50

type Filter = 'all' | 'favorites' | 'wrong' | 'unmastered'

/**
 * Relevance rank for dictionary search: exact word first, then word
 * prefix, then code (answer) match, then word contains, then any
 * other field. (Review P1 #3: searching 女 showed 女兒 first because
 * results were in dataset order and the 50-row cap could cut the
 * exact match out entirely.)
 */
function searchRank(w: WordView, q: string): number {
  const d = w.display.toLowerCase()
  if (d === q) return 0
  if (d.startsWith(q)) return 1
  const a = w.answer.toLowerCase()
  if (a === q || a.startsWith(q)) return 2
  if (d.includes(q)) return 3
  return 4
}

/**
 * Searchable dictionary. Searches every field the adapter indexed
 * (word, Jyutping / romanization, pinyin, SGPB code, glosses, examples).
 * v8: filter chips (all / favourites / mistaken / unmastered), star
 * toggles and a mastery dot per row.
 */
export function DictionaryView({ adapter, onPracticeWord }: DictionaryViewProps) {
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE_SIZE)
  const [filter, setFilter] = useState<Filter>('all')
  const [progress, setProgress] = useState(() => loadProgress(adapter.id))

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = adapter.words
    if (filter === 'favorites') {
      const favs = new Set(progress.favorites ?? [])
      list = list.filter((w) => favs.has(w.id))
    } else if (filter === 'wrong') {
      list = list.filter((w) => w.id in progress.wrongWords)
    } else if (filter === 'unmastered') {
      list = list.filter((w) => {
        const m = progress.mastery?.[w.id] ?? 0
        return m !== 2 && (m === 1 || w.id in progress.wrongWords)
      })
    }
    if (!q) return list.slice(0, shown)
    return list
      .filter((w) => w.searchText.includes(q))
      .sort((a, b) => searchRank(a, q) - searchRank(b, q))
      .slice(0, shown)
  }, [adapter.words, query, shown, filter, progress])

  const totalMatches = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = adapter.words
    if (filter === 'favorites') {
      const favs = new Set(progress.favorites ?? [])
      list = list.filter((w) => favs.has(w.id))
    } else if (filter === 'wrong') {
      list = list.filter((w) => w.id in progress.wrongWords)
    } else if (filter === 'unmastered') {
      list = list.filter((w) => {
        const m = progress.mastery?.[w.id] ?? 0
        return m !== 2 && (m === 1 || w.id in progress.wrongWords)
      })
    }
    if (!q) return list.length
    return list.filter((w) => w.searchText.includes(q)).length
  }, [adapter.words, query, filter, progress])

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'favorites', label: '已收藏' },
    { id: 'wrong', label: '錯過' },
    { id: 'unmastered', label: '學習中' },
  ]

  const starred = new Set(progress.favorites ?? [])

  const masteryOf = (w: WordView): number => progress.mastery?.[w.id] ?? 0

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShown(PAGE_SIZE)
          }}
          placeholder="搜尋：字、拼音、雙拼碼、英文…"
          className="pl-9"
          aria-label="搜尋字典"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {filters.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setFilter(id)
              setShown(PAGE_SIZE)
            }}
            aria-pressed={filter === id}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors',
              filter === id
                ? 'border-primary bg-primary font-medium text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {query.trim()
          ? `搵到 ${totalMatches} 個結果`
          : filter === 'all'
            ? `共 ${totalMatches} 個詞`
            : `篩選出 ${totalMatches} 個詞`}
        {totalMatches > results.length && ` · 顯示緊頭 ${results.length} 個`}
      </p>
      <ul className="space-y-2">
        {results.map((w) => (
          <li key={w.id} className="rounded-xl border bg-card p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span
                    className={cn(
                      'h-2 w-2 shrink-0 self-center rounded-full',
                      masteryOf(w) === 2
                        ? 'bg-green-600'
                        : masteryOf(w) === 1
                          ? 'bg-yellow-500'
                          : 'bg-muted-foreground/30',
                    )}
                    title={
                      masteryOf(w) === 2 ? '已掌握' : masteryOf(w) === 1 ? '練習中' : '未見過'
                    }
                  />
                  <span className="text-xl font-bold">{w.display}</span>
                  {w.above.map((line, i) => (
                    <span key={i} className="text-sm font-semibold text-brand dark:text-brand-dark">
                      {line.text}
                    </span>
                  ))}
                </div>
                {/* Short lines (pinyin, gloss, part of speech) flow
                    inline with · separators so a one-word gloss like
                    "I" does not sit alone on its own line (review P2
                    #13); example sentences still take a full line. */}
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
                  {w.below.map((line, i) => {
                    if (line.tone === 'example') {
                      return (
                        <div key={i} className="w-full">
                          {line.text}
                        </div>
                      )
                    }
                    const prevInline = w.below
                      .slice(0, i)
                      .some((l) => l.tone !== 'example')
                    return (
                      <span key={i} className="inline-flex items-baseline gap-2">
                        {prevInline && (
                          <span aria-hidden className="text-muted-foreground/50">
                            ·
                          </span>
                        )}
                        <span>{line.text}</span>
                      </span>
                    )
                  })}
                </div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  第 {w.level} 課 · 第 {w.positionInLevel} 個 · 答案 {w.answer}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    toggleFavorite(adapter.id, w.id)
                    setProgress(loadProgress(adapter.id))
                  }}
                  aria-label={starred.has(w.id) ? '取消收藏' : '收藏'}
                  className="rounded-md p-1"
                >
                  <Star
                    className={cn(
                      'h-4 w-4',
                      starred.has(w.id)
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-muted-foreground',
                    )}
                  />
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPracticeWord(w.id)}
                >
                  <Play className="h-3.5 w-3.5" /> 練呢個字
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {results.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">搵唔到相關嘅詞。</p>
      )}
      {totalMatches > results.length && (
        <Button variant="outline" className="w-full" onClick={() => setShown((s) => s + PAGE_SIZE)}>
          顯示更多
        </Button>
      )}
    </div>
  )
}
