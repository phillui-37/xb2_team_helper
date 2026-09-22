import { Button, Checkbox, CircularProgress, FormControlLabel, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import type { Catalog, MemberState, TeamResult } from "../../types/common"
import type { PartyRoles } from "../../model/party"
import { useI18n } from "../i18n/LanguageContext"
import MemberColumn from "../components/MemberColumn"
import ResultList from "../components/ResultList"
import PoolPage from "./PoolPage"

type TeamMode = 'assign' | 'pool'

export default function TeamPage(props: {
  catalog: Catalog
  teamMode: TeamMode
  members: MemberState[]
  owners: Map<string, string>
  pool: Set<string>
  allowTora: boolean
  partyRoles: PartyRoles
  poolMatchRole: boolean
  poolUniqueWeapon: boolean
  poolBorrowBound: boolean
  takenDrivers: Set<string>
  niaBladeTaken: boolean
  niaDriverTaken: boolean
  advancedNewGame: boolean
  redundancy: boolean
  results: TeamResult[] | undefined
  calculating: boolean
  canCalculate: boolean
  onTeamModeChange: (mode: TeamMode) => void
  onAdvancedNewGameChange: (enabled: boolean) => void
  onRedundancyChange: (enabled: boolean) => void
  onCalculate: () => void
  onMemberChange: (index: number, next: MemberState) => void
  onPoolChange: (pool: Set<string>) => void
  onAllowToraChange: (enabled: boolean) => void
  onRolesChange: (roles: PartyRoles) => void
  onMatchRoleChange: (enabled: boolean) => void
  onUniqueWeaponChange: (enabled: boolean) => void
  onBorrowBoundChange: (enabled: boolean) => void
}) {
  const { t } = useI18n()
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <ToggleButtonGroup
          exclusive
          size="small"
          value={props.teamMode}
          onChange={(_event, value: TeamMode | null) => {
            if (!value || value === props.teamMode)
              return
            props.onTeamModeChange(value)
          }}
        >
          <ToggleButton value="assign">{t('ui.modeAssign')}</ToggleButton>
          <ToggleButton value="pool">{t('ui.modePool')}</ToggleButton>
        </ToggleButtonGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={props.advancedNewGame}
              onChange={event => props.onAdvancedNewGameChange(event.target.checked)}
            />
          }
          label={t('ui.advancedNewGame')}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={props.redundancy}
              onChange={event => props.onRedundancyChange(event.target.checked)}
            />
          }
          label={t('ui.redundancy')}
        />
        <Button
          variant="contained"
          onClick={props.onCalculate}
          disabled={!props.canCalculate || props.calculating}
        >
          {t('ui.calculate')}
        </Button>
        {!props.canCalculate && (
          <Typography variant="body2" color="text.secondary">
            {props.teamMode === 'pool' ? t('ui.selectPartyRoles') : t('ui.selectDrivers')}
          </Typography>
        )}
        {props.calculating && <CircularProgress size={22} />}
      </div>

      {props.teamMode === 'assign' && (
        <div className="flex flex-col gap-3 md:flex-row">
          {props.members.map((member, index) => (
            <MemberColumn
              key={index}
              catalog={props.catalog}
              index={index}
              state={member}
              members={props.members}
              owners={props.owners}
              takenDrivers={props.takenDrivers}
              niaBladeTaken={props.niaBladeTaken}
              niaDriverTaken={props.niaDriverTaken}
              advancedNewGame={props.advancedNewGame}
              onChange={next => props.onMemberChange(index, next)}
            />
          ))}
        </div>
      )}

      {(props.teamMode === 'assign' || props.calculating || props.results) && (
        <section className={`flex flex-col gap-2 ${props.teamMode === 'pool' ? 'max-h-[70vh] overflow-auto' : ''}`}>
          <Typography variant="h6">{t('ui.results')}</Typography>
          {props.calculating && <Typography color="text.secondary">{t('ui.loading')}</Typography>}
          {props.results && (
            <ResultList
              catalog={props.catalog}
              results={props.results}
              showPriority={props.teamMode === 'pool'}
            />
          )}
        </section>
      )}

      {props.teamMode === 'pool' && (
        <PoolPage
          catalog={props.catalog}
          pool={props.pool}
          advancedNewGame={props.advancedNewGame}
          allowTora={props.allowTora}
          roles={props.partyRoles}
          matchRole={props.poolMatchRole}
          uniqueWeapon={props.poolUniqueWeapon}
          borrowBound={props.poolBorrowBound}
          onChange={props.onPoolChange}
          onAllowToraChange={props.onAllowToraChange}
          onRolesChange={props.onRolesChange}
          onMatchRoleChange={props.onMatchRoleChange}
          onUniqueWeaponChange={props.onUniqueWeaponChange}
          onBorrowBoundChange={props.onBorrowBoundChange}
        />
      )}
    </>
  )
}
