import { useMemo, useState } from "react"
import { Chip, TextField, Typography } from "@mui/material"
import type { Catalog } from "../../../types/common"
import { fuzzyMatch } from "../../misc/search"
import { useI18n } from "../../i18n/LanguageContext"
import WikiAutocomplete from "./WikiAutocomplete"

const ROLE_MATCH_OPTIONS = ['on', 'off'] as const
type RoleMatch = typeof ROLE_MATCH_OPTIONS[number]

export default function WeaponEffectsSection(props: { catalog: Catalog }) {
  const { t } = useI18n()
  const { catalog } = props
  const [driver, setDriver] = useState<string | null>(null)
  const [weapon, setWeapon] = useState<string | null>(null)
  const [effect, setEffect] = useState<string | null>(null)
  const [roleMatch, setRoleMatch] = useState<RoleMatch | null>(null)
  const [query, setQuery] = useState('')

  const drivers = useMemo(
    () => driver ? catalog.drivers.filter(d => d.name === driver) : catalog.drivers,
    [catalog, driver],
  )
  const weapons = useMemo(
    () => weapon ? catalog.weapons.filter(w => w.name === weapon) : catalog.weapons,
    [catalog, weapon],
  )
  const weaponByName = useMemo(
    () => new Map(catalog.weapons.map(w => [w.name, w])),
    [catalog],
  )

  const visible = useMemo(() => {
    const cells = drivers.flatMap(d => weapons.map(w => {
      const effects = catalog.effectsByDriverWeapon.get(`${d.name}|${w.name}`) ?? []
      const onRole = d.role === w.role
      return { driver: d.name, driverRole: d.role, weapon: w.name, weaponRole: w.role, effects, onRole }
    })).filter(cell => {
      if (effect && !cell.effects.includes(effect))
        return false
      if (roleMatch === 'on' && !cell.onRole)
        return false
      if (roleMatch === 'off' && cell.onRole)
        return false
      return fuzzyMatch(query, [
        `driver.${cell.driver}`,
        `weapon.${cell.weapon}`,
        `role.${cell.driverRole}`,
        `role.${cell.weaponRole}`,
        ...cell.effects.map(eff => `effect.${eff}`),
        cell.onRole ? 'ui.onRole' : 'ui.offRole',
      ])
    })
    const driverNames = [...new Set(cells.map(c => c.driver))]
    const weaponNames = [...new Set(cells.map(c => c.weapon))]
    const cellMap = new Map(cells.map(c => [`${c.driver}|${c.weapon}`, c]))
    return { driverNames, weaponNames, cellMap }
  }, [catalog, drivers, weapons, effect, roleMatch, query])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <WikiAutocomplete
          label={t('ui.driver')}
          value={driver}
          options={catalog.drivers.map(d => d.name)}
          optionKey={name => `driver.${name}`}
          onChange={setDriver}
        />
        <WikiAutocomplete
          label={t('ui.weapon')}
          value={weapon}
          options={catalog.weapons.map(w => w.name)}
          optionKey={name => `weapon.${name}`}
          onChange={setWeapon}
        />
        <WikiAutocomplete
          label={t('ui.effects')}
          value={effect}
          options={catalog.effects}
          optionKey={name => `effect.${name}`}
          onChange={setEffect}
        />
        <WikiAutocomplete
          label={t('ui.roleMatch')}
          value={roleMatch}
          options={[...ROLE_MATCH_OPTIONS]}
          optionKey={name => name === 'on' ? 'ui.onRole' : 'ui.offRole'}
          onChange={setRoleMatch}
        />
        <TextField
          size="small"
          label={t('ui.searchWiki')}
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </div>
      {visible.driverNames.length === 0 ? (
        <Typography color="text.secondary">{t('ui.wikiNoMatches')}</Typography>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 bg-gray-50 p-2 text-left">{t('ui.driver')}</th>
                {visible.weaponNames.map(name => {
                  const weaponRole = weaponByName.get(name)?.role
                  return (
                    <th key={name} className="border border-gray-200 bg-gray-50 p-2 text-left whitespace-nowrap">
                      <div>{t(`weapon.${name}`)}</div>
                      {weaponRole && (
                        <div className="text-xs font-normal text-gray-500">{t(`role.${weaponRole}`)}</div>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {visible.driverNames.map(driverName => {
                const driverRole = catalog.driverByName.get(driverName)?.role
                return (
                  <tr key={driverName}>
                    <td className="border border-gray-200 p-2 font-medium whitespace-nowrap">
                      <div>{t(`driver.${driverName}`)}</div>
                      {driverRole && (
                        <div className="text-xs font-normal text-gray-500">{t(`role.${driverRole}`)}</div>
                      )}
                    </td>
                    {visible.weaponNames.map(weaponName => {
                      const cell = visible.cellMap.get(`${driverName}|${weaponName}`)
                      if (!cell) {
                        return <td key={weaponName} className="border border-gray-200 p-2" />
                      }
                      return (
                        <td
                          key={weaponName}
                          className={`border border-gray-200 p-2 align-top ${cell.onRole ? 'bg-sky-50' : 'bg-amber-50'}`}
                        >
                          <div className="flex flex-wrap gap-1">
                            <Chip
                              size="small"
                              color={cell.onRole ? 'primary' : 'warning'}
                              variant={cell.onRole ? 'filled' : 'outlined'}
                              label={t(cell.onRole ? 'ui.onRole' : 'ui.offRole')}
                            />
                            {cell.effects.map(eff => (
                              <Chip key={eff} size="small" color="primary" variant="outlined" label={t(`effect.${eff}`)} />
                            ))}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
