/**
 * Japanese adapter — type the grammar form in Hepburn romaji.
 *
 * Data: src/data/japanese-words.json (544 items; 545 in the source HTML,
 * 1 excluded — see ~/workspace/japanese-romaji-audit.md).
 * Row fields: form, formClean, romaji, lv (N5-N1), cat, conn, mean,
 * ko, koNote, ex, exzh, note (nulls where the source has none).
 *
 * Romaji was derived from a kana table + an explicit kanji->kana table
 * built only from the kanji in these forms. Particle は reads wa
 * (except inside はず / はじめる), を reads wo, standalone へ reads e.
 * See the audit file for the full kanji table and the 8 whole-form
 * overrides (一方, 始末, 拝見, 召し上がる, を以て, 以上は …).
 */
import raw from '../../data/japanese-words.json'
import {
  WORDS_PER_LEVEL,
  type KeyCard,
  type KeymapGroup,
  type LanguageAdapter,
  type WordView,
} from '../../core/types'

export interface JapaneseRow {
  form: string
  formClean: string
  romaji: string
  lv: string
  cat: string
  conn: string | null
  mean: string | null
  ko: string | null
  koNote: string | null
  ex: string | null
  exzh: string | null
  note: string | null
}

const data = raw as unknown as { items: JapaneseRow[] }
const rows = data.items

function toWordView(row: JapaneseRow, index: number): WordView {
  const below: WordView['below'] = []
  if (row.mean) below.push({ text: row.mean, tone: 'gloss' })
  if (row.conn) below.push({ text: row.conn, tone: 'gloss2' })
  if (row.ex) {
    below.push({
      text: row.exzh ? `${row.ex} — ${row.exzh}` : row.ex,
      tone: 'example',
    })
  }
  if (row.ko) below.push({ text: `韓：${row.ko}`, tone: 'muted' })
  return {
    id: `japanese:${index}`,
    index,
    display: row.formClean,
    above: [{ text: `${row.lv} · ${row.cat}`, tone: 'muted' }],
    below,
    answer: row.romaji,
    hint: row.romaji,
    prompt: null,
    promptLabel: null,
    searchText: [
      row.form, row.romaji, row.mean ?? '', row.cat, row.conn ?? '',
      row.ex ?? '', row.ko ?? '', row.exzh ?? '',
    ]
      .join(' ')
      .toLowerCase(),
    level: Math.floor(index / WORDS_PER_LEVEL) + 1,
    positionInLevel: (index % WORDS_PER_LEVEL) + 1,
  }
}

const words: WordView[] = rows.map(toWordView)

