import { Chip, TextField } from "@mui/material"
import type { Catalog, ElementChoice } from "../../types/common"
import { bladeMatchesPartyRole } from "../../model/party"
import { useI18n } from "../i18n/LanguageContext"
import BladeFactChips from "./BladeFactChips"
import ElementChoiceSelect from "./ElementChoiceSelect"

export function BladeSlotSummary(props: {
  catalog: Catalog
  driver: string
  blade: string
  slot: number
  allowElementChange: boolean
  elementChoice: ElementChoice
  onElementChange: (choice: ElementChoice) => void
  partyDrivers?: readonly string[]
}) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-1">
      <TextField
        size="small"
        label={`${t("ui.blade")} ${props.slot + 1}`}
        value={t(`blade.${props.blade}`)}
        slotProps={{ input: { readOnly: true } }}
      />
      <BladeChips
        catalog={props.catalog}
        driver={props.driver}
        blade={props.blade}
        allowElementChange={props.allowElementChange}
        elementChoice={props.elementChoice}
        onElementChange={props.onElementChange}
        partyDrivers={props.partyDrivers}
      />
    </div>
  )
}

export function BladeChips(props: {
  catalog: Catalog
  driver: string
  blade: string
  allowElementChange?: boolean
  elementChoice?: ElementChoice
  onElementChange?: (choice: ElementChoice) => void
  partyDrivers?: readonly string[]
}) {
  const { t } = useI18n()
  const info = props.catalog.bladeByName.get(props.blade)
  const effects = props.catalog.effectsOf(props.driver, props.blade)
  const onRole = props.partyDrivers
    ? bladeMatchesPartyRole(props.catalog, props.driver, props.blade, props.partyDrivers)
    : props.catalog.isOnRole(props.driver, props.blade)
  const offRole = !onRole && !props.catalog.isFixed(props.driver, props.blade)
  const dedicated = props.catalog.dedicatedDrivers(props.blade)
  const borrowed = dedicated.length > 0 && !dedicated.includes(props.driver)
  const showElementSelect = !!info?.canChangeElement
    && !!props.allowElementChange
    && !!props.onElementChange
  const defaultElement = info?.elements[0]
  return (
    <div className="flex flex-col gap-1">
      {showElementSelect && (
        <ElementChoiceSelect
          id={`element-choice-${props.blade.replaceAll(" ", "-")}`}
          catalog={props.catalog}
          defaultElement={defaultElement}
          value={props.elementChoice ?? null}
          onChange={props.onElementChange!}
        />
      )}
      {info && (
        <BladeFactChips
          blade={info}
          leading={
            <>
              {borrowed && <Chip size="small" color="info" label={t("ui.borrowed")} />}
              {offRole && <Chip size="small" color="warning" label={t("ui.offRole")} />}
              {info.advancedNewGame && <Chip size="small" variant="outlined" label={t("ui.angTag")} />}
            </>
          }
          afterWeapon={effects.map(eff => (
            <Chip key={eff} size="small" color="primary" variant="outlined" label={t(`effect.${eff}`)} />
          ))}
          showElements={!showElementSelect}
        />
      )}
    </div>
  )
}
