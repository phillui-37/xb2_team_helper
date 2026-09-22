import type { ReactNode } from "react"
import { Chip } from "@mui/material"
import type { BladeInfo } from "../../types/common"
import { useI18n } from "../i18n/LanguageContext"

type Translate = (key: string) => string

export const auxCoreLabel = (t: Translate, count: number): string =>
  `${t("ui.auxCores")} ×${count}`

export function elementChipLabel(
  t: Translate,
  blade: BladeInfo,
  element: string,
): string {
  const label = t(`element.${element}`)
  return blade.canChangeElement
    ? `${label} (${t("ui.defaultElement")})`
    : label
}

/** Weapon, optional extras, elements, and aux-core chips used by list rows and slot summaries. */
export default function BladeFactChips(props: {
  blade: BladeInfo
  leading?: ReactNode
  afterWeapon?: ReactNode
  showElements?: boolean
  markDefaultElement?: boolean
}) {
  const { t } = useI18n()
  const { blade } = props
  const showElements = props.showElements ?? true
  return (
    <div className="flex flex-wrap gap-1">
      {props.leading}
      <Chip
        size="small"
        color="secondary"
        variant="outlined"
        label={t(`weapon.${blade.weaponName}`)}
      />
      {props.afterWeapon}
      {showElements && blade.elements.map(el => (
        <Chip
          key={el}
          size="small"
          variant="outlined"
          label={props.markDefaultElement ? elementChipLabel(t, blade, el) : t(`element.${el}`)}
        />
      ))}
      <Chip size="small" variant="outlined" label={auxCoreLabel(t, blade.auxCoreSlots)} />
    </div>
  )
}
