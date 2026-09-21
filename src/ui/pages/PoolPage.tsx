import { useMemo, useState } from "react"
import { Button, Checkbox, Chip, FormControlLabel, TextField, Typography } from "@mui/material"
import { match } from "ts-pattern"
import type { BladeSource, Catalog } from "../../types/common"
import { isPoolableBlade } from "../../model/pool"
import { useI18n } from "../i18n/LanguageContext"
import { fuzzyFilterOptions } from "../misc/search"

const sourceLabelKey = (source: BladeSource) =>
  match(source)
    .with('FIXED', () => 'ui.sourceFixed')
    .with('BINDED', () => 'ui.sourceBinded')
    .with('FREE', () => 'ui.sourceFree')
    .exhaustive()

export default function PoolPage(props: {
  catalog: Catalog
  pool: Set<string>
  advancedNewGame: boolean
  allowTora: boolean
  matchRole: boolean
  uniqueWeapon: boolean
  borrowBound: boolean
  onChange: (pool: Set<string>) => void
  onAllowToraChange: (enabled: boolean) => void
  onMatchRoleChange: (enabled: boolean) => void
  onUniqueWeaponChange: (enabled: boolean) => void
  onBorrowBoundChange: (enabled: boolean) => void
}) {
  const { t } = useI18n()
  const { catalog } = props
  const [query, setQuery] = useState('')

  const blades = useMemo(() => {
    const sorted = catalog.blades
      .filter(blade => isPoolableBlade(catalog, blade, props.advancedNewGame))
      .slice()
      .sort((a, b) =>
        t(`blade.${a.name}`).localeCompare(t(`blade.${b.name}`), undefined, { sensitivity: 'base' }),
      )
    return fuzzyFilterOptions(sorted, query, blade => [`blade.${blade.name}`])
  }, [catalog, query, props.advancedNewGame, t])

  const setInPool = (blade: string, enabled: boolean) => {
    const next = new Set(props.pool)
    if (enabled)
      next.add(blade)
    else
      next.delete(blade)
    props.onChange(next)
  }

  const selectVisible = () => {
    const next = new Set(props.pool)
    for (const blade of blades)
      next.add(blade.name)
    props.onChange(next)
  }

  const clearVisible = () => {
    const next = new Set(props.pool)
    for (const blade of blades)
      next.delete(blade.name)
    props.onChange(next)
  }

  return (
    <div className="flex flex-col gap-4">
      <Typography variant="body2" color="text.secondary">{t('ui.poolHint')}</Typography>
      <div className="flex flex-col gap-1">
        <FormControlLabel
          control={
            <Checkbox
              checked={props.allowTora}
              onChange={event => props.onAllowToraChange(event.target.checked)}
            />
          }
          label={t('ui.allowTora')}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={props.matchRole}
              onChange={event => props.onMatchRoleChange(event.target.checked)}
            />
          }
          label={t('ui.matchRole')}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={props.uniqueWeapon}
              onChange={event => props.onUniqueWeaponChange(event.target.checked)}
            />
          }
          label={t('ui.uniqueWeapon')}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={props.borrowBound}
              onChange={event => props.onBorrowBoundChange(event.target.checked)}
            />
          }
          label={t('ui.borrowBound')}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <TextField
          size="small"
          className="min-w-56 flex-1"
          label={t('ui.searchBlade')}
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <Button size="small" onClick={selectVisible}>{t('ui.poolSelectVisible')}</Button>
        <Button size="small" onClick={clearVisible}>{t('ui.poolClearVisible')}</Button>
        <Typography variant="body2" color="text.secondary">
          {t('ui.poolCount', { n: props.pool.size })}
        </Typography>
      </div>
      <div className="flex flex-col gap-2">
        {blades.map(blade => {
          const source = catalog.bladeSource(blade.name)
          const checked = props.pool.has(blade.name)
          return (
            <div key={blade.name} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 md:flex-row md:items-center">
              <FormControlLabel
                className="min-w-0 flex-1"
                control={
                  <Checkbox
                    checked={checked}
                    onChange={event => setInPool(blade.name, event.target.checked)}
                  />
                }
                label={
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Typography variant="subtitle2">{t(`blade.${blade.name}`)}</Typography>
                      <Chip size="small" label={t(sourceLabelKey(source))} />
                      {blade.advancedNewGame && <Chip size="small" variant="outlined" label={t('ui.angTag')} />}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Chip size="small" variant="outlined" color="secondary" label={t(`weapon.${blade.weaponName}`)} />
                      {blade.elements.map(el => (
                        <Chip
                          key={el}
                          size="small"
                          variant="outlined"
                          label={blade.canChangeElement
                            ? `${t(`element.${el}`)} (${t('ui.defaultElement')})`
                            : t(`element.${el}`)}
                        />
                      ))}
                      <Chip size="small" variant="outlined" label={`${t('ui.auxCores')} ×${blade.auxCoreSlots}`} />
                    </div>
                  </div>
                }
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
