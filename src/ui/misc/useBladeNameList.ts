import { useMemo } from "react"
import type { BladeInfo } from "../../types/common"
import { useI18n } from "../i18n/LanguageContext"
import { fuzzyFilterOptions } from "./search"

/** Locale-sort then fuzzy-filter blades by translated name. */
export function useBladeNameList(blades: readonly BladeInfo[], query: string): BladeInfo[] {
  const { t } = useI18n()
  return useMemo(() => {
    const sorted = blades.slice().sort((a, b) =>
      t(`blade.${a.name}`).localeCompare(t(`blade.${b.name}`), undefined, { sensitivity: "base" }),
    )
    return fuzzyFilterOptions(sorted, query, blade => [`blade.${blade.name}`])
  }, [blades, query, t])
}
