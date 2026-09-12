import i18n from "../i18n/i18n"
import type { Language } from "../../types/common"

const SEARCH_LANGS: Language[] = ['ja', 'en', 'zh-tw']

export function normalizeSearch(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, '')
}

export function textsForKey(key: string): string[] {
  return SEARCH_LANGS.map(lng => String(i18n.t(key, { lng })))
}

export function fuzzyMatch(query: string, keys: string[]): boolean {
  const q = normalizeSearch(query)
  if (!q)
    return true
  return keys.some(key => textsForKey(key).some(text => normalizeSearch(text).includes(q)))
}

export function fuzzyFilterOptions<T>(options: T[], query: string, optionKeys: (option: T) => string[]): T[] {
  return options.filter(option => fuzzyMatch(query, optionKeys(option)))
}
