import { useMemo, useState } from "react"
import { Chip, TextField, Typography } from "@mui/material"
import type { Catalog, CharacterGift } from "../../../types/common"
import { fuzzyMatch } from "../../misc/search"
import { useI18n } from "../../i18n/LanguageContext"
import WikiAutocomplete from "./WikiAutocomplete"

function giftLabelKeys(gift: CharacterGift): string[] {
  const keys = [
    `${gift.ownerType}.${gift.ownerName}`,
    ...gift.categories.map(name => `pouch.category.${name}`),
    ...gift.items.map(item => `pouch.item.${item.name}`),
    ...gift.buffKeys.map(key => `pouch.buff.${key}`),
  ]
  if (gift.persona)
    keys.push(`persona.${gift.persona}`)
  return keys
}

export default function BladeGiftsSection(props: { catalog: Catalog }) {
  const { t } = useI18n()
  const { catalog } = props
  const [blade, setBlade] = useState<string | null>(null)
  const [driver, setDriver] = useState<string | null>(null)
  const [buff, setBuff] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const gifts = useMemo(() => catalog.characterGifts.filter(gift => {
    const ownerSelected = blade || driver
    if (ownerSelected) {
      const bladeOk = blade && gift.ownerType === 'blade' && gift.ownerName === blade
      const driverOk = driver && gift.ownerType === 'driver' && gift.ownerName === driver
      if (!bladeOk && !driverOk)
        return false
    }
    if (buff && !gift.buffKeys.includes(buff))
      return false
    return fuzzyMatch(query, giftLabelKeys(gift))
  }).sort((a, b) => {
    if (a.ownerType !== b.ownerType)
      return a.ownerType === 'driver' ? -1 : 1
    const nameA = t(`${a.ownerType}.${a.ownerName}`)
    const nameB = t(`${b.ownerType}.${b.ownerName}`)
    const byName = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })
    if (byName !== 0)
      return byName
    return (a.persona ?? '').localeCompare(b.persona ?? '')
  }), [catalog, blade, driver, buff, query, t])

  return (
    <div className="flex flex-col gap-4">
      <Typography variant="body2" color="text.secondary">{t('ui.favoriteBonus')}</Typography>
      <div className="grid gap-2 md:grid-cols-2">
        {catalog.pouchBuffs.map(item => (
          <div key={item.key} className="rounded-lg border border-gray-200 p-3">
            <Typography variant="subtitle2">{t(`pouch.buff.${item.key}`)}</Typography>
            <Typography variant="body2" color="text.secondary">{t(`pouch.buffDesc.${item.key}`)}</Typography>
            <div className="mt-1 flex flex-wrap gap-1">
              {item.categoryNames.map(name => (
                <Chip key={name} size="small" variant="outlined" label={t(`pouch.category.${name}`)} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <WikiAutocomplete
          label={t('ui.blade')}
          value={blade}
          options={catalog.blades.map(item => item.name)}
          optionKey={name => `blade.${name}`}
          onChange={setBlade}
        />
        <WikiAutocomplete
          label={t('ui.driver')}
          value={driver}
          options={catalog.drivers.map(item => item.name)}
          optionKey={name => `driver.${name}`}
          onChange={setDriver}
        />
        <WikiAutocomplete
          label={t('ui.pouchBuff')}
          value={buff}
          options={catalog.pouchBuffs.map(item => item.key)}
          optionKey={name => `pouch.buff.${name}`}
          onChange={setBuff}
        />
        <TextField
          size="small"
          label={t('ui.searchWiki')}
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </div>
      {gifts.length === 0 ? (
        <Typography color="text.secondary">{t('ui.wikiNoMatches')}</Typography>
      ) : (
        <div className="flex flex-col gap-2">
          {gifts.map(gift => (
            <div key={gift.id} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Typography variant="subtitle2">
                  {t(`${gift.ownerType}.${gift.ownerName}`)}
                  {gift.persona ? ` (${t(`persona.${gift.persona}`)})` : ''}
                </Typography>
                <Chip
                  size="small"
                  label={t(gift.ownerType === 'driver' ? 'ui.ownerTypeDriver' : 'ui.ownerTypeBlade')}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {gift.categories.map(name => {
                  const category = catalog.pouchCategories.find(c => c.name === name)
                  return (
                    <Chip
                      key={name}
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`${t(`pouch.category.${name}`)} · ${t(`pouch.buff.${category?.buffKey ?? ''}`)}`}
                    />
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-1">
                {gift.items.map(item => (
                  <Chip
                    key={item.name}
                    size="small"
                    variant="outlined"
                    label={`${t(`pouch.item.${item.name}`)} (${t(`pouch.category.${item.category}`)})`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
