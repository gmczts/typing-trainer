/**
 * Cantonese adapter — SGPB double-pinyin (rime-sg1pb3).
 *
 * Data: src/data/cantonese-words.json (6,000 items, verbatim copy).
 * Row fields: w, jy (toned Jyutping), py (Mandarin pinyin), sg (toneless
 * SGPB code), sgt (toned SGPB code), bd (key breakdown, e.g. "V+O"),
 * en, ex, exjy, exen (only 11 words have one), f.
 *
 * Keymap facts below are derived from the dataset itself (single-character
 * words): initials are the key itself except gw→R, kw→U, ng→V; finals are
 * grouped by vowel family. A key can be both an initial (word-initial
 * position) and a final (second position) — that is normal for SGPB.
 */
import raw from '../../data/cantonese-words.json'
import {
  WORDS_PER_LEVEL,
  type KeyCard,
  type KeymapGroup,
  type LanguageAdapter,
  type WordView,
} from '../../core/types'

export interface CantoneseRow {
  w: string
  jy: string
  py: string
  sg: string
  sgt: string
  bd: string
  en: string
  ex: string | null
  exjy: string | null
  exen: string | null
  f: number
}

const data = raw as unknown as { items: CantoneseRow[] }
const rows = data.items

function toWordView(row: CantoneseRow, index: number): WordView {
  const exampleParts: string[] = []
  if (row.ex) exampleParts.push(row.ex)
  if (row.exjy) exampleParts.push(row.exjy)
  if (row.exen) exampleParts.push(`— ${row.exen}`)
  return {
    id: `cantonese:${index}`,
    index,
    display: row.w,
    above: [{ text: row.jy, tone: 'jyutping' }],
    below: [
      { text: row.py, tone: 'pinyin' },
      { text: row.en, tone: 'gloss' },
      ...(exampleParts.length > 0
        ? [{ text: exampleParts.join(' · '), tone: 'example' as const }]
        : []),
    ],
    answer: row.sg,
    hint: row.sg,
    prompt: row.bd,
    promptLabel: '雙拼拆解',
    searchText: [row.w, row.jy, row.py, row.sg, row.sgt, row.en, row.ex ?? '', row.exjy ?? '']
      .join(' ')
      .toLowerCase(),
    level: Math.floor(index / WORDS_PER_LEVEL) + 1,
    positionInLevel: (index % WORDS_PER_LEVEL) + 1,
  }
}

const words: WordView[] = rows.map(toWordView)

/** A typed answer counts if it equals the toneless code, or the toned code with its tone digit stripped. */
export function cantoneseMatches(input: string, word: WordView): boolean {
  const row = rows[word.index]
  if (!row) return false
  const v = input.trim().toLowerCase()
  return v === row.sg || v === row.sgt.replace(/[1-6]$/, '')
}

/* ------------------------------------------------------------------ */
/* Keymap — derived from the dataset (see file header).                */
/* ------------------------------------------------------------------ */

const INITIALS: [string, string][] = [
  ['b', 'b'], ['c', 'c'], ['d', 'd'], ['f', 'f'], ['g', 'g'], ['h', 'h'],
  ['j', 'j'], ['k', 'k'], ['l', 'l'], ['m', 'm'], ['n', 'n'], ['p', 'p'],
  ['r', 'gw'], ['s', 's'], ['t', 't'], ['u', 'kw'], ['v', 'ng'], ['z', 'z'],
]

