import { useMemo, useState } from "react"
import { Chip, TextField, Typography } from "@mui/material"
import type { Catalog } from "../../../types/common"
import { fuzzyMatch } from "../../misc/search"
import { useI18n } from "../../i18n/LanguageContext"
import WikiAutocomplete from "./WikiAutocomplete"

export default function ElementChainSection(props: { catalog: Catalog }) {
  const { t } = useI18n()
  const { catalog } = props
  const [start, setStart] = useState<string | null>(null)
  const [end, setEnd] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const chains = useMemo(() => catalog.elementChains.filter(chain => {
    if (start && chain[0] !== start)
      return false
    if (end && chain[2] !== end)
      return false
    return fuzzyMatch(query, chain.map(el => `element.${el}`))
  }), [catalog, start, end, query])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <WikiAutocomplete
          label={t('ui.filterStartElement')}
          value={start}
          options={catalog.elements}
          optionKey={name => `element.${name}`}
          onChange={setStart}
        />
        <WikiAutocomplete
          label={t('ui.filterEndElement')}
          value={end}
          options={catalog.elements}
          optionKey={name => `element.${name}`}
          onChange={setEnd}
        />
        <TextField
          size="small"
          label={t('ui.searchWiki')}
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </div>
      {chains.length === 0 ? (
        <Typography color="text.secondary">{t('ui.wikiNoMatches')}</Typography>
      ) : (
        <div className="flex flex-col gap-2">
          {chains.map(chain => (
            <div key={chain.join('-')} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 p-3">
              {chain.map((el, index) => (
                <div key={`${el}-${index}`} className="flex items-center gap-2">
                  {index > 0 && <Typography color="text.secondary">→</Typography>}
                  <Chip size="small" variant="outlined" label={t(`element.${el}`)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
