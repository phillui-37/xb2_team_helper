import { useMemo, useState } from "react"
import { Chip, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material"
import type { Catalog } from "../../types/common"
import { useI18n } from "../i18n/LanguageContext"

export default function AssignPage(props: {
  catalog: Catalog
  owners: Map<string, string>
  onChange: (owners: Map<string, string>) => void
}) {
  const { t } = useI18n()
  const { catalog } = props
  const [query, setQuery] = useState('')

  const blades = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.blades.slice().sort((a, b) =>
      t(`blade.${a.name}`).localeCompare(t(`blade.${b.name}`), undefined, { sensitivity: 'base' }),
    ).filter(blade => {
      if (!q)
        return true
      const name = t(`blade.${blade.name}`).toLowerCase()
      return name.includes(q) || blade.name.toLowerCase().includes(q)
    })
  }, [catalog, query, t])

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
          const sourceKey = source === 'FIXED' ? 'ui.sourceFixed' : source === 'BINDED' ? 'ui.sourceBinded' : 'ui.sourceFree'
          return (
            <div key={blade.name} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Typography variant="subtitle2">{t(`blade.${blade.name}`)}</Typography>
                  <Chip size="small" label={t(sourceKey)} />
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Chip size="small" variant="outlined" color="secondary" label={t(`weapon.${blade.weaponName}`)} />
                  {blade.elements.map(el => (
                    <Chip key={el} size="small" variant="outlined" label={t(`element.${el}`)} />
                  ))}
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
