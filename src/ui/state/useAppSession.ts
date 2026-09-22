import { useMemo, useRef, useState } from "react"
import type { Catalog, MemberState, TeamResult } from "../../types/common"
import { emptyMember, hasNiaBlade, hasNiaDriver } from "../../model/members"
import { driverTriples, type PartyRoles } from "../../model/party"
import {
  isPoolableBlade,
  readAllowTora,
  readAdvancedNewGame,
  readPartyRoles,
  readPool,
  readPoolSearch,
  storeAllowTora,
  storeAdvancedNewGame,
  storePartyRoles,
  storePool,
  storePoolSearch,
  type PoolSearchOptions,
} from "../../model/pool"
import { readOwners, reconcileMembers, storeOwners } from "../../model/owners"
import { solveAsync } from "../../model/solveClient"

export type MainTab = "team" | "assign" | "wiki"
export type TeamMode = "assign" | "pool"

export function useAppSession(catalog: Catalog) {
  const [tab, setTab] = useState<MainTab>("team")
  const [teamMode, setTeamMode] = useState<TeamMode>("assign")
  const [owners, setOwners] = useState<Map<string, string>>(() => readOwners(catalog))
  const [pool, setPool] = useState<Set<string>>(() => readPool(catalog))
  const [allowTora, setAllowTora] = useState(readAllowTora)
  const [partyRoles, setPartyRoles] = useState(readPartyRoles)
  const [poolSearch, setPoolSearch] = useState(readPoolSearch)
  const [members, setMembers] = useState<MemberState[]>([emptyMember(), emptyMember(), emptyMember()])
  const [redundancy, setRedundancy] = useState(false)
  const [advancedNewGame, setAdvancedNewGame] = useState(readAdvancedNewGame)
  const [results, setResults] = useState<TeamResult[] | undefined>(undefined)
  const [calculating, setCalculating] = useState(false)
  const [calcError, setCalcError] = useState<string | undefined>(undefined)
  const requestGen = useRef(0)

  const clearResults = () => {
    requestGen.current += 1
    setResults(undefined)
    setCalculating(false)
    setCalcError(undefined)
  }

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
  const canCalculate = teamMode === "pool" ? poolTriples.length > 0 : members.every(m => m.driver)

  const updateMember = (index: number, next: MemberState) => {
    setMembers(ori => reconcileMembers(
      catalog,
      ori.map((m, i) => i === index ? next : m),
      owners,
      index,
    ))
    clearResults()
  }

  const updateOwners = (next: Map<string, string>) => {
    storeOwners(next)
    setOwners(next)
    setMembers(ori => reconcileMembers(catalog, ori, next))
    clearResults()
  }

  const updatePool = (next: Set<string>) => {
    storePool(next)
    setPool(next)
    clearResults()
  }

  const updateAllowTora = (enabled: boolean) => {
    storeAllowTora(enabled)
    setAllowTora(enabled)
    clearResults()
  }

  const updatePartyRoles = (roles: PartyRoles) => {
    storePartyRoles(roles)
    setPartyRoles(roles)
    clearResults()
  }

  const updatePoolSearch = (patch: Partial<PoolSearchOptions>) => {
    setPoolSearch(ori => {
      const next = { ...ori, ...patch }
      storePoolSearch(next)
      return next
    })
    clearResults()
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
          }) as MemberState["blades"],
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
    clearResults()
  }

  const changeTeamMode = (mode: TeamMode) => {
    if (mode === teamMode)
      return
    setTeamMode(mode)
    clearResults()
  }

  const runCalculate = () => {
    if (!canCalculate)
      return
    const gen = ++requestGen.current
    setCalculating(true)
    setResults(undefined)
    setCalcError(undefined)
    const job = teamMode === "pool"
      ? {
        kind: "pool" as const,
        pool: [...pool],
        allowTora,
        redundancy,
        advancedNewGame,
        matchRole: poolSearch.matchRole,
        uniqueWeapon: poolSearch.uniqueWeapon,
        borrowBound: poolSearch.borrowBound,
        roles: partyRoles,
      }
      : {
        kind: "assign" as const,
        members,
        redundancy,
        owners: [...owners.entries()] as [string, string][],
        advancedNewGame,
      }
    void solveAsync(catalog, job).then(
      found => {
        if (gen !== requestGen.current)
          return
        setResults(found)
        setCalculating(false)
      },
      err => {
        if (gen !== requestGen.current)
          return
        setCalcError(err instanceof Error ? err.message : String(err))
        setCalculating(false)
      },
    )
  }

  return {
    catalog,
    tab,
    setTab,
    teamMode,
    changeTeamMode,
    members,
    updateMember,
    owners,
    updateOwners,
    pool,
    updatePool,
    allowTora,
    updateAllowTora,
    partyRoles,
    updatePartyRoles,
    poolSearch,
    updatePoolSearch,
    takenDrivers,
    niaBladeTaken,
    niaDriverTaken,
    advancedNewGame,
    updateAdvancedNewGame,
    redundancy,
    setRedundancy: (enabled: boolean) => {
      setRedundancy(enabled)
      clearResults()
    },
    results,
    calculating,
    calcError,
    canCalculate,
    runCalculate,
  }
}

export type AppSession = ReturnType<typeof useAppSession>
