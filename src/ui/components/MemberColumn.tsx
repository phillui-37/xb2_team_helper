import { useEffect, useMemo, useState } from "react"
import { Clear } from "@mui/icons-material"
import { Chip, FormControl, IconButton, InputLabel, MenuItem, Select, TextField } from "@mui/material"
import type { BladeInfo, BladeOwners, Catalog, MemberState, SlotName } from "../../types/common"
import { NIA } from "../../model/solver"
import {
  allowName,
  and,
  eligible,
  niaBladeOk,
  notFixed,
  notNamed,
  or,
  selectBlades,
  uiFilters,
} from "../../model/criteria"
import { useI18n } from "../i18n/LanguageContext"

type DriverFilter = {
  elements: string[]
  weapons: string[]
  effects: string[]
}

const emptyFilter = (): DriverFilter => ({ elements: [], weapons: [], effects: [] })

export type MemberColumnProps = {
  catalog: Catalog
  index: number
  state: MemberState
  owners: BladeOwners
  usedBlades: Set<string>
  takenDrivers: Set<string>
  niaBladeTaken: boolean
  niaDriverTaken: boolean
  onChange: (state: MemberState) => void
}

export default function MemberColumn(props: MemberColumnProps) {
  const { t } = useI18n()
  const { catalog, state, owners } = props
  const [filter, setFilter] = useState<DriverFilter>(emptyFilter)

  useEffect(() => {
    setFilter(emptyFilter())
  }, [state.driver])

  const driverOptions = catalog.drivers.filter(d => {
    if (d.name === state.driver)
      return true
    if (props.takenDrivers.has(d.name))
      return false
    if (d.name === NIA && props.niaBladeTaken)
      return false
    return true
  })

  const weaponOptions = useMemo(() => {
    if (!state.driver)
      return [] as { name: string; onRole: boolean }[]
    const driver = catalog.driverByName.get(state.driver)
    const seen = new Map<string, boolean>()
    for (const blade of catalog.manualCandidatesFor(state.driver, owners)) {
      if (!seen.has(blade.weaponName))
        seen.set(blade.weaponName, !!driver && driver.role === blade.weaponRole)
    }
    return [...seen.entries()]
      .map(([name, onRole]) => ({ name, onRole }))
      .sort((a, b) => {
        if (a.onRole !== b.onRole)
          return a.onRole ? -1 : 1
        return t(`weapon.${a.name}`).localeCompare(t(`weapon.${b.name}`), undefined, { sensitivity: 'base' })
      })
  }, [catalog, state.driver, owners, t])

  const setDriver = (driver: string) => {
    const info = catalog.driverByName.get(driver)
    const blades: [SlotName, SlotName, SlotName] = [null, null, null]
    info?.fixedBlades.forEach((name, i) => {
      if (i < 3)
        blades[i] = name
    })
    props.onChange({ driver, blades })
  }

  const setBlade = (slot: number, blade: SlotName) => {
    const blades: [SlotName, SlotName, SlotName] = [...state.blades]
    blades[slot] = blade
    props.onChange({ ...state, blades })
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-lg border border-gray-200 p-3">
      <FormControl fullWidth size="small">
        <InputLabel id={`driver-${props.index}`} shrink>{t('ui.driver')}</InputLabel>
        <Select
          labelId={`driver-${props.index}`}
          label={t('ui.driver')}
          value={state.driver ?? ''}
          displayEmpty
          notched
          onChange={event => {
            const value = event.target.value
            if (value)
              setDriver(value)
          }}
        >
          {!state.driver && <MenuItem value="">{t('ui.pickDriver')}</MenuItem>}
          {driverOptions.map(d => (
            <MenuItem key={d.name} value={d.name}>
              {t(`driver.${d.name}`)} ({t(`role.${d.role}`)})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {state.driver && (
        <div className="flex flex-col gap-2">
          <FilterSelect
            id={`element-${props.index}`}
            label={t('ui.elements')}
            value={filter.elements}
            options={catalog.elements.map(name => ({ value: name, label: t(`element.${name}`) }))}
            onChange={elements => setFilter(ori => ({ ...ori, elements }))}
          />
          <FilterSelect
            id={`weapon-${props.index}`}
            label={t('ui.weapon')}
            value={filter.weapons}
            options={weaponOptions.map(w => ({
              value: w.name,
              label: w.onRole ? t(`weapon.${w.name}`) : `${t(`weapon.${w.name}`)} · ${t('ui.offRole')}`,
            }))}
            onChange={weapons => setFilter(ori => ({ ...ori, weapons }))}
          />
          <FilterSelect
            id={`effect-${props.index}`}
            label={t('ui.effects')}
            value={filter.effects}
            options={catalog.effects.map(name => ({ value: name, label: t(`effect.${name}`) }))}
            onChange={effects => setFilter(ori => ({ ...ori, effects }))}
          />
        </div>
      )}

      {[0, 1, 2].map(slot => {
        const selected = state.blades[slot]
        const locked = !!state.driver && !!selected && catalog.isFixed(state.driver, selected)
        if (!state.driver) {
          return (
            <TextField
              key={slot}
              size="small"
              label={`${t('ui.blade')} ${slot + 1}`}
              value=""
              disabled
            />
          )
        }
        if (locked) {
          return (
            <BladeSummary
              key={slot}
              catalog={catalog}
              driver={state.driver}
              blade={selected}
              slot={slot}
              locked
            />
          )
        }
        const driverName = state.driver
        const options = selectBlades(
          catalog.blades,
          { catalog, driver: driverName, owners },
          or(
            allowName(selected ?? null),
            and(
              eligible,
              notFixed,
              notNamed(props.usedBlades),
              niaBladeOk(props.niaDriverTaken),
              uiFilters(filter),
            ),
          ),
        ).slice().sort((a, b) => {
          const aOn = catalog.isOnRole(driverName, a.name) ? 0 : 1
          const bOn = catalog.isOnRole(driverName, b.name) ? 0 : 1
          if (aOn !== bOn)
            return aOn - bOn
          return t(`blade.${a.name}`).localeCompare(t(`blade.${b.name}`), undefined, { sensitivity: 'base' })
        })
        return (
          <div key={slot} className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <FormControl fullWidth size="small">
                <InputLabel id={`blade-${props.index}-${slot}`} shrink>{`${t('ui.blade')} ${slot + 1}`}</InputLabel>
                <Select
                  labelId={`blade-${props.index}-${slot}`}
                  label={`${t('ui.blade')} ${slot + 1}`}
                  value={selected ?? ''}
                  displayEmpty
                  notched
                  onChange={event => setBlade(slot, event.target.value || null)}
                  renderValue={value => {
                    if (!value)
                      return t('ui.empty')
                    return t(`blade.${value}`)
                  }}
                >
                  <MenuItem value="">{t('ui.empty')}</MenuItem>
                  {options.map(b => {
                    const offRole = !catalog.isOnRole(driverName, b.name)
                    const details = bladeSelectDetails(t, b, offRole)
                    return (
                      <MenuItem key={b.name} value={b.name} sx={{ whiteSpace: 'normal' }}>
                        <div className="flex min-w-0 flex-col py-0.5">
                          <span className="leading-tight">{t(`blade.${b.name}`)}</span>
                          <span className="text-xs leading-tight text-gray-500">{details}</span>
                        </div>
                      </MenuItem>
                    )
                  })}
                </Select>
              </FormControl>
              {selected && (
                <IconButton
                  size="small"
                  aria-label={t('ui.clear')}
                  onClick={() => setBlade(slot, null)}
                >
                  <Clear fontSize="small" />
                </IconButton>
              )}
            </div>
            {selected && (
              <BladeChips catalog={catalog} driver={state.driver} blade={selected} />
            )}
          </div>
        )
      })}
    </div>
  )
}

type Translate = (key: string) => string

function bladeSelectDetails(t: Translate, blade: BladeInfo, offRole: boolean): string {
  const parts = [
    t(`weapon.${blade.weaponName}`),
    ...blade.elements.map(el => t(`element.${el}`)),
  ]
  if (offRole)
    parts.push(t('ui.offRole'))
  return parts.join(' · ')
}

function FilterSelect(props: {
  id: string
  label: string
  value: string[]
  options: { value: string; label: string }[]
  onChange: (value: string[]) => void
}) {
  const { t } = useI18n()
  return (
    <FormControl fullWidth size="small">
      <InputLabel id={props.id} shrink>{props.label}</InputLabel>
      <Select
        multiple
        labelId={props.id}
        label={props.label}
        value={props.value}
        displayEmpty
        notched
        onChange={event => {
          const next = event.target.value
          props.onChange(typeof next === 'string' ? next.split(',') : next)
        }}
        renderValue={selected => {
          if (selected.length === 0)
            return t('ui.all')
          const labels = selected.map(value => props.options.find(opt => opt.value === value)?.label ?? value)
          return labels.join(' · ')
        }}
      >
        {props.options.map(opt => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

function BladeSummary(props: {
  catalog: Catalog
  driver: string
  blade: string
  slot: number
  locked: boolean
}) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-1">
      <TextField
        size="small"
        label={`${t('ui.blade')} ${props.slot + 1}`}
        value={t(`blade.${props.blade}`)}
        slotProps={{ input: { readOnly: true } }}
      />
      <BladeChips catalog={props.catalog} driver={props.driver} blade={props.blade} />
    </div>
  )
}

function BladeChips(props: { catalog: Catalog; driver: string; blade: string }) {
  const { t } = useI18n()
  const info = props.catalog.bladeByName.get(props.blade)
  const effects = props.catalog.effectsOf(props.driver, props.blade)
  const offRole = !props.catalog.isOnRole(props.driver, props.blade) && !props.catalog.isFixed(props.driver, props.blade)
  return (
    <div className="flex flex-wrap gap-1">
      {offRole && <Chip size="small" color="warning" label={t('ui.offRole')} />}
      {info && (
        <Chip size="small" color="secondary" variant="outlined" label={t(`weapon.${info.weaponName}`)} />
      )}
      {effects.map(eff => (
        <Chip key={eff} size="small" color="primary" variant="outlined" label={t(`effect.${eff}`)} />
      ))}
      {info?.elements.map(el => (
        <Chip key={el} size="small" variant="outlined" label={t(`element.${el}`)} />
      ))}
    </div>
  )
}
