import { useMemo, useState } from "react"
import { Button, Checkbox, Chip, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material"
import type { Catalog } from "../../types/common"
import { isPoolableBlade } from "../../model/pool"
import { PARTY_ROLE_OPTIONS, type PartyRole, type PartyRoles } from "../../model/party"
import { useI18n } from "../i18n/LanguageContext"
import { useBladeNameList } from "../misc/useBladeNameList"
import BladeListCard from "../components/BladeListCard"

export default function PoolPage(props: {
  catalog: Catalog
  pool: Set<string>
  advancedNewGame: boolean
  allowTora: boolean
  roles: PartyRoles
  matchRole: boolean
  uniqueWeapon: boolean
  borrowBound: boolean
  onChange: (pool: Set<string>) => void
  onAllowToraChange: (enabled: boolean) => void
  onRolesChange: (roles: PartyRoles) => void
  onMatchRoleChange: (enabled: boolean) => void
  onUniqueWeaponChange: (enabled: boolean) => void
  onBorrowBoundChange: (enabled: boolean) => void
}) {
  const { t } = useI18n()
  const { catalog } = props
  const [query, setQuery] = useState("")
  const visible = useMemo(
    () => catalog.blades.filter(blade => isPoolableBlade(catalog, blade, props.advancedNewGame)),
    [catalog, props.advancedNewGame],
  )
  const blades = useBladeNameList(visible, query)

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
      <Typography variant="body2" color="text.secondary">{t("ui.poolHint")}</Typography>
      <div className="flex flex-col gap-2">
        <Typography variant="subtitle2">{t("ui.partyRoles")}</Typography>
        <Typography variant="body2" color="text.secondary">{t("ui.partyRolesHint")}</Typography>
        <div className="grid gap-2 sm:grid-cols-3">
          {props.roles.map((role, index) => (
            <FormControl key={index} size="small" fullWidth>
              <InputLabel id={`party-role-${index}`} shrink>{`${t("ui.roleMatch")} ${index + 1}`}</InputLabel>
              <Select
                labelId={`party-role-${index}`}
                label={`${t("ui.roleMatch")} ${index + 1}`}
                value={role}
                notched
                onChange={event => {
                  const next: PartyRoles = [props.roles[0], props.roles[1], props.roles[2]]
                  next[index] = event.target.value as PartyRole
                  props.onRolesChange(next)
                }}
              >
                {PARTY_ROLE_OPTIONS.map(option => (
                  <MenuItem key={option} value={option}>{t(`role.${option}`)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <FormControlLabel
          control={
            <Checkbox
              checked={props.allowTora}
              onChange={event => props.onAllowToraChange(event.target.checked)}
            />
          }
          label={t("ui.allowTora")}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={props.matchRole}
              onChange={event => props.onMatchRoleChange(event.target.checked)}
            />
          }
          label={t("ui.matchRole")}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={props.uniqueWeapon}
              onChange={event => props.onUniqueWeaponChange(event.target.checked)}
            />
          }
          label={t("ui.uniqueWeapon")}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={props.borrowBound}
              onChange={event => props.onBorrowBoundChange(event.target.checked)}
            />
          }
          label={t("ui.borrowBound")}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <TextField
          size="small"
          className="min-w-56 flex-1"
          label={t("ui.searchBlade")}
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <Button size="small" onClick={selectVisible}>{t("ui.poolSelectVisible")}</Button>
        <Button size="small" onClick={clearVisible}>{t("ui.poolClearVisible")}</Button>
        <Typography variant="body2" color="text.secondary">
          {t("ui.poolCount", { n: props.pool.size })}
        </Typography>
      </div>
      <div className="flex flex-col gap-2">
        {blades.map(blade => (
          <BladeListCard
            key={blade.name}
            catalog={catalog}
            blade={blade}
            extraChips={
              <>
                <Chip size="small" variant="outlined" label={t(`role.${blade.weaponRole}`)} />
                {catalog.dedicatedDrivers(blade.name).map(driver => (
                  <Chip
                    key={driver}
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={`${t("ui.dedicated")}: ${t(`driver.${driver}`)}`}
                  />
                ))}
              </>
            }
            selectable={{
              checked: props.pool.has(blade.name),
              onChange: checked => setInPool(blade.name, checked),
            }}
          />
        ))}
      </div>
    </div>
  )
}
