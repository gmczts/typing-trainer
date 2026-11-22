/**
 * Shared core types for the typing trainer.
 *
 * A language is a *plugin*: one folder under src/languages/<id>/ with an
 * adapter that conforms to `LanguageAdapter`. The core engine and all UI
 * components only ever talk to this interface — a new language is just a
 * new folder + word list, no core changes.
 */

export type LanguageId = 'cantonese' | 'korean' | 'spanish'

export const WORDS_PER_LEVEL = 10

export function levelCountFor(wordCount: number): number {
  return Math.ceil(wordCount / WORDS_PER_LEVEL)
}

/** One display line on a practice card. `tone` decides styling. */
export interface CardLine {
  text: string
  tone: 'jyutping' | 'roman' | 'pinyin' | 'gloss' | 'gloss2' | 'example' | 'muted'
}

/**
 * Everything the practice screen, dictionary and review need for one word.
 * Adapters precompute this from their raw dataset rows so the UI never
 * touches language-specific fields.
 */
export interface WordView {
  /** Stable id: `${languageId}:${index}` */
  id: string
  /** Index into the language's word list (0-based) */
  index: number
  /** The big word shown on the card */
  display: string
  /** Lines shown above the word (Jyutping / Romanization) */
  above: CardLine[]
  /** Lines shown below the word (pinyin, glosses, example) */
  below: CardLine[]
  /** Exact string the user is expected to type (before normalisation) */
  answer: string
  /** Input placeholder hint (e.g. the SGPB code, or first-letter hint) */
  hint: string
  /** Letter-by-letter prompt shown above the input (Korean jamo), or null */
  prompt: string | null
  /** Label for the prompt, e.g. "字母提示" */
  promptLabel: string | null
  /** Lower-cased blob of every searchable field, for dictionary search */
  searchText: string
  /** Level (1-based) and position inside the level (1-based) */
  level: number
  positionInLevel: number
}

/** One key on a language's keymap. */
export interface KeyInfo {
  /** The keyboard key, lower-case a–z (or punctuation for Korean) */
  key: string
  /** What the key stands for, e.g. "gw" or "ㅂ" */
  label: string
  /** Sounds / finals this key produces */
  sounds: string[]
  /** Optional extra note, e.g. "聲母" / "韻母" */
  note?: string
}

export interface KeymapGroup {
  title: string
  subtitle?: string
  keys: KeyInfo[]
}

/** One key-memory flashcard. */
export interface KeyCard {
  key: string
  title: string
  body: string
  examples: { word: string; code: string }[]
}

/** Accent guide entry (Spanish): which plain key accepts which letters. */
export interface AccentGuideEntry {
  plain: string
  accented: string[]
  note: string
}

export interface LanguageAdapter {
  id: LanguageId
  /** Native name, e.g. "粵語" */
  name: string
  /** English name, e.g. "Cantonese (SGPB)" */
  englishName: string
  /** One-line description for the home card */
  tagline: string
  /** Accent colour used on the home card (any Tailwind-safe hex) */
  color: string
  /** True while the dataset is a stub awaiting the real word list */
  isStub: boolean
  /** All words as WordViews, in frequency order */
  words: WordView[]
  /** Keyboard layout attributes for the practice input */
  inputProps: {
    inputMode?: 'text' | 'search'
    autoCapitalize?: 'off' | 'none' | 'sentences'
    autoCorrect?: 'off' | 'on'
    spellCheck?: boolean
    lang?: string
  }
  /** Does typing `input` count as a correct answer for this word? */
  matches(input: string, word: WordView): boolean
  /** Keymap grouped for display (initials / finals, consonants / vowels…) */
  keymapGroups: KeymapGroup[]
  /** 26 key-memory cards */
  keyCards: KeyCard[]
  /** Accent guide (Spanish only) */
  accentGuide?: AccentGuideEntry[]
}

/** Per-level result stored after a level is completed. */
export interface LevelResult {
  level: number
  accuracy: number // 0..1
  errors: number
  seconds: number
  date: string // ISO
  wrongWordIds: string[]
}

/** Everything persisted per language in localStorage. */
export interface LanguageProgress {
  completedLevels: number[]
  results: Record<number, LevelResult>
  wrongWords: Record<string, number> // word id -> times answered wrong
  totalAnswered: number
  totalCorrect: number
  totalSessions: number
  lastPlayed: string | null
}

export function emptyProgress(): LanguageProgress {
  return {
    completedLevels: [],
    results: {},
    wrongWords: {},
    totalAnswered: 0,
    totalCorrect: 0,
    totalSessions: 0,
    lastPlayed: null,
  }
}
