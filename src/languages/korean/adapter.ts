/**
 * Korean adapter — type the word in Hangul (두벌식) with jamo prompts.
 *
 * Data: src/data/korean-words.json (6,000 items, verbatim copy).
 * Row fields: w (Hangul), rom (Revised Romanization), zh (Chinese meaning
 * or null — 459 top-up words have English only), en, pos (품사),
 * ex (Korean example or null), exzh (example Chinese translation or null),
 * f (frequency position).
 *
 * NOTE: the dataset carries no hanja or TOPIK-level field, so the card
 * shows the part of speech (pos) instead. Do not invent hanja/TOPIK data.
 */
import raw from '../../data/korean-words.json'
import { jamoPrompt } from '../../core/hangul'
import {
  WORDS_PER_LEVEL,
  type KeyCard,
  type KeymapGroup,
  type LanguageAdapter,
  type WordView,
} from '../../core/types'

export interface KoreanRow {
  w: string
  rom: string
  zh: string | null
  en: string
  pos: string
  ex: string | null
  exzh: string | null
  f: number
}

const data = raw as unknown as { items: KoreanRow[] }
const rows = data.items

function toWordView(row: KoreanRow, index: number): WordView {
  const below: WordView['below'] = []
  if (row.zh) {
    below.push({ text: row.zh, tone: 'gloss' })
    below.push({ text: row.en, tone: 'gloss2' })
  } else {
    below.push({ text: row.en, tone: 'gloss' })
  }
  below.push({ text: `품사 ${row.pos}`, tone: 'muted' })
  if (row.ex) {
    below.push({
      text: row.exzh ? `${row.ex} · ${row.exzh}` : row.ex,
      tone: 'example',
    })
  }
  return {
    id: `korean:${index}`,
    index,
    display: row.w,
    above: [{ text: row.rom, tone: 'roman' }],
    below,
    answer: row.w,
    hint: '한글로 입력',
    prompt: jamoPrompt(row.w),
    promptLabel: '字母提示 (자모)',
    searchText: [row.w, row.rom, row.zh ?? '', row.en, row.pos, row.ex ?? '', row.exzh ?? '']
      .join(' ')
      .toLowerCase(),
    level: Math.floor(index / WORDS_PER_LEVEL) + 1,
    positionInLevel: (index % WORDS_PER_LEVEL) + 1,
  }
}

const words: WordView[] = rows.map(toWordView)

export function koreanMatches(input: string, word: WordView): boolean {
  return input.trim() === word.answer
}

/* ------------------------------------------------------------------ */
/* 두벌식 (two-beolsik) QWERTY keymap — the standard layout.          */
/* ------------------------------------------------------------------ */

const CONSONANTS: [string, string, string?][] = [
  // [key, jamo, shift jamo]
  ['Q', 'ㅂ', 'ㅃ'], ['W', 'ㅈ', 'ㅉ'], ['E', 'ㄷ', 'ㄸ'], ['R', 'ㄱ', 'ㄲ'],
  ['T', 'ㅅ', 'ㅆ'], ['A', 'ㅁ'], ['S', 'ㄴ'], ['D', 'ㅇ'], ['F', 'ㄹ'],
  ['G', 'ㅎ'], ['Z', 'ㅋ'], ['X', 'ㅌ'], ['C', 'ㅊ'], ['V', 'ㅍ'],
]

const VOWELS: [string, string, string?][] = [
  // [key, jamo, shift jamo]
  ['Y', 'ㅛ'], ['U', 'ㅕ'], ['I', 'ㅑ'], ['O', 'ㅐ', 'ㅒ'], ['P', 'ㅔ', 'ㅖ'],
  ['H', 'ㅗ'], ['J', 'ㅓ'], ['K', 'ㅏ'], ['L', 'ㅣ'], ['B', 'ㅠ'],
  ['N', 'ㅜ'], ['M', 'ㅡ'],
]

const OTHER_KEYS: [string, string][] = [
  [',', 'ㅖ'], ['.', 'ㅒ'], ['/', 'ㅢ'],
]

const keymapGroups: KeymapGroup[] = [
  {
    title: '자음 · 輔音',
    subtitle: 'Shift + 鍵 = 緊音（ㅃ ㅉ ㄸ ㄲ ㅆ）',
    keys: CONSONANTS.map(([key, jamo, shift]) => ({
      key,
      label: shift ? `${jamo} / ${shift}` : jamo,
      sounds: shift ? [jamo, shift] : [jamo],
      note: shift ? 'Shift = 緊音' : '輔音',
    })),
  },
  {
    title: '모음 · 元音',
    subtitle: '右手邊為主 · 雙元音用兩個鍵拼出（如 ㅘ = H + K）',
    keys: VOWELS.map(([key, jamo, shift]) => ({
      key,
      label: shift ? `${jamo} / ${shift}` : jamo,
      sounds: shift ? [jamo, shift] : [jamo],
      note: shift ? 'Shift = 雙元音' : '元音',
    })),
  },
  {
    title: '其他',
    subtitle: '標點鍵上的元音',
    keys: OTHER_KEYS.map(([key, jamo]) => ({
      key,
      label: jamo,
      sounds: [jamo],
      note: '元音',
    })),
  },
]

/** Key-memory cards: one per letter key, with example words containing that jamo. */
function buildKeyCards(): KeyCard[] {
  const all = new Map<string, { jamo: string; shift?: string; kind: string }>()
  for (const [key, jamo, shift] of CONSONANTS) all.set(key, { jamo, shift, kind: '輔音' })
  for (const [key, jamo, shift] of VOWELS) all.set(key, { jamo, shift, kind: '元音' })

  // Find example words containing the jamo (check the word's jamo prompt).
  const promptOf = new Map<number, string>()
  const promptFor = (i: number): string => {
    let p = promptOf.get(i)
    if (!p) {
      p = jamoPrompt(rows[i]?.w ?? '')
      promptOf.set(i, p)
    }
    return p
  }

  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((key) => {
    const info = all.get(key)
    if (!info) {
      return { key, title: key, body: '呢個鍵喺 두벌식 入面冇對應嘅韓文字母。', examples: [] }
    }
    const examples: { word: string; code: string }[] = []
    for (let i = 0; i < rows.length && examples.length < 3; i++) {
      const row = rows[i]
      if (!row) continue
      const prompt = promptFor(i)
      if (prompt.includes(info.jamo) || (info.shift && prompt.includes(info.shift))) {
        examples.push({ word: `${row.w} ${row.rom}`, code: prompt })
      }
    }
    return {
      key,
      title: `${info.jamo}${info.shift ? ` / ${info.shift} (Shift)` : ''} · ${info.kind}`,
      body: `「${key}」鍵打出 ${info.kind}「${info.jamo}」${info.shift ? `，按住 Shift 打出「${info.shift}」` : ''}。`,
      examples,
    }
  })
}

export const koreanAdapter: LanguageAdapter = {
  id: 'korean',
  name: '韓文',
  englishName: 'Korean · 두벌식',
  tagline: '6,000 個常用詞 · 韓文輸入 · 자모提示',
  color: '#2563eb',
  isStub: false,
  words,
  inputProps: {
    inputMode: 'text',
    autoCapitalize: 'off',
    autoCorrect: 'off',
    spellCheck: false,
    lang: 'ko',
  },
  matches: koreanMatches,
  keymapGroups,
  keyCards: buildKeyCards(),
}
