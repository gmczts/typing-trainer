import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-react'
import type { LanguageAdapter } from '../core/types'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'

export interface KeymapViewProps {
  adapter: LanguageAdapter
}

/**
 * Keymap + key-memory cards.
 * - Keymap: grouped key tables (initials/finals, consonants/vowels, accents).
 * - Key cards: one card per key; flip through them or shuffle for a quiz.
 */
export function KeymapView({ adapter }: KeymapViewProps) {
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [order, setOrder] = useState<number[]>(() =>
    adapter.keyCards.map((_, i) => i),
  )
  const cards = adapter.keyCards
  const current = cards[order[cardIndex] ?? 0]

  const shuffleCards = () => {
    const next = [...cards.keys()]
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = next[i] as number
      next[i] = next[j] as number
      next[j] = tmp
    }
    setOrder(next)
    setCardIndex(0)
    setFlipped(false)
  }

  const go = (delta: number) => {
    setFlipped(false)
    setCardIndex((i) => (i + delta + cards.length) % cards.length)
  }

  const accentGuide = useMemo(() => adapter.accentGuide ?? [], [adapter.accentGuide])

  return (
    <div className="space-y-5">
      {accentGuide.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-2 font-semibold">重音指南</h3>
            <p className="mb-3 text-sm text-muted-foreground">
              打普通字母就得——系統會自動接受對應嘅重音字母，顯示嗰陣永遠係正確寫法。
            </p>
            <div className="flex flex-wrap gap-2">
              {accentGuide.map((g) => (
                <span
                  key={g.plain}
                  className="rounded-lg bg-muted px-3 py-1.5 font-mono text-sm"
                >
                  {g.plain} → {g.accented.join(' / ')}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {adapter.keymapGroups.length === 0 && adapter.keyCards.length === 0 && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            呢種語言唔使記鍵位——直接打字就得，練習畫面會有提示。
          </CardContent>
        </Card>
      )}

      {adapter.keymapGroups.map((group) => (
        <div key={group.title}>
          <h3 className="mb-1 font-semibold">{group.title}</h3>
          {group.subtitle && (
            <p className="mb-2 text-xs text-muted-foreground">{group.subtitle}</p>
          )}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {group.keys.map((k) => (
              <div key={`${group.title}-${k.key}`} className="rounded-lg border bg-card p-2 text-center shadow-sm">
                <div className="font-mono text-lg font-bold uppercase">{k.key}</div>
                <div className="text-sm font-medium">{k.label}</div>
                {k.note && <div className="text-xs text-muted-foreground">{k.note}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {cards.length > 0 && (
        <div>
          <h3 className="mb-1 font-semibold">認鍵記憶卡</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            撳卡睇解釋，隨機抽卡當測驗。
          </p>
          {current && (
          <Card>
            <CardContent className="p-4">
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                className="w-full text-left"
                aria-label="翻開記憶卡"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-3xl font-bold">{current.key}</span>
                  <span className="text-xs text-muted-foreground">
                    {cardIndex + 1} / {cards.length} · {flipped ? '撳返去' : '撳卡睇答案'}
                  </span>
                </div>
                {flipped ? (
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="font-medium">{current.title}</div>
                    <p className="text-muted-foreground">{current.body}</p>
                    {current.examples.length > 0 && (
                      <ul className="space-y-1">
                        {current.examples.map((ex) => (
                          <li key={ex.word} className="flex justify-between gap-2 rounded bg-muted px-2 py-1">
                            <span>{ex.word}</span>
                            <span className="font-mono text-xs text-muted-foreground">{ex.code}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    呢個鍵代表咩？撳卡睇答案。
                  </p>
                )}
              </button>
              <div className="mt-4 flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => go(-1)}>
                  <ChevronLeft className="h-4 w-4" /> 上一張
                </Button>
                <Button variant="outline" size="sm" onClick={shuffleCards}>
                  <Shuffle className="h-4 w-4" /> 隨機
                </Button>
                <Button variant="outline" size="sm" onClick={() => go(1)}>
                  下一張 <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setOrder(cards.map((_, i) => i)); setCardIndex(0); setFlipped(false) }}>
          <RotateCcw className="h-3.5 w-3.5" /> 順序重設
        </Button>
        </div>
      )}
    </div>
  )
}
