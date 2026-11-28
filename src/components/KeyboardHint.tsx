import type { LanguageAdapter } from '../core/types'
import { cn } from '../lib/utils'

/**
 * Keyboard-hint diagram for the practice screen (Cantonese SGPB and
 * Korean 두벌식 only — the other languages type plain Latin letters
 * and need no keymap hint).
 *
 * Rendered FROM the adapter's existing keymapGroups — no duplicated
 * keymap data, no static image:
 * - Cantonese: a key can be both an initial and a final, so each cap
 *   shows the initial (top line) and the first final (bottom line).
 * - Korean: each cap shows the base jamo, plus the Shift jamo
 *   (sounds[1]) where the adapter has one.
 *
 * The layout is the physical QWERTY rows; keys with no mapping in
 * this language (e.g. , . / in Cantonese) render dimmed so the
 * keyboard shape stays intact.
 */

/** QWERTY rows (letter keys + the three punctuation keys Korean uses). */
const ROWS: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
]

interface KeyEntry {
  key: string
  /** Cantonese: initial sound (top line). */
  initial?: string
  /** Cantonese: first final sound (bottom line). */
  final?: string
  /** Korean: base jamo. */
  jamo?: string
  /** Korean: Shift jamo. */
  shift?: string
}

function buildEntries(adapter: LanguageAdapter): Map<string, KeyEntry> {
  const map = new Map<string, KeyEntry>()
  const get = (key: string): KeyEntry => {
    let e = map.get(key)
    if (!e) {
      e = { key }
      map.set(key, e)
    }
    return e
  }
  if (adapter.id === 'cantonese') {
    for (const group of adapter.keymapGroups) {
      for (const k of group.keys) {
        const entry = get(k.key.toLowerCase())
        const first = k.sounds[0] ?? k.label
        if (k.note === '聲母') entry.initial = first
        else if (k.note === '韻母') entry.final = first
      }
    }
  } else if (adapter.id === 'korean') {
    for (const group of adapter.keymapGroups) {
      for (const k of group.keys) {
        const entry = get(k.key.toLowerCase())
        entry.jamo = k.sounds[0] ?? k.label
        if (k.sounds[1]) entry.shift = k.sounds[1]
      }
    }
  }
  return map
}

function KeyCap({
  entry,
  korean,
  className,
}: {
  entry?: KeyEntry
  korean: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-[54px] flex-col items-center justify-center rounded-md border bg-muted/50 px-0.5 py-1 shadow-sm',
        !entry && 'opacity-40',
        className,
      )}
    >
      <span className="text-[10px] font-bold uppercase leading-none text-muted-foreground">
        {entry?.key ?? ''}
      </span>
      {korean ? (
        <>
          <span className="mt-0.5 text-base font-bold leading-tight">
            {entry?.jamo ?? ' '}
          </span>
          <span className="text-[10px] leading-tight text-muted-foreground">
            {entry?.shift ? `⇧ ${entry.shift}` : ' '}
          </span>
        </>
      ) : (
        <>
          <span className="mt-0.5 text-xs font-semibold leading-tight">
            {entry?.initial ?? ' '}
          </span>
          <span className="text-[10px] leading-tight text-muted-foreground">
            {entry?.final ?? ' '}
          </span>
        </>
      )}
    </div>
  )
}

export function KeyboardHint({ adapter }: { adapter: LanguageAdapter }) {
  const entries = buildEntries(adapter)
  const korean = adapter.id === 'korean'
  return (
    <div className="rounded-lg border bg-card p-2 shadow-sm">
      <div className="grid grid-cols-10 gap-1">
        {ROWS.map((row, ri) =>
          row.map((key, i) => (
            <KeyCap
              key={key}
              entry={entries.get(key)}
              korean={korean}
              className={ri === 1 && i === 0 ? 'col-start-2' : undefined}
            />
          )),
        )}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {korean
          ? '⇧ = 按住 Shift · 雙元音用兩個鍵拼出（如 ㅘ = H + K）'
          : '上行 = 聲母，下行 = 韻母（首個）· 完整鍵位去「鍵盤」分頁睇'}
      </p>
    </div>
  )
}
