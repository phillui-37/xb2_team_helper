import { Button, Checkbox, CircularProgress, FormControlLabel, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import { useI18n } from "../i18n/LanguageContext"
import MemberColumn from "../components/MemberColumn"
import ResultList from "../components/ResultList"
import PoolPage from "./PoolPage"
import type { AppSession } from "../state/useAppSession"

export default function TeamPage(props: { session: AppSession }) {
  const { t } = useI18n()
  const s = props.session
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <ToggleButtonGroup
          exclusive
          size="small"
          value={s.teamMode}
          onChange={(_event, value: AppSession["teamMode"] | null) => {
            if (value)
              s.changeTeamMode(value)
          }}
        >
          <ToggleButton value="assign">{t("ui.modeAssign")}</ToggleButton>
          <ToggleButton value="pool">{t("ui.modePool")}</ToggleButton>
        </ToggleButtonGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={s.advancedNewGame}
              onChange={event => s.updateAdvancedNewGame(event.target.checked)}
            />
          }
          label={t("ui.advancedNewGame")}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={s.redundancy}
              onChange={event => s.setRedundancy(event.target.checked)}
            />
          }
          label={t("ui.redundancy")}
        />
        <Button
          variant="contained"
          onClick={s.runCalculate}
          disabled={!s.canCalculate || s.calculating}
        >
          {t("ui.calculate")}
        </Button>
        {!s.canCalculate && (
          <Typography variant="body2" color="text.secondary">
            {s.teamMode === "pool" ? t("ui.selectPartyRoles") : t("ui.selectDrivers")}
          </Typography>
        )}
        {s.calculating && <CircularProgress size={22} />}
      </div>

      {s.teamMode === "assign" && (
        <div className="flex flex-col gap-3 md:flex-row">
          {s.members.map((member, index) => (
            <MemberColumn
              key={index}
              catalog={s.catalog}
              index={index}
              state={member}
              members={s.members}
              owners={s.owners}
              takenDrivers={s.takenDrivers}
              niaBladeTaken={s.niaBladeTaken}
              niaDriverTaken={s.niaDriverTaken}
              advancedNewGame={s.advancedNewGame}
              onChange={next => s.updateMember(index, next)}
            />
          ))}
        </div>
      )}

      {(s.teamMode === "assign" || s.calculating || s.results || s.calcError) && (
        <section className={`flex flex-col gap-2 ${s.teamMode === "pool" ? "max-h-[70vh] overflow-auto" : ""}`}>
          <Typography variant="h6">{t("ui.results")}</Typography>
          {s.calculating && <Typography color="text.secondary">{t("ui.loading")}</Typography>}
          {s.calcError && <Typography color="error">{s.calcError}</Typography>}
          {s.results && (
            <ResultList
              catalog={s.catalog}
              results={s.results}
              showPriority={s.teamMode === "pool"}
            />
          )}
        </section>
      )}

      {s.teamMode === "pool" && (
        <PoolPage
          catalog={s.catalog}
          pool={s.pool}
          advancedNewGame={s.advancedNewGame}
          allowTora={s.allowTora}
          roles={s.partyRoles}
          matchRole={s.poolSearch.matchRole}
          uniqueWeapon={s.poolSearch.uniqueWeapon}
          borrowBound={s.poolSearch.borrowBound}
          allowPoppiElementChange={s.poolSearch.allowPoppiElementChange}
          rexFixedAttacker={s.poolSearch.rexFixedAttacker}
          onChange={s.updatePool}
          onAllowToraChange={s.updateAllowTora}
          onRolesChange={s.updatePartyRoles}
          onMatchRoleChange={enabled => s.updatePoolSearch({ matchRole: enabled })}
          onUniqueWeaponChange={enabled => s.updatePoolSearch({ uniqueWeapon: enabled })}
          onBorrowBoundChange={enabled => s.updatePoolSearch({ borrowBound: enabled })}
          onAllowPoppiElementChange={enabled => s.updatePoolSearch({ allowPoppiElementChange: enabled })}
          onRexFixedAttackerChange={enabled => s.updatePoolSearch({ rexFixedAttacker: enabled })}
        />
      )}
    </>
  )
}
