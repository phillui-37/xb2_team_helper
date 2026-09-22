import { useEffect, useMemo, useState } from "react"
import { CircularProgress, Tab, Tabs, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import { match, P } from "ts-pattern"
import { loadCatalogPromise } from "../../model/data/loadCatalog"
import { emptyMember, hasNiaBlade, hasNiaDriver } from "../../model/members"
import { driverTriples } from "../../model/party"
import { isPoolableBlade, readAllowTora, readAdvancedNewGame, readPartyRoles, readPool, storeAllowTora, storeAdvancedNewGame, storePartyRoles, storePool } from "../../model/pool"
import { solveFromPool } from "../../model/poolSolve"
import { readOwners, reconcileMembers, storeOwners } from "../../model/owners"
import { solve } from "../../model/solver"
import type { Catalog, Language, MemberState, TeamResult } from "../../types/common"
import { LANGUAGES, useI18n } from "../i18n/LanguageContext"
import AssignPage from "./AssignPage"
import TeamPage from "./TeamPage"
import WikiPage from "./wiki/WikiPage"

type MainTab = 'team' | 'assign' | 'wiki'
type TeamMode = 'assign' | 'pool'

export default function MainPage() {
  const [catalog, setCatalog] = useState<Catalog | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    loadCatalogPromise()
      .then(setCatalog)
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  return match({ error, catalog })
    .with({ error: P.string }, ({ error }) => (
      <div className="p-app text-red-700">{error}</div>
    ))
    .with({ catalog: P.nonNullable }, ({ catalog }) => (
      <AppShell catalog={catalog} />
    ))
    .otherwise(() => (
      <div className="flex min-h-dvh items-center justify-center p-app"><CircularProgress /></div>
    ))
}

function AppShell(props: { catalog: Catalog }) {
  const { catalog } = props
  const { t, lang, setLang } = useI18n()
  const [tab, setTab] = useState<MainTab>('team')
  const [teamMode, setTeamMode] = useState<TeamMode>('assign')
  const [owners, setOwners] = useState<Map<string, string>>(() => readOwners(catalog))
  const [pool, setPool] = useState<Set<string>>(() => readPool(catalog))
  const [allowTora, setAllowTora] = useState(readAllowTora)
  const [partyRoles, setPartyRoles] = useState(readPartyRoles)
  const [poolMatchRole, setPoolMatchRole] = useState(true)
  const [poolUniqueWeapon, setPoolUniqueWeapon] = useState(true)
  const [poolBorrowBound, setPoolBorrowBound] = useState(true)
  const [members, setMembers] = useState<MemberState[]>([emptyMember(), emptyMember(), emptyMember()])
  const [redundancy, setRedundancy] = useState(false)
  const [advancedNewGame, setAdvancedNewGame] = useState(readAdvancedNewGame)
  const [results, setResults] = useState<TeamResult[] | undefined>(undefined)
  const [calculating, setCalculating] = useState(false)

  const takenDrivers = useMemo(
    () => new Set(members.map(m => m.driver).filter((d): d is string => !!d)),
    [members],
  )
  const niaBladeTaken = hasNiaBlade(members)
  const niaDriverTaken = hasNiaDriver(members)
  const poolTriples = useMemo(
    () => driverTriples(
      allowTora,
      new Set(catalog.drivers.map(driver => driver.name)),
      { catalog, roles: partyRoles },
    ),
    [allowTora, catalog, partyRoles],
  )
  const canCalculate = teamMode === 'pool' ? poolTriples.length > 0 : members.every(m => m.driver)

  const updateMember = (index: number, next: MemberState) => {
    setMembers(ori => reconcileMembers(
      catalog,
      ori.map((m, i) => i === index ? next : m),
      owners,
      index,
    ))
    setResults(undefined)
  }

  const updateOwners = (next: Map<string, string>) => {
    storeOwners(next)
    setOwners(next)
    setMembers(ori => reconcileMembers(catalog, ori, next))
    setResults(undefined)
  }

  const updatePool = (next: Set<string>) => {
    storePool(next)
    setPool(next)
    setResults(undefined)
  }

  const updateAllowTora = (enabled: boolean) => {
    storeAllowTora(enabled)
    setAllowTora(enabled)
    setResults(undefined)
  }

  const updatePartyRoles = (roles: typeof partyRoles) => {
    storePartyRoles(roles)
    setPartyRoles(roles)
    setResults(undefined)
  }

  const updateAdvancedNewGame = (enabled: boolean) => {
    storeAdvancedNewGame(enabled)
    setAdvancedNewGame(enabled)
    if (!enabled) {
      setMembers(ori => reconcileMembers(
        catalog,
        ori.map(member => ({
          ...member,
          blades: member.blades.map(blade => {
            if (!blade)
              return blade
            return catalog.bladeByName.get(blade)?.advancedNewGame ? null : blade
          }) as MemberState['blades'],
        })),
        owners,
      ))
      setPool(ori => {
        const next = new Set([...ori].filter(name => {
          const blade = catalog.bladeByName.get(name)
          return !!blade && isPoolableBlade(catalog, blade, false)
        }))
        storePool(next)
        return next
      })
    }
    setResults(undefined)
  }

  const runCalculate = () => {
    if (!canCalculate)
      return
    setCalculating(true)
    setResults(undefined)
    window.setTimeout(() => {
      const found = teamMode === 'pool'
        ? solveFromPool(catalog, {
          pool,
          allowTora,
          redundancy,
          advancedNewGame,
          matchRole: poolMatchRole,
          uniqueWeapon: poolUniqueWeapon,
          borrowBound: poolBorrowBound,
          roles: partyRoles,
        })
        : solve(catalog, members, redundancy, owners, advancedNewGame)
      setResults(found)
      setCalculating(false)
    }, 0)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 p-app">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Typography variant="h5">{t('ui.title')}</Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={lang}
          onChange={(_event, value: Language | null) => {
            if (value)
              setLang(value)
          }}
        >
          {LANGUAGES.map(item => (
            <ToggleButton key={item.id} value={item.id}>{item.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </header>

      <Tabs
        value={tab}
        onChange={(_event, value: MainTab) => setTab(value)}
      >
        <Tab value="team" label={t('ui.tabTeam')} />
        <Tab value="assign" label={t('ui.tabAssign')} />
        <Tab value="wiki" label={t('ui.tabWiki')} />
      </Tabs>

      {match(tab)
        .with('team', () => (
          <TeamPage
            catalog={catalog}
            teamMode={teamMode}
            members={members}
            owners={owners}
            pool={pool}
            allowTora={allowTora}
            partyRoles={partyRoles}
            poolMatchRole={poolMatchRole}
            poolUniqueWeapon={poolUniqueWeapon}
            poolBorrowBound={poolBorrowBound}
            takenDrivers={takenDrivers}
            niaBladeTaken={niaBladeTaken}
            niaDriverTaken={niaDriverTaken}
            advancedNewGame={advancedNewGame}
            redundancy={redundancy}
            results={results}
            calculating={calculating}
            canCalculate={canCalculate}
            onTeamModeChange={value => {
              setTeamMode(value)
              setResults(undefined)
            }}
            onAdvancedNewGameChange={updateAdvancedNewGame}
            onRedundancyChange={enabled => {
              setRedundancy(enabled)
              setResults(undefined)
            }}
            onCalculate={runCalculate}
            onMemberChange={updateMember}
            onPoolChange={updatePool}
            onAllowToraChange={updateAllowTora}
            onRolesChange={updatePartyRoles}
            onMatchRoleChange={enabled => {
              setPoolMatchRole(enabled)
              setResults(undefined)
            }}
            onUniqueWeaponChange={enabled => {
              setPoolUniqueWeapon(enabled)
              setResults(undefined)
            }}
            onBorrowBoundChange={enabled => {
              setPoolBorrowBound(enabled)
              setResults(undefined)
            }}
          />
        ))
        .with('assign', () => (
          <AssignPage
            catalog={catalog}
            owners={owners}
            advancedNewGame={advancedNewGame}
            onAdvancedNewGameChange={updateAdvancedNewGame}
            onChange={updateOwners}
          />
        ))
        .with('wiki', () => (
          <WikiPage catalog={catalog} />
        ))
        .exhaustive()}
    </div>
  )
}
