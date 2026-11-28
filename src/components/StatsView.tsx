import { useMemo } from 'react'
import { BookOpen, Clock, Target, TrendingUp } from 'lucide-react'
import type { LanguageAdapter, LanguageProgress } from '../core/types'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'

export interface StatsViewProps {
  adapter: LanguageAdapter
  progress: LanguageProgress
  onPracticeWord: (wordId: string) => void
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

/** Stats page: accuracy, streak/volume, hardest words, recent levels. */
export function StatsView({ adapter, progress, onPracticeWord }: StatsViewProps) {
  const accuracy =
    progress.totalAnswered === 0
      ? 0
      : Math.round((progress.totalCorrect / progress.totalAnswered) * 100)
  const totalLevels = Math.ceil(adapter.words.length / 10)
  const doneCount = progress.completedLevels.length
  // Same <1% rule as the home card (review P2 #4).
  const donePct = totalLevels === 0 ? 0 : (doneCount / totalLevels) * 100
  const donePctLabel = donePct === 0 ? '0%' : donePct < 1 ? '＜1%' : `${Math.round(donePct)}%`

  const hardest = useMemo(() => {
    return Object.entries(progress.wrongWords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => {
        const word = adapter.words.find((w) => w.id === id)
        return word ? { word, count } : null
      })
      .filter((x): x is { word: (typeof adapter.words)[number]; count: number } => x !== null)
  }, [adapter.words, progress.wrongWords])

  const recentLevels = useMemo(() => {
    return Object.values(progress.results)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)
  }, [progress.results])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-bold">{accuracy}%</div>
            <div className="text-xs text-muted-foreground">準確率（一次答啱）</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-bold">
              {doneCount}/{totalLevels}
            </div>
            <div className="text-xs text-muted-foreground">已完成課數</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-bold">{progress.totalAnswered}</div>
            <div className="text-xs text-muted-foreground">累計練習詞數</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-bold">{progress.totalSessions}</div>
            <div className="text-xs text-muted-foreground">練習次數</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">整體進度</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Progress
              value={donePct}
              className="h-2.5 flex-1"
            />
            <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
              {donePctLabel}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {progress.lastPlayed
              ? `上次練習：${formatDate(progress.lastPlayed)}`
              : '未開始練習'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">最難嘅詞（錯得最多）</CardTitle>
        </CardHeader>
        <CardContent>
          {hardest.length === 0 ? (
            <p className="text-sm text-muted-foreground">未有錯字記錄——練返一課先啦。</p>
          ) : (
            <ul className="space-y-1.5">
              {hardest.map(({ word, count }) => (
                <li key={word.id}>
                  <button
                    type="button"
                    onClick={() => onPracticeWord(word.id)}
                    className="flex w-full items-baseline justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="font-medium">{word.display}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {word.answer} · 錯 {count} 次
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">最近完成嘅課</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLevels.length === 0 ? (
            <p className="text-sm text-muted-foreground">未完成過任何一課。</p>
          ) : (
            <ul className="space-y-1.5">
              {recentLevels.map((r) => (
                <li
                  key={r.level}
                  className="flex items-baseline justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm"
                >
                  <span>
                    第 {r.level} 課 · {formatDate(r.date)}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(r.accuracy * 100)}% · {r.seconds}秒 · 錯 {r.errors} 次
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
