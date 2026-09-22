import { useMemo, useState } from "react"
import { Checkbox, Chip, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material"
import type { Catalog } from "../../types/common"
import { useI18n } from "../i18n/LanguageContext"
import { useBladeNameList } from "../misc/useBladeNameList"
import BladeListCard from "../components/BladeListCard"

export default function AssignPage(props: {
  catalog: Catalog
  owners: Map<string, string>
  advancedNewGame: boolean
  onAdvancedNewGameChange: (enabled: boolean) => void
  onChange: (owners: Map<string, string>) => void
}) {
  const { t } = useI18n()
  const { catalog } = props
  const [query, setQuery] = useState("")
  const visible = useMemo(
    () => catalog.blades.filter(blade => !blade.advancedNewGame || props.advancedNewGame),
    [catalog, props.advancedNewGame],
  )
  const blades = useBladeNameList(visible, query)

  const setOwner = (blade: string, driver: string) => {
    const next = new Map(props.owners)
    if (!driver)
      next.delete(blade)
    else
      next.set(blade, driver)
    props.onChange(next)
  }

  return (
    <div className="flex flex-col gap-4">
      <FormControlLabel
        control={
          <Checkbox
            checked={props.advancedNewGame}
            onChange={event => props.onAdvancedNewGameChange(event.target.checked)}
          />
        }
        label={t("ui.advancedNewGame")}
      />
      <Typography variant="body2" color="text.secondary">{t("ui.assignHint")}</Typography>
      <TextField
        size="small"
        label={t("ui.searchBlade")}
        value={query}
        onChange={event => setQuery(event.target.value)}
      />
      <div className="flex flex-col gap-2">
        {blades.map(blade => {
          const locked = catalog.isAssignmentLocked(blade.name)
          const dedicated = catalog.dedicatedDrivers(blade.name)
          return (
            <BladeListCard
              key={blade.name}
              catalog={catalog}
              blade={blade}
              extraChips={blade.canChangeElement
                ? <Chip size="small" variant="outlined" label={t("ui.elementChangeable")} />
                : undefined}
              action={locked ? (
                <div className="flex min-w-56 flex-wrap items-center gap-1">
                  <Chip size="small" color="default" label={t("ui.lockedAssign")} />
                  {dedicated.map(driver => (
                    <Chip key={driver} size="small" color="primary" variant="outlined" label={t(`driver.${driver}`)} />
                  ))}
                </div>
              ) : (
                <FormControl size="small" className="min-w-56">
                  <InputLabel id={`owner-${blade.name}`} shrink>{t("ui.driver")}</InputLabel>
                  <Select
                    labelId={`owner-${blade.name}`}
                    label={t("ui.driver")}
                    value={props.owners.get(blade.name) ?? ""}
                    displayEmpty
                    notched
                    onChange={event => setOwner(blade.name, event.target.value)}
                  >
                    <MenuItem value="">{t("ui.unassigned")}</MenuItem>
                    {catalog.assignableDrivers(blade.name).map(driver => (
                      <MenuItem key={driver} value={driver}>{t(`driver.${driver}`)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          )
        })}
      </div>
    </div>
  )
}
