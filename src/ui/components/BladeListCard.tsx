import type { ReactNode } from "react"
import { Checkbox, Chip, FormControlLabel, Typography } from "@mui/material"
import type { BladeInfo, Catalog } from "../../types/common"
import { useI18n } from "../i18n/LanguageContext"
import { sourceLabelKey } from "../misc/bladeSource"
import BladeFactChips from "./BladeFactChips"

export default function BladeListCard(props: {
  catalog: Catalog
  blade: BladeInfo
  extraChips?: ReactNode
  action?: ReactNode
  selectable?: {
    checked: boolean
    onChange: (checked: boolean) => void
  }
}) {
  const { t } = useI18n()
  const { blade, catalog } = props
  const source = catalog.bladeSource(blade.name)
  const identity = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <Typography variant="subtitle2">{t(`blade.${blade.name}`)}</Typography>
        <Chip size="small" label={t(sourceLabelKey(source))} />
        {blade.advancedNewGame && (
          <Chip size="small" variant="outlined" label={t("ui.angTag")} />
        )}
      </div>
      <div className="mt-1">
        <BladeFactChips
          blade={blade}
          afterWeapon={props.extraChips}
          markDefaultElement
        />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 md:flex-row md:items-center">
      {props.selectable ? (
        <FormControlLabel
          className="min-w-0 flex-1"
          control={
            <Checkbox
              checked={props.selectable.checked}
              onChange={event => props.selectable?.onChange(event.target.checked)}
            />
          }
          label={identity}
        />
      ) : (
        <div className="min-w-0 flex-1">{identity}</div>
      )}
      {props.action}
    </div>
  )
}
