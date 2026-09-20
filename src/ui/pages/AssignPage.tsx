import { useMemo, useState } from "react"
import { Checkbox, Chip, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material"
import { match } from "ts-pattern"
import type { BladeSource, Catalog } from "../../types/common"
import { useI18n } from "../i18n/LanguageContext"
import { fuzzyFilterOptions } from "../misc/search"

const sourceLabelKey = (source: BladeSource) =>
  match(source)
    .with('FIXED', () => 'ui.sourceFixed')
    .with('BINDED', () => 'ui.sourceBinded')
    .with('FREE', () => 'ui.sourceFree')
    .exhaustive()

export default function AssignPage(props: {
  catalog: Catalog
  owners: Map<string, string>
  advancedNewGame: boolean
  onAdvancedNewGameChange: (enabled: boolean) => void
  onChange: (owners: Map<string, string>) => void
}) {
  const { t } = useI18n()
  const { catalog } = props
  const [query, setQuery] = useState('')

  const blades = useMemo(() => {
    const sorted = catalog.blades
      .filter(blade => !blade.advancedNewGame || props.advancedNewGame)
      .slice()
      .sort((a, b) =>
        t(`blade.${a.name}`).localeCompare(t(`blade.${b.name}`), undefined, { sensitivity: 'base' }),
      )
    return fuzzyFilterOptions(sorted, query, blade => [`blade.${blade.name}`])
  }, [catalog, query, props.advancedNewGame, t])

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
        label={t('ui.advancedNewGame')}
      />
      <Typography variant="body2" color="text.secondary">{t('ui.assignHint')}</Typography>
      <TextField
        size="small"
        label={t('ui.searchBlade')}
        value={query}
        onChange={event => setQuery(event.target.value)}
      />
      <div className="flex flex-col gap-2">
        {blades.map(blade => {
          const locked = catalog.isAssignmentLocked(blade.name)
          const dedicated = catalog.dedicatedDrivers(blade.name)
          const source = catalog.bladeSource(blade.name)
          return (
            <div key={blade.name} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Typography variant="subtitle2">{t(`blade.${blade.name}`)}</Typography>
                  <Chip size="small" label={t(sourceLabelKey(source))} />
                  {blade.advancedNewGame && <Chip size="small" variant="outlined" label={t('ui.angTag')} />}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Chip size="small" variant="outlined" color="secondary" label={t(`weapon.${blade.weaponName}`)} />
                  {blade.elements.map(el => (
                    <Chip key={el} size="small" variant="outlined" label={t(`element.${el}`)} />
                  ))}
                  <Chip size="small" variant="outlined" label={`${t('ui.auxCores')} ×${blade.auxCoreSlots}`} />
                </div>
              </div>
              {locked ? (
                <div className="flex min-w-56 flex-wrap items-center gap-1">
                  <Chip size="small" color="default" label={t('ui.lockedAssign')} />
                  {dedicated.map(driver => (
                    <Chip key={driver} size="small" color="primary" variant="outlined" label={t(`driver.${driver}`)} />
                  ))}
                </div>
              ) : (
                <FormControl size="small" className="min-w-56">
                  <InputLabel id={`owner-${blade.name}`} shrink>{t('ui.driver')}</InputLabel>
                  <Select
                    labelId={`owner-${blade.name}`}
                    label={t('ui.driver')}
                    value={props.owners.get(blade.name) ?? ''}
                    displayEmpty
                    notched
                    onChange={event => setOwner(blade.name, event.target.value)}
                  >
                    <MenuItem value="">{t('ui.unassigned')}</MenuItem>
                    {catalog.assignableDrivers(blade.name).map(driver => (
                      <MenuItem key={driver} value={driver}>{t(`driver.${driver}`)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
