import { useMemo, useState } from "react"
import { Chip, TextField, Typography } from "@mui/material"
import type { Catalog } from "../../../types/common"
import { fuzzyMatch } from "../../misc/search"
import { useI18n } from "../../i18n/LanguageContext"
import WikiAutocomplete from "./WikiAutocomplete"

export default function WeaponEffectsSection(props: { catalog: Catalog }) {
  const { t } = useI18n()
  const { catalog } = props
  const [driver, setDriver] = useState<string | null>(null)
  const [weapon, setWeapon] = useState<string | null>(null)
  const [effect, setEffect] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const drivers = useMemo(
    () => driver ? catalog.drivers.filter(d => d.name === driver) : catalog.drivers,
    [catalog, driver],
  )
  const weapons = useMemo(
    () => weapon ? catalog.weapons.filter(w => w.name === weapon) : catalog.weapons,
    [catalog, weapon],
  )

  const visible = useMemo(() => {
    const cells = drivers.flatMap(d => weapons.map(w => {
      const effects = catalog.effectsByDriverWeapon.get(`${d.name}|${w.name}`) ?? []
      return { driver: d.name, weapon: w.name, effects }
    })).filter(cell => {
      if (effect && !cell.effects.includes(effect))
        return false
      return fuzzyMatch(query, [
        `driver.${cell.driver}`,
        `weapon.${cell.weapon}`,
        ...cell.effects.map(eff => `effect.${eff}`),
      ])
    })
    const driverNames = [...new Set(cells.map(c => c.driver))]
    const weaponNames = [...new Set(cells.map(c => c.weapon))]
    const cellMap = new Map(cells.map(c => [`${c.driver}|${c.weapon}`, c.effects]))
    return { driverNames, weaponNames, cellMap }
  }, [catalog, drivers, weapons, effect, query])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-4">
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
                {visible.weaponNames.map(name => (
                  <th key={name} className="border border-gray-200 bg-gray-50 p-2 text-left whitespace-nowrap">
                    {t(`weapon.${name}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.driverNames.map(driverName => (
                <tr key={driverName}>
                  <td className="border border-gray-200 p-2 font-medium whitespace-nowrap">{t(`driver.${driverName}`)}</td>
                  {visible.weaponNames.map(weaponName => {
                    const effects = visible.cellMap.get(`${driverName}|${weaponName}`) ?? []
                    return (
                      <td key={weaponName} className="border border-gray-200 p-2 align-top">
                        <div className="flex flex-wrap gap-1">
                          {effects.map(eff => (
                            <Chip key={eff} size="small" color="primary" variant="outlined" label={t(`effect.${eff}`)} />
                          ))}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
