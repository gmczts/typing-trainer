import { useMemo, useState } from 'react'
import { Play, Search } from 'lucide-react'
import type { LanguageAdapter } from '../core/types'
import { Button } from './ui/button'
import { Input } from './ui/input'

export interface DictionaryViewProps {
  adapter: LanguageAdapter
  onPracticeWord: (wordId: string) => void
}

const PAGE_SIZE = 50

/**
 * Searchable dictionary. Searches every field the adapter indexed
 * (word, Jyutping / romanization, pinyin, SGPB code, glosses, examples).
 */
export function DictionaryView({ adapter, onPracticeWord }: DictionaryViewProps) {
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE_SIZE)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return adapter.words.slice(0, shown)
    return adapter.words.filter((w) => w.searchText.includes(q)).slice(0, shown)
  }, [adapter.words, query, shown])

  const totalMatches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return adapter.words.length
    return adapter.words.filter((w) => w.searchText.includes(q)).length
  }, [adapter.words, query])

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
      <p className="text-xs text-muted-foreground">
        {query.trim() ? `搵到 ${totalMatches} 個結果` : `共 ${adapter.words.length} 個詞`}
        {totalMatches > results.length && ` · 顯示緊頭 ${results.length} 個`}
      </p>
      <ul className="space-y-2">
        {results.map((w) => (
          <li key={w.id} className="rounded-xl border bg-card p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-xl font-bold">{w.display}</span>
                  {w.above.map((line, i) => (
                    <span key={i} className="text-sm font-semibold text-brand dark:text-brand-dark">
                      {line.text}
                    </span>
                  ))}
                </div>
                <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                  {w.below.map((line, i) => (
                    <div key={i}>{line.text}</div>
                  ))}
                </div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  第 {w.level} 課 · 第 {w.positionInLevel} 個 · 答案 {w.answer}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => onPracticeWord(w.id)}
              >
                <Play className="h-3.5 w-3.5" /> 練呢個字
              </Button>
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
