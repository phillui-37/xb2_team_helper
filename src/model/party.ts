import type { Catalog } from "../types/common"
import { BLADE_SEIHAI, DRIVER_ORDER, DRIVER_REX, DRIVER_TORA } from "../types/common"
import { combinations } from "./combinatorics"

export const CORE_DRIVERS = DRIVER_ORDER.filter(name => name !== DRIVER_TORA)
export const PARTY_ROLE_OPTIONS = ['Attacker', 'Tank', 'Healer'] as const
export type PartyRole = typeof PARTY_ROLE_OPTIONS[number]
export type PartyRoles = [PartyRole, PartyRole, PartyRole]
export const DEFAULT_PARTY_ROLES: PartyRoles = ['Attacker', 'Tank', 'Healer']

const consumeRole = (needed: Map<string, number>, role: string): boolean => {
  const n = needed.get(role) ?? 0
  if (n <= 0)
    return false
  needed.set(role, n - 1)
  return true
}

const leftoverRoles = (needed: Map<string, number>): string[] => {
  const leftover: string[] = []
  for (const [role, count] of needed) {
    for (let i = 0; i < count; i++)
      leftover.push(role)
  }
  return leftover
}

/** Rex may stand in as Tank or Healer only to fill a role the other two drivers do not already cover. */
export const rexFillRole = (
  catalog: Catalog,
  drivers: readonly string[],
): PartyRole | null => {
  if (!drivers.includes(DRIVER_REX))
    return null
  const otherRoles = new Set(
    drivers
      .filter(driver => driver !== DRIVER_REX)
      .map(driver => catalog.driverByName.get(driver)?.role)
      .filter((role): role is string => !!role),
  )
  if (!otherRoles.has('Tank') && otherRoles.has('Healer'))
    return 'Tank'
  if (!otherRoles.has('Healer') && otherRoles.has('Tank'))
    return 'Healer'
  return null
}

/** Party leftover must match the Tank/Healer stand-in; otherwise Rex stays Attacker. */
export const rexAssignedFill = (
  catalog: Catalog,
  drivers: readonly string[],
  roles?: PartyRoles,
): PartyRole | null => {
  const fill = rexFillRole(catalog, drivers)
  if (!fill || !roles)
    return fill
  const needed = new Map<string, number>()
  for (const role of roles)
    needed.set(role, (needed.get(role) ?? 0) + 1)
  for (const driver of drivers.filter(name => name !== DRIVER_REX)) {
    const role = catalog.driverByName.get(driver)?.role ?? ''
    if (!consumeRole(needed, role))
      return null
  }
  const leftover = leftoverRoles(needed)
  return leftover.length === 1 && leftover[0] === fill ? fill : null
}

/** Aegis may stay on Rex; every other blade must use the fill role. */
export const rexBladeFitsFill = (
  catalog: Catalog,
  blade: string,
  fill: PartyRole | null,
): boolean => {
  if (!fill)
    return true
  if (blade === BLADE_SEIHAI)
    return true
  return catalog.bladeByName.get(blade)?.weaponRole === fill
}

/** Rex fill-in replaces his native Attacker match for candidate / steal filters. */
export const nativeRoleMatchApplies = (driver: string, fill: PartyRole | null): boolean =>
  !(driver === DRIVER_REX && !!fill)

export const bladeMatchesPartyRole = (
  catalog: Catalog,
  driver: string,
  blade: string,
  partyDrivers: readonly string[],
  roles?: PartyRoles,
): boolean => {
  const fill = driver === DRIVER_REX ? rexAssignedFill(catalog, partyDrivers, roles) : null
  if (fill)
    return rexBladeFitsFill(catalog, blade, fill)
  return catalog.isOnRole(driver, blade)
}

export const tripleMatchesRoles = (
  catalog: Catalog,
  triple: readonly string[],
  roles: PartyRoles,
): boolean => {
  const needed = new Map<string, number>()
  for (const role of roles)
    needed.set(role, (needed.get(role) ?? 0) + 1)

  const others = triple.filter(driver => driver !== DRIVER_REX)
  const hasRex = others.length !== triple.length
  for (const driver of others) {
    const role = catalog.driverByName.get(driver)?.role ?? ''
    if (!consumeRole(needed, role))
      return false
  }

  const leftover = leftoverRoles(needed)
  if (!hasRex)
    return leftover.length === 0
  if (leftover.length !== 1)
    return false
  const fill = leftover[0]
  if (fill === 'Attacker')
    return true
  if (fill !== 'Tank' && fill !== 'Healer')
    return false
  return rexFillRole(catalog, triple) === fill
}

export const driverTriples = (
  allowTora: boolean,
  availableDrivers?: ReadonlySet<string>,
  roleFilter?: { catalog: Catalog; roles: PartyRoles },
): string[][] => {
  const allowed = (name: string) => !availableDrivers || availableDrivers.has(name)
  const core: string[] = CORE_DRIVERS.filter(allowed)
  const triples: string[][] = combinations(core, 3)
  if (allowTora && allowed(DRIVER_TORA)) {
    for (const pair of combinations(core, 2))
      triples.push([...pair, DRIVER_TORA])
  }
  const sorted = triples.map(triple =>
    triple.slice().sort((a, b) => DRIVER_ORDER.indexOf(a as typeof DRIVER_ORDER[number])
      - DRIVER_ORDER.indexOf(b as typeof DRIVER_ORDER[number])),
  )
  if (!roleFilter)
    return sorted
  return sorted.filter(triple => tripleMatchesRoles(roleFilter.catalog, triple, roleFilter.roles))
}
