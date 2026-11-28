/**
 * Static per-language metadata — the half of an adapter that does NOT
 * need the word list. The home screen and dashboard render from this
 * alone, so the initial load fetches no word data at all; the full
 * adapter (word list + matching + keymap) is loaded lazily by
 * loadAdapter() in ./index.ts, one dynamic import per language, so
 * Vite emits one chunk per language instead of a single 4 MB bundle
 * (review P2 #10).
 *
 * KEEP IN SYNC with the adapter files (name / englishName / tagline /
 * color / isStub / wordCount) — scripts/verify-adapters.ts checks
 * every field against the real adapters and fails the build if they
 * drift. Spanish tagline/isStub mirror the non-stub dataset
 * (data._stub !== true); if the dataset ever goes back to a stub,
 * update both here and in spanish/adapter.ts.
 */
import type { LanguageId } from '../core/types'

export interface LanguageMeta {
  id: LanguageId
  name: string
  englishName: string
  tagline: string
  color: string
  isStub: boolean
  wordCount: number
}

export const LANGUAGE_META: LanguageMeta[] = [
  {
    id: 'cantonese',
    name: '粵語',
    englishName: 'Cantonese · SGPB 雙拼',
    tagline: '6,000 個常用詞 · 雙拼輸入 · 粵語拼音',
    color: '#e0452a',
    isStub: false,
    wordCount: 6000,
  },
  {
    id: 'korean',
    name: '韓文',
    englishName: 'Korean · 두벌식',
    tagline: '6,000 個常用詞 · 韓文輸入 · 자모提示',
    color: '#2563eb',
    isStub: false,
    wordCount: 6000,
  },
  {
    id: 'spanish',
    name: '西班牙文',
    englishName: 'Spanish · Acentos',
    tagline: '6,000 個常用詞 · 重音唔使特登打',
    color: '#ca8a04',
    isStub: false,
    wordCount: 6000,
  },
  {
    id: 'japanese',
    name: '日文',
    englishName: 'Japanese · 文法 N5–N1',
    tagline: '544 條文法 · N5→N1 · 打羅馬音',
    color: '#7c3aed',
    isStub: false,
    wordCount: 544,
  },
  {
    id: 'chinese',
    name: '中文',
    englishName: 'Chinese · HSK 1–7',
    tagline: '6,000 詞 · HSK 1→7 · 打拼音',
    color: '#059669',
    isStub: false,
    wordCount: 6000,
  },
]

export const META_BY_ID: Record<LanguageId, LanguageMeta> = {
  cantonese: LANGUAGE_META[0],
  korean: LANGUAGE_META[1],
  spanish: LANGUAGE_META[2],
  japanese: LANGUAGE_META[3],
  chinese: LANGUAGE_META[4],
}
