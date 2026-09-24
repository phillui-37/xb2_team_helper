import type { Catalog, MemberState, TeamResult } from "../types/common"
import { ANY_ELEMENT, DRIVER_NIA, DRIVER_ORDER, DRIVER_TORA } from "../types/common"
import { memberDefaultsForDriver, prefillFixedBlades } from "./members"
import { DEFAULT_PARTY_ROLES, driverTriples, type PartyRoles } from "./party"
import { RESULT_CAP, compareTeamResults, createTeamCollector } from "./results"
import { solve } from "./solver"

export type PoolSolveOptions = {
  pool: ReadonlySet<string>
  allowTora: boolean
  redundancy: boolean
  advancedNewGame: boolean
  matchRole: boolean
  uniqueWeapon: boolean
  borrowBound: boolean
  allowPoppiElementChange: boolean
  rexFixedAttacker: boolean
  roles?: PartyRoles
}

const memberForDriver = (
  catalog: Catalog,
  driver: string,
  options: Pick<PoolSolveOptions, 'matchRole' | 'uniqueWeapon' | 'borrowBound' | 'allowPoppiElementChange'>,
): MemberState => {
  const member: MemberState = {
    driver,
    blades: prefillFixedBlades(catalog, driver),
    ...memberDefaultsForDriver(catalog, driver, {
      matchRole: options.matchRole,
      uniqueWeapon: options.uniqueWeapon,
      borrowBound: options.borrowBound,
    }),
  }
  if (driver !== DRIVER_TORA || !options.allowPoppiElementChange)
    return member
  return {
    ...member,
    allowElementChange: true,
    bladeElements: [ANY_ELEMENT, ANY_ELEMENT, ANY_ELEMENT],
  }
}

/** Bound pool blades go to a dedicated driver in the party. Rex only receives them when the owner is absent. */
const assignBoundPoolBlades = (
  catalog: Catalog,
  members: MemberState[],
  pool: ReadonlySet<string>,
): MemberState[] => {
  const triple = members.map(member => member.driver).filter((name): name is string => !!name)
  const claimed = new Set<string>()
  for (const member of members) {
    for (const blade of member.blades) {
      if (blade)
        claimed.add(blade)
    }
  }
  for (const name of pool) {
    if (claimed.has(name))
      continue
    if (catalog.bladeSource(name) !== 'BINDED')
      continue
    if (name === DRIVER_NIA && triple.includes(DRIVER_NIA))
      continue
    const dedicated = catalog.dedicatedDrivers(name).filter(driver => triple.includes(driver))
    if (dedicated.length === 0)
      continue
    const target = DRIVER_ORDER.find(driver =>
      dedicated.includes(driver) && !catalog.driverByName.get(driver)?.canUseForeign)
      ?? DRIVER_ORDER.find(driver => dedicated.includes(driver))
    if (!target || catalog.isBindsOnly(target))
      continue
    const member = members.find(item => item.driver === target)
    if (!member)
      continue
    const empty = member.blades.findIndex(blade => !blade)
    if (empty < 0)
      continue
    member.blades[empty] = name
    claimed.add(name)
  }
  return members
}

export function solveFromPool(
  catalog: Catalog,
  options: PoolSolveOptions,
): TeamResult[] {
  const roles = options.roles ?? DEFAULT_PARTY_ROLES
  const availableDrivers = new Set(catalog.drivers.map(d => d.name))
  const triples = driverTriples(options.allowTora, availableDrivers, {
    catalog,
    roles,
    rexFixedAttacker: options.rexFixedAttacker,
  })
  const prepared = triples.map(triple =>
    assignBoundPoolBlades(
      catalog,
      triple.map(driver => memberForDriver(catalog, driver, options)),
      options.pool,
    ),
  )
  const quota = Math.max(1, Math.floor(RESULT_CAP / Math.max(1, prepared.length)))
  const buckets = prepared.map(members =>
    solve(catalog, members, options.redundancy, new Map(), options.advancedNewGame, options.pool, roles),
  )
  const { results, take } = createTeamCollector()
  for (const bucket of buckets)
    for (const team of bucket.slice(0, quota))
      take(team)
  if (results.length < RESULT_CAP) {
    for (let i = 0; i < prepared.length; i++) {
      if (results.length >= RESULT_CAP)
        break
      const already = Math.min(quota, buckets[i]!.length)
      if (buckets[i]!.length < quota)
        continue
      for (const team of buckets[i]!.slice(already))
        take(team)
    }
  }
  results.sort(compareTeamResults)
  return results
}