export function japaneseMatches(input: string, word: WordView): boolean {
  const v = input
    .trim()
    .toLowerCase()
    .replace(/[\s\-'’]/g, '')
  return v === word.answer
}

/* ------------------------------------------------------------------ */
/* 五十音圖 — one group per row (basic, dakuten/handakuten, youon).    */
/* ------------------------------------------------------------------ */

/** [row title, kind, [romaji, kana] pairs] */
const KANA_ROWS: [string, 'basic' | 'dakuten' | 'youon', [string, string][]][] = [
  ['あ行 · a', 'basic', [['a', 'あ'], ['i', 'い'], ['u', 'う'], ['e', 'え'], ['o', 'お']]],
  ['か行 · k', 'basic', [['ka', 'か'], ['ki', 'き'], ['ku', 'く'], ['ke', 'け'], ['ko', 'こ']]],
  ['さ行 · s', 'basic', [['sa', 'さ'], ['shi', 'し'], ['su', 'す'], ['se', 'せ'], ['so', 'そ']]],
  ['た行 · t', 'basic', [['ta', 'た'], ['chi', 'ち'], ['tsu', 'つ'], ['te', 'て'], ['to', 'と']]],
  ['な行 · n', 'basic', [['na', 'な'], ['ni', 'に'], ['nu', 'ぬ'], ['ne', 'ね'], ['no', 'の']]],
  ['は行 · h', 'basic', [['ha', 'は'], ['hi', 'ひ'], ['fu', 'ふ'], ['he', 'へ'], ['ho', 'ほ']]],
  ['ま行 · m', 'basic', [['ma', 'ま'], ['mi', 'み'], ['mu', 'む'], ['me', 'め'], ['mo', 'も']]],
  ['や行 · y', 'basic', [['ya', 'や'], ['yu', 'ゆ'], ['yo', 'よ']]],
  ['ら行 · r', 'basic', [['ra', 'ら'], ['ri', 'り'], ['ru', 'る'], ['re', 'れ'], ['ro', 'ろ']]],
  ['わ行 · w', 'basic', [['wa', 'わ'], ['wo', 'を'], ['n', 'ん']]],
  ['が行 · g', 'dakuten', [['ga', 'が'], ['gi', 'ぎ'], ['gu', 'ぐ'], ['ge', 'げ'], ['go', 'ご']]],
  ['ざ行 · z', 'dakuten', [['za', 'ざ'], ['ji', 'じ'], ['zu', 'ず'], ['ze', 'ぜ'], ['zo', 'ぞ']]],
  ['だ行 · d', 'dakuten', [['da', 'だ'], ['ji', 'ぢ'], ['zu', 'づ'], ['de', 'で'], ['do', 'ど']]],
  ['ば行 · b', 'dakuten', [['ba', 'ば'], ['bi', 'び'], ['bu', 'ぶ'], ['be', 'べ'], ['bo', 'ぼ']]],
  ['ぱ行 · p', 'dakuten', [['pa', 'ぱ'], ['pi', 'ぴ'], ['pu', 'ぷ'], ['pe', 'ぺ'], ['po', 'ぽ']]],
  ['きゃ行 · ky', 'youon', [['kya', 'きゃ'], ['kyu', 'きゅ'], ['kyo', 'きょ']]],
  ['しゃ行 · sh', 'youon', [['sha', 'しゃ'], ['shu', 'しゅ'], ['sho', 'しょ']]],
  ['ちゃ行 · ch', 'youon', [['cha', 'ちゃ'], ['chu', 'ちゅ'], ['cho', 'ちょ']]],
  ['にゃ行 · ny', 'youon', [['nya', 'にゃ'], ['nyu', 'にゅ'], ['nyo', 'にょ']]],
  ['ひゃ行 · hy', 'youon', [['hya', 'ひゃ'], ['hyu', 'ひゅ'], ['hyo', 'ひょ']]],
  ['みゃ行 · my', 'youon', [['mya', 'みゃ'], ['myu', 'みゅ'], ['myo', 'みょ']]],
  ['りゃ行 · ry', 'youon', [['rya', 'りゃ'], ['ryu', 'りゅ'], ['ryo', 'りょ']]],
  ['ぎゃ行 · gy', 'youon', [['gya', 'ぎゃ'], ['gyu', 'ぎゅ'], ['gyo', 'ぎょ']]],
  ['じゃ行 · j', 'youon', [['ja', 'じゃ'], ['ju', 'じゅ'], ['jo', 'じょ']]],
  ['びゃ行 · by', 'youon', [['bya', 'びゃ'], ['byu', 'びゅ'], ['byo', 'びょ']]],
  ['ぴゃ行 · py', 'youon', [['pya', 'ぴゃ'], ['pyu', 'ぴゅ'], ['pyo', 'ぴょ']]],
]

const keymapGroups: KeymapGroup[] = KANA_ROWS.map(([title, kind, pairs]) => ({
  title,
  subtitle:
    kind === 'youon'
      ? '拗音：子音 + ya / yu / yo'
      : kind === 'dakuten'
        ? '濁音／半濁音'
        : undefined,
  keys: pairs.map(([romaji, kana]) => ({
    key: romaji,
    label: kana,
    sounds: [romaji],
  })),
}))

/* Key-memory cards: one per kana row, with real example forms from the data. */
function buildKeyCards(): KeyCard[] {
  return KANA_ROWS.map(([title, , pairs]) => {
    const rowName = title.split(' ')[0]
    // ん (n) never starts a word — exclude it from example matching so
    // the わ行 card does not pick up な行 words like ない.
    const prefixes = pairs.map(([romaji]) => romaji).filter((p) => p !== 'n')
    const examples = rows
      .filter((r) => prefixes.some((p) => r.romaji.startsWith(p)))
      .slice(0, 3)
      .map((r) => ({ word: r.formClean, code: r.romaji }))
    const kanaList = pairs.map(([, kana]) => kana).join(' ')
    const romaList = pairs.map(([romaji]) => romaji).join(' ')
    return {
      key: rowName,
      title: `${rowName} · ${romaList}`,
      body: `「${rowName}」係 ${kanaList}（${romaList}）。打字嗰陣直接打羅馬音就得。`,
      examples,
    }
  })
}

export const japaneseAdapter: LanguageAdapter = {
  id: 'japanese',
  name: '日文',
  englishName: 'Japanese · 文法 N5–N1',
  tagline: '544 條文法 · N5→N1 · 打羅馬音',
  color: '#7c3aed',
  isStub: false,
  words,
  inputProps: {
    inputMode: 'text',
    autoCapitalize: 'off',
    autoCorrect: 'off',
    spellCheck: false,
    lang: 'en',
  },
  matches: japaneseMatches,
  keymapGroups,
  keyCards: buildKeyCards(),
}
