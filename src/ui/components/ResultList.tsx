import { Card, CardContent, Chip, Typography } from "@mui/material"
import type { Catalog, TeamResult } from "../../types/common"
import { ANY_ELEMENT } from "../../types/common"
import { useI18n } from "../i18n/LanguageContext"

export default function ResultList(props: {
  catalog: Catalog
  results: TeamResult[]
  showPriority?: boolean
}) {
  const { t } = useI18n()
  if (props.results.length === 0) {
    return <Typography color="text.secondary">{t('ui.noResults')}</Typography>
  }
  return (
    <div className="flex flex-col gap-3">
      <Typography variant="body2" color="text.secondary">
        {t('ui.resultCount', { n: props.results.length })}
      </Typography>
      {props.results.map((team, i) => (
        <Card key={i} variant="outlined">
          <CardContent className="flex flex-col gap-3">
            <div className="grid gap-3 md:grid-cols-3">
              {team.members.map(member => (
                <div key={member.driver} className="flex flex-col gap-1">
                  <Typography variant="subtitle2">
                    {t(`driver.${member.driver}`)}
                  </Typography>
                  {member.blades.map((blade, slot) => {
                    const override = member.bladeElements[slot]
                    const elementLabel = !override
                      ? null
                      : override === ANY_ELEMENT
                        ? t('ui.anyElement')
                        : t(`element.${override}`)
                    const slots = props.catalog.bladeByName.get(blade)?.auxCoreSlots
                    const details = [
                      elementLabel,
                      slots !== undefined ? `${t('ui.auxCores')} ×${slots}` : null,
                    ].filter((part): part is string => !!part)
                    return (
                      <Typography key={`${blade}-${slot}`} variant="body2">
                        {t(`blade.${blade}`)}
                        {details.length > 0 ? ` · ${details.join(' · ')}` : ''}
                      </Typography>
                    )
                  })}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {props.showPriority && (
                <Chip
                  size="small"
                  color="secondary"
                  variant="outlined"
                  label={`${t('ui.priorityBlades')} ×${team.poolHits}`}
                />
              )}
              <Chip
                size="small"
                color="success"
                variant="outlined"
                label={`${t('ui.auxCores')} ×${team.auxCoreSlots}`}
              />
              {props.catalog.elements.map((el, idx) => (
                (team.elementMask & (1 << idx)) !== 0
                  ? <Chip key={el} size="small" variant="outlined" label={t(`element.${el}`)} />
                  : null
              ))}
              {props.catalog.effects.map((eff, idx) => (
                <Chip
                  key={eff}
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={`${t(`effect.${eff}`)} ×${team.effectCounts[idx] ?? 0}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
