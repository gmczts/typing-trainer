/**
 * Language registry — the plugin list.
 *
 * To add a language: create src/languages/<id>/adapter.ts exporting a
 * `LanguageAdapter`, add its word list under src/data/, and register it
 * here. Nothing else changes.
 */
import { cantoneseAdapter } from './cantonese/adapter'
import { koreanAdapter } from './korean/adapter'
import { spanishAdapter } from './spanish/adapter'
import type { LanguageAdapter, LanguageId } from '../core/types'

export const ADAPTERS: LanguageAdapter[] = [cantoneseAdapter, koreanAdapter, spanishAdapter]

export const ADAPTER_BY_ID: Record<LanguageId, LanguageAdapter> = {
  cantonese: cantoneseAdapter,
  korean: koreanAdapter,
  spanish: spanishAdapter,
}

export function getAdapter(id: LanguageId): LanguageAdapter {
  return ADAPTER_BY_ID[id]
}
