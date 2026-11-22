import { useState } from 'react'
import { ChevronRight, Keyboard } from 'lucide-react'
import { ADAPTERS } from '../languages'
import { loadProgress } from '../core/storage'
import { levelCountFor, type LanguageId } from '../core/types'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'
import { Progress } from './ui/progress'
import { MemphisShapes } from './MemphisShapes'

export interface HomeScreenProps {
  onSelect: (id: LanguageId) => void
  /** Memphis theme active — shows decorations and Memphis card treatment. */
  memphis?: boolean
}

/** Home screen — one card per language: name, word/level counts, progress. */
export function HomeScreen({ onSelect, memphis = false }: HomeScreenProps) {
  const [progressByLang] = useState(() => {
    const map = new Map<LanguageId, ReturnType<typeof loadProgress>>()
    for (const a of ADAPTERS) map.set(a.id, loadProgress(a.id))
    return map
  })

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-8">
      <div className="text-center">
        <div className="memphis-logo mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Keyboard className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold">打字練習</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Typing Trainer · 每課 10 個詞 · 揀一種語言開始
        </p>
        {memphis && <MemphisShapes />}
      </div>

      <div className="memphis-home-list mt-6 space-y-4">
        {ADAPTERS.map((adapter) => {
          const progress = progressByLang.get(adapter.id)
          const totalLevels = levelCountFor(adapter.words.length)
          const done = progress?.completedLevels.length ?? 0
          const pct = totalLevels === 0 ? 0 : Math.round((done / totalLevels) * 100)
          return (
            <button
              key={adapter.id}
              type="button"
              onClick={() => onSelect(adapter.id)}
              className="block w-full text-left"
            >
              <Card className="memphis-home-card transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-5">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white"
                    style={{ backgroundColor: adapter.color }}
                  >
                    {adapter.name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-bold">{adapter.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {adapter.englishName}
                      </span>
                      {adapter.isStub && <Badge variant="secondary">試行版</Badge>}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {adapter.words.length.toLocaleString()} 個詞 · {totalLevels} 課
                      {done > 0 ? ` · 已完成 ${done} 課（${pct}%）` : ' · 未開始'}
                    </span>
                    <Progress value={pct} className="mt-2 h-2" />
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>

      <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground">
        進度只會儲喺呢部機嘅瀏覽器入面（localStorage），唔使開戶口。
        <br />
        想加新語言？加一個 adapter 資料夾 + 詞庫就得。
      </p>
    </div>
  )
}
