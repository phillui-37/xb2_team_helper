import { createContext, useContext, type ReactNode } from "react"
import type { Catalog, Language } from "../../types/common"

const STORAGE_KEY = 'xb2-lang'

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'ja', label: '日本語' },
  { id: 'en', label: 'English' },
  { id: 'zh-tw', label: '繁體中文' },
]

export function readStoredLanguage(): Language {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'ja' || value === 'en' || value === 'zh-tw')
      return value
  } catch {
    // ignore
  }
  return 'ja'
}

export function storeLanguage(lang: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // ignore
  }
}

type I18nContextValue = {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider(props: {
  catalog: Catalog
  lang: Language
  setLang: (lang: Language) => void
  children: ReactNode
}) {
  const t = (key: string, vars?: Record<string, string | number>) => {
    let text = props.catalog.translations.get(key)?.[props.lang] ?? key
    if (vars) {
      for (const [name, value] of Object.entries(vars))
        text = text.split(`{${name}}`).join(String(value))
    }
    return text
  }
  return (
    <I18nContext.Provider value={{ lang: props.lang, setLang: props.setLang, t }}>
      {props.children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx)
    throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
