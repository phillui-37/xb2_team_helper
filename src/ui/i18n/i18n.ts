import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import type { Language } from '../../types/common'
import ja from './locales/ja.json'
import en from './locales/en.json'
import zhTw from './locales/zh-tw.json'

export const STORAGE_KEY = 'xb2-lang'

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'ja', label: '日本語' },
  { id: 'en', label: 'English' },
  { id: 'zh-tw', label: '繁體中文' },
]

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ja: { translation: ja },
      en: { translation: en },
      'zh-tw': { translation: zhTw },
      'zh-TW': { translation: zhTw },
    },
    fallbackLng: 'ja',
    supportedLngs: ['ja', 'en', 'zh-tw', 'zh-TW'],
    lowerCaseLng: true,
    load: 'currentOnly',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
  })

export default i18n
