import { FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import type { Catalog, ElementChoice } from "../../types/common"
import { ANY_ELEMENT } from "../../types/common"
import { useI18n } from "../i18n/LanguageContext"

export default function ElementChoiceSelect(props: {
  id: string
  catalog: Catalog
  defaultElement: string | undefined
  value: ElementChoice
  onChange: (choice: ElementChoice) => void
}) {
  const { t } = useI18n()
  const selectedElement = props.value ?? props.defaultElement ?? ""
  const optionLabel = (el: string): string =>
    el === props.defaultElement
      ? `${t(`element.${el}`)} (${t("ui.defaultElement")})`
      : t(`element.${el}`)

  return (
    <FormControl fullWidth size="small">
      <InputLabel id={props.id} shrink>{t("ui.element")}</InputLabel>
      <Select
        labelId={props.id}
        label={t("ui.element")}
        value={selectedElement}
        displayEmpty
        notched
        renderValue={value => {
          if (!value || value === ANY_ELEMENT)
            return t("ui.anyElement")
          return optionLabel(value)
        }}
        onChange={event => {
          const value = event.target.value
          props.onChange(value === props.defaultElement ? null : value)
        }}
      >
        <MenuItem value={ANY_ELEMENT}>{t("ui.anyElement")}</MenuItem>
        {props.catalog.elements.map(el => (
          <MenuItem key={el} value={el}>{optionLabel(el)}</MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
