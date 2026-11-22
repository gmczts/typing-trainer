/**
 * Spanish adapter — type the word, accent-insensitive matching.
 *
 * Data: src/data/spanish-words.json. CURRENTLY A STUB (55 words, "_stub":
 * true) — the coordinator replaces it with the real 6,000-word dataset
 * before deploy. This adapter reads the file generically (never hardcodes
 * the stub's contents or count), so the swap needs no code change.
 *
 * Row fields: w, zh (Chinese meaning or null), en, ex (or null),
 * exzh (or null), exen (or null), f.
 *
 * Matching: typing plain vowels (a e i o u n) is accepted for
 * á é í ó ú ü ñ. Both sides are normalised for comparison, but the card
 * ALWAYS displays the correct accented spelling.
 */
import raw from '../../data/spanish-words.json'
import {
  WORDS_PER_LEVEL,
  type KeyCard,
  type KeymapGroup,
  type LanguageAdapter,
  type WordView,
} from '../../core/types'

export interface SpanishRow {
  w: string
  zh: string | null
  en: string
  ex: string | null
  exzh: string | null
  exen: string | null
  f: number
}

const data = raw as unknown as { items: SpanishRow[]; _stub?: boolean }
const rows = data.items
const isStub = data._stub === true

/**
 * Strip accents for comparison: NFD decomposes á -> a + combining accent,
 * the combining marks are removed, and ñ/ü map to their plain base.
 * Normalising BOTH sides means "arbol" matches "árbol" and "árbol" also
 * matches "arbol" — while the displayed word keeps its accent.
 */
export function normalizeSpanish(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function spanishMatches(input: string, word: WordView): boolean {
  return normalizeSpanish(input.trim()) === normalizeSpanish(word.answer)
}

function toWordView(row: SpanishRow, index: number): WordView {
  const below: WordView['below'] = []
  if (row.zh) {
    below.push({ text: row.zh, tone: 'gloss' })
    below.push({ text: row.en, tone: 'gloss2' })
  } else {
    below.push({ text: row.en, tone: 'gloss' })
  }
  if (row.ex) {
    const translation = row.exzh ?? row.exen ?? ''
    below.push({
      text: translation ? `${row.ex} · ${translation}` : row.ex,
      tone: 'example',
    })
  }
  return {
    id: `spanish:${index}`,
    index,
    display: row.w,
    above: [],
    below,
    answer: row.w,
    // First-letter hint; the full word is never given away.
    hint: `${row.w.charAt(0)}…`,
    prompt: null,
    promptLabel: null,
    searchText: [row.w, normalizeSpanish(row.w), row.zh ?? '', row.en, row.ex ?? '', row.exzh ?? '', row.exen ?? '']
      .join(' ')
      .toLowerCase(),
    level: Math.floor(index / WORDS_PER_LEVEL) + 1,
    positionInLevel: (index % WORDS_PER_LEVEL) + 1,
  }
}

const words: WordView[] = rows.map(toWordView)

/* ------------------------------------------------------------------ */
/* Accent guide — plain keys are accepted for accented letters.        */
/* ------------------------------------------------------------------ */

const accentGuide = [
  { plain: 'a', accented: ['á'], note: 'a → á，例如 árbol（樹）' },
  { plain: 'e', accented: ['é'], note: 'e → é，例如 médico（醫生）' },
  { plain: 'i', accented: ['í'], note: 'i → í，例如 lápiz（鉛筆）' },
  { plain: 'o', accented: ['ó'], note: 'o → ó，例如 canción（歌曲）' },
  { plain: 'u', accented: ['ú', 'ü'], note: 'u → ú / ü，例如 fácil（容易的）' },
  { plain: 'n', accented: ['ñ'], note: 'n → ñ，例如 mañana（明天）' },
]

const keymapGroups: KeymapGroup[] = [
  {
    title: '重音字母 · Acentos',
    subtitle: '唔使特登打重音——打普通字母就得，系統會自動對應',
    keys: accentGuide.map((g) => ({
      key: g.plain,
      label: g.accented.join(' / '),
      sounds: g.accented,
      note: g.note,
    })),
  },
  {
    title: '西班牙文字母表',
    subtitle: '27 個字母：比英文多一個 ñ',
    keys: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('').map((key) => ({
      key: key.toLowerCase(),
      label: key,
      sounds: [key],
    })),
  },
]

const keyCards: KeyCard[] = accentGuide.map((g) => ({
  key: g.plain.toUpperCase(),
  title: `${g.plain} → ${g.accented.join(' / ')}`,
  body: `打「${g.plain}」就可以代表 ${g.accented.map((a) => `「${a}」`).join(' 或者 ')}。${g.note}。顯示嗰陣永遠會用返正確嘅重音寫法。`,
  examples: rows
    .filter((r) => g.accented.some((a) => r.w.includes(a)))
    .slice(0, 3)
    .map((r) => ({ word: r.w, code: normalizeSpanish(r.w) })),
}))

export const spanishAdapter: LanguageAdapter = {
  id: 'spanish',
  name: '西班牙文',
  englishName: 'Spanish · Acentos',
  tagline: isStub
    ? '試行版詞庫（55 詞）· 重音唔使特登打'
    : '6,000 個常用詞 · 重音唔使特登打',
  color: '#ca8a04',
  isStub,
  words,
  inputProps: {
    inputMode: 'text',
    autoCapitalize: 'off',
    autoCorrect: 'off',
    spellCheck: false,
    lang: 'es',
  },
  matches: spanishMatches,
  keymapGroups,
  keyCards,
  accentGuide,
}