/** key -> Jyutping finals it represents (vowel family in the group title). */
const FINAL_GROUPS: { title: string; subtitle: string; finals: [string, string][] }[] = [
  {
    title: '韻母 · a 韻',
    subtitle: 'aa / aai / aau / an / aan / aam / aak',
    finals: [
      ['a', 'aa'], ['w', 'aai'], ['q', 'aau'], ['s', 'an · at'],
      ['z', 'aan · aat'], ['x', 'aam · aap'], ['c', 'aak · aang · ak · ang'],
    ],
  },
  {
    title: '韻母 · e / i 韻',
    subtitle: 'e / ei / ai / iu / eoi / in / ing / im',
    finals: [
      ['e', 'e'], ['i', 'ei · i'], ['f', 'ai'], ['k', 'iu'],
      ['j', 'eoi · ui'], ['h', 'in · it'], ['b', 'ek · eng · ik · ing'],
      ['l', 'im · ip'],
    ],
  },
  {
    title: '韻母 · o 韻',
    subtitle: 'o / oi / oek / ok / eon',
    finals: [
      ['o', 'o'], ['p', 'oi'], ['g', 'oek · oeng'], ['m', 'ok · ong'],
      ['t', 'eon · eot · on · ot'],
    ],
  },
  {
    title: '韻母 · u 韻',
    subtitle: 'ou / au / un / uk',
    finals: [
      ['u', 'ou · u'], ['d', 'au'], ['r', 'un · ut · yun · yut'], ['n', 'uk · ung'],
    ],
  },
  {
    title: '韻母 · 其他',
    subtitle: 'am / oe',
    finals: [['v', 'am · ap'], ['y', 'oe · yu']],
  },
]

const keymapGroups: KeymapGroup[] = [
  {
    title: '聲母',
    subtitle: '鍵 = 聲母本身，例外：gw → R，kw → U，ng → V（零聲母不用按聲母鍵）',
    keys: INITIALS.map(([key, sound]) => ({
      key,
      label: sound,
      sounds: [sound],
      note: '聲母',
    })),
  },
  ...FINAL_GROUPS.map((g) => ({
    title: g.title,
    subtitle: g.subtitle,
    keys: g.finals.map(([key, sound]) => ({
      key,
      label: sound,
      sounds: sound.split(' · '),
      note: '韻母',
    })),
  })),
]

/* Key-memory cards: one per key, with its roles + real example words from the data. */
function buildKeyCards(): KeyCard[] {
  const initialOf = new Map(INITIALS)
  const finalOf = new Map<string, string>()
  for (const g of FINAL_GROUPS) for (const [k, s] of g.finals) finalOf.set(k, s)

  const singleChar = rows.filter((r) => r.w.length === 1)
  return 'abcdefghijklmnopqrstuvwxyz'.split('').map((key) => {
    const roles: string[] = []
    if (initialOf.has(key)) roles.push(`聲母 ${initialOf.get(key)}`)
    if (finalOf.has(key)) roles.push(`韻母 ${finalOf.get(key)}`)
    const examples = singleChar
      .filter((r) => r.sg === key || r.sg.startsWith(key))
      .slice(0, 3)
      .map((r) => ({ word: `${r.w} ${r.jy}`, code: r.sg }))
    return {
      key: key.toUpperCase(),
      title: roles.join(' · ') || key.toUpperCase(),
      body:
        roles.length > 1
          ? `「${key.toUpperCase()}」鍵有兩個身份：${roles.join('；')}。邊個身份取決於位置——字頭係聲母，字尾係韻母。`
          : roles.length === 1
            ? `「${key.toUpperCase()}」鍵代表${roles[0]}。`
            : `「${key.toUpperCase()}」鍵`,
      examples,
    }
  })
}

export const cantoneseAdapter: LanguageAdapter = {
  id: 'cantonese',
  name: '粵語',
  englishName: 'Cantonese · SGPB 雙拼',
  tagline: '6,000 個常用詞 · 雙拼輸入 · 粵語拼音',
  color: '#e0452a',
  isStub: false,
  words,
  inputProps: {
    inputMode: 'text',
    autoCapitalize: 'off',
    autoCorrect: 'off',
    spellCheck: false,
    lang: 'en',
  },
  matches: cantoneseMatches,
  keymapGroups,
  keyCards: buildKeyCards(),
}
