/**
 * Chinese adapter — type the word in toneless pinyin (ü as v).
 *
 * Data: src/data/chinese-words.json (6,000 items, first 6,000 of the
 * 9,231 embedded in the HSK source HTML, in level order HSK 1-7).
 * Row fields: w (hanzi), py (toned pinyin), pyPlain (toneless, spaceless,
 * ü->v), pos (part of speech, null for 5,850/6,000 rows — the source
 * leaves it blank), ko, en, lv (1-7).
 * See ~/workspace/hsk-extraction-notes.md for the extraction audit.
 *
 * Matching: tone-insensitive — both the input and the answer are
 * normalised (lower-cased, tone marks/digits stripped, ü->v, spaces /
 * hyphens / apostrophes removed) before comparison, so typing "nv" or
 * "nǚ" both match 女, and "nihao" matches 你好.
 */
import raw from '../../data/chinese-words.json'
import {
  WORDS_PER_LEVEL,
  type KeymapGroup,
  type LanguageAdapter,
  type WordView,
} from '../../core/types'

export interface ChineseRow {
  w: string
  py: string
  pyPlain: string
  pos: string | null
  ko: string | null
  en: string | null
  lv: number
}

const data = raw as unknown as { items: ChineseRow[] }
const rows = data.items

function toWordView(row: ChineseRow, index: number): WordView {
  const below: WordView['below'] = []
  if (row.en) below.push({ text: row.en, tone: 'gloss' })
  if (row.ko) below.push({ text: row.ko, tone: 'gloss2' })
  if (row.pos) below.push({ text: row.pos, tone: 'muted' })
  return {
    id: `chinese:${index}`,
    index,
    display: row.w,
    above: [{ text: row.py, tone: 'roman' }],
    below,
    answer: row.pyPlain,
    hint: row.pyPlain,
    prompt: null,
    promptLabel: null,
    searchText: [
      row.w, row.py, row.pyPlain, row.pos ?? '', row.ko ?? '', row.en ?? '',
    ]
      .join(' ')
      .toLowerCase(),
    level: Math.floor(index / WORDS_PER_LEVEL) + 1,
    positionInLevel: (index % WORDS_PER_LEVEL) + 1,
  }
}

const words: WordView[] = rows.map(toWordView)

/** Strip tone marks (and tone digits) for comparison: āáǎà->a … ǖǘǚǜ/ü->v. */
const TONE_MAP: Record<string, string> = {
  ā: 'a', á: 'a', ǎ: 'a', à: 'a',
  ē: 'e', é: 'e', ě: 'e', è: 'e',
  ī: 'i', í: 'i', ǐ: 'i', ì: 'i',
  ō: 'o', ó: 'o', ǒ: 'o', ò: 'o',
  ū: 'u', ú: 'u', ǔ: 'u', ù: 'u',
  ǖ: 'v', ǘ: 'v', ǚ: 'v', ǜ: 'v',
  ü: 'v',
}

export function stripTones(s: string): string {
  return s
    .toLowerCase()
    .split('')
    .map((c) => TONE_MAP[c] ?? c)
    .join('')
    .replace(/[\s\-'’0-9]/g, '')
}

export function chineseMatches(input: string, word: WordView): boolean {
  return stripTones(input.trim()) === stripTones(word.answer)
}

/* ------------------------------------------------------------------ */
/* Pinyin initials + finals.                                           */
/* ------------------------------------------------------------------ */

const INITIALS = [
  'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h',
  'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w',
]

const FINALS = [
  'a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ui', 'ao', 'ou', 'iu',
  'ie', 'üe', 'er', 'an', 'en', 'in', 'un', 'ün', 'ang', 'eng', 'ing', 'ong',
]

const keymapGroups: KeymapGroup[] = [
  {
    title: '聲母 · Initials',
    subtitle: '23 個聲母：b p m f d t n l g k h j q x zh ch sh r z c s y w',
    keys: INITIALS.map((s) => ({ key: s, label: s, sounds: [s] })),
  },
  {
    title: '韻母 · Finals',
    subtitle: '24 個韻母：單韻母、複韻母、鼻韻母',
    keys: FINALS.map((s) => ({ key: s, label: s, sounds: [s] })),
  },
]

export const chineseAdapter: LanguageAdapter = {
  id: 'chinese',
  name: '中文',
  englishName: 'Chinese · HSK 1–7',
  tagline: '6,000 詞 · HSK 1→7 · 打拼音',
  color: '#059669',
  isStub: false,
  words,
  inputProps: {
    inputMode: 'text',
    autoCapitalize: 'off',
    autoCorrect: 'off',
    spellCheck: false,
    lang: 'en',
  },
  matches: chineseMatches,
  keymapGroups,
  keyCards: [],
}
