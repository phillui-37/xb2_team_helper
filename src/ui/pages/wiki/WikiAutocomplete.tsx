import { Autocomplete, TextField } from "@mui/material"
import { fuzzyFilterOptions } from "../../misc/search"
import { useI18n } from "../../i18n/LanguageContext"

export default function WikiAutocomplete<T extends string>(props: {
  label: string
  value: T | null
  options: T[]
  optionKey: (value: T) => string
  onChange: (value: T | null) => void
}) {
  const { t } = useI18n()
  return (
    <Autocomplete
      size="small"
      options={props.options}
      value={props.value}
      onChange={(_event, value) => props.onChange(value)}
      getOptionLabel={option => t(props.optionKey(option))}
      filterOptions={(options, state) =>
        fuzzyFilterOptions(options, state.inputValue, option => [props.optionKey(option)])
      }
      renderInput={params => <TextField {...params} label={props.label} />}
    />
  )
}
