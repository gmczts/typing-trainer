/**
 * Language registry — lazy loading (review P2 #10).
 *
 * Each language's adapter module statically imports its word list
 * (JSON), so importing an adapter pulls that whole list into the
 * bundle. The registry therefore loads adapters ONLY through dynamic
 * import(): Vite emits one chunk per language, and the home screen
 * (which only needs LANGUAGE_META from ./meta) loads no word data.
 *
 * To add a language: create src/languages/<id>/adapter.ts exporting a
 * `LanguageAdapter`, add its word list under src/data/, register its
 * metadata in ./meta.ts and its loader below. Nothing else changes.
 */
import type { LanguageAdapter, LanguageId } from '../core/types'

export { LANGUAGE_META, META_BY_ID, type LanguageMeta } from './meta'

const loaders: Record<LanguageId, () => Promise<LanguageAdapter>> = {
  cantonese: async () => (await import('./cantonese/adapter')).cantoneseAdapter,
  korean: async () => (await import('./korean/adapter')).koreanAdapter,
  spanish: async () => (await import('./spanish/adapter')).spanishAdapter,
  japanese: async () => (await import('./japanese/adapter')).japaneseAdapter,
  chinese: async () => (await import('./chinese/adapter')).chineseAdapter,
}

/** One cached promise per language — a language is fetched at most once. */
const cache = new Map<LanguageId, Promise<LanguageAdapter>>()
/** Adapters that have finished loading (lets the UI skip the loading
 *  flash when revisiting a language). */
const resolved = new Map<LanguageId, LanguageAdapter>()

export function loadAdapter(id: LanguageId): Promise<LanguageAdapter> {
  let p = cache.get(id)
  if (!p) {
    p = loaders[id]().then((adapter) => {
      resolved.set(id, adapter)
      return adapter
    })
    cache.set(id, p)
  }
  return p
}

export function getCachedAdapter(id: LanguageId): LanguageAdapter | undefined {
  return resolved.get(id)
}
