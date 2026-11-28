import { useMemo, useState } from 'react'
import { Flame, Target } from 'lucide-react'
import {
  DAILY_GOAL_OPTIONS,
  getStreak,
  last7Days,
  loadActivity,
  loadDailyGoal,
  saveDailyGoal,
  seedActivityFromResults,
} from '../core/activity'
import { LANGUAGE_META } from '../languages'
import { loadProgress } from '../core/storage'
import { cn } from '../lib/utils'
import { Card, CardContent } from './ui/card'

/**
 * v8 home dashboard (from the HSK reference site): daily-goal ring,
 * streak, 7-day bar chart. Activity is seeded once from completed
 * levels, so existing users keep their history.
 */
export function Dashboard() {
  const [goal, setGoal] = useState(() => loadDailyGoal())
  const [activity] = useState(() => {
    seedActivityFromResults(LANGUAGE_META.map((m) => m.id))
    return loadActivity()
  })

  const streak = useMemo(() => getStreak(activity), [activity])
  const week = useMemo(() => last7Days(activity), [activity])
  const todayWords = week[6]?.words ?? 0
  const weekTotal = week.reduce((s, d) => s + d.words, 0)
  const pct = Math.min(1, goal === 0 ? 0 : todayWords / goal)

  const totals = useMemo(() => {
    let words = 0
    let sessions = 0
    for (const m of LANGUAGE_META) {
      const p = loadProgress(m.id)
      words += p.totalAnswered
      sessions += p.totalSessions
    }
    return { words, sessions }
  }, [])

  // Progress ring: r=52, circumference ≈ 326.7.
  const R = 52
  const CIRC = 2 * Math.PI * R
  const maxDay = Math.max(1, ...week.map((d) => d.words))

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-5">
          {/* Goal ring */}
          <div className="relative h-[120px] w-[120px] shrink-0">
            <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
              <circle cx="60" cy="60" r={R} fill="none" strokeWidth="9" className="stroke-muted-foreground/40 dark:stroke-white/30" />
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                strokeWidth="9"
                strokeLinecap="round"
                className="stroke-green-600 dark:stroke-green-400"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - pct)}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display text-2xl font-bold leading-none tabular-nums">
                {todayWords}
                <span className="text-sm font-normal text-muted-foreground">/{goal}</span>
              </div>
              <div className="mt-1 text-[11px] tracking-widest text-muted-foreground">今日詞數</div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold">今日目標</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {todayWords >= goal
                ? '達標啦！聽日繼續。'
                : `仲差 ${goal - todayWords} 個詞就達標。`}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-sm font-medium">
                <Flame className="h-4 w-4 text-orange-500" />
                連續 {streak} 天
              </span>
              <span className="text-sm text-muted-foreground">
                · 累計已答 {totals.words.toLocaleString()} 詞 · {totals.sessions} 次練習
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">每日目標：</span>
              {DAILY_GOAL_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setGoal(n)
                    saveDailyGoal(n)
                  }}
                  aria-pressed={goal === n}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    goal === n
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground',
                  )}
                >
                  {n} 詞
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 7-day chart */}
        <div className="mt-5 border-t pt-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-semibold">近 7 天學習量</span>
            <span className="text-xs text-muted-foreground">{weekTotal} 詞 / 7 天</span>
          </div>
          <div className="flex h-24 items-end gap-2">
            {week.map((d) => (
              <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {d.words > 0 ? d.words : ''}
                </span>
                <div
                  className={cn(
                    'w-full max-w-7 rounded-t-md transition-all',
                    d.words > 0
                      ? d.isToday
                        ? 'bg-primary'
                        : 'bg-green-600/70 dark:bg-green-500/70'
                      : 'bg-muted',
                  )}
                  style={{ height: `${Math.max(4, (d.words / maxDay) * 56)}px` }}
                  title={`${d.date}：${d.words} 詞`}
                />
                <span className={cn('text-[10px]', d.isToday ? 'font-bold text-foreground' : 'text-muted-foreground')}>
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
