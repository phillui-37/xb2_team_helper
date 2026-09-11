import { useTranslation } from "react-i18next"
import type { Language } from "../../types/common"
import { LANGUAGES } from "./i18n"

export { LANGUAGES }

export function useI18n() {
  const { t, i18n } = useTranslation()
  const lang = (LANGUAGES.some(item => item.id === i18n.language) ? i18n.language : 'ja') as Language
  return {
    t: (key: string, vars?: Record<string, string | number>) => vars ? t(key, vars) : t(key),
    lang,
    setLang: (next: Language) => {
      void i18n.changeLanguage(next)
    },
  }
}
