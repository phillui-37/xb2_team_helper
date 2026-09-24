import type { BladeInfo, Catalog } from "../types/common"
import type { PartyRole, PartyRoles } from "./party"
import { DEFAULT_PARTY_ROLES, PARTY_ROLE_OPTIONS } from "./party"
import { readFlag, readJson, writeFlag, writeJson } from "./storage"

export const POPPI_BLADES = ['hana js', 'hana jk', 'hana jd'] as const

const POOL_STORAGE_KEY = 'xb2-blade-pool'
const ALLOW_TORA_STORAGE_KEY = 'xb2-allow-tora'
const PARTY_ROLES_STORAGE_KEY = 'xb2-party-roles'
export const ANG_STORAGE_KEY = 'xb2-advanced-new-game'

const isPoppi = (name: string): boolean =>
  POPPI_BLADES.some(poppi => poppi === name)

export const isPoolableBlade = (
  catalog: Catalog,
  blade: BladeInfo,
  advancedNewGame: boolean,
): boolean => {
  if (blade.advancedNewGame && !advancedNewGame)
    return false
  if (isPoppi(blade.name))
    return false
  if (catalog.bladeSource(blade.name) === 'FIXED')
    return false
  return true
}

export const readPool = (catalog: Catalog): Set<string> =>
  new Set(readJson(POOL_STORAGE_KEY, raw => {
    if (!Array.isArray(raw))
      return []
    return raw.filter((name): name is string =>
      typeof name === 'string' && catalog.bladeByName.has(name) && !isPoppi(name))
  }, [] as string[]))

export const storePool = (pool: ReadonlySet<string>): void => {
  writeJson(POOL_STORAGE_KEY, [...pool])
}

export const readAllowTora = (): boolean => readFlag(ALLOW_TORA_STORAGE_KEY)

export const storeAllowTora = (value: boolean): void => {
  writeFlag(ALLOW_TORA_STORAGE_KEY, value)
}

const isPartyRole = (value: unknown): value is PartyRole =>
  PARTY_ROLE_OPTIONS.some(role => role === value)

export const readPartyRoles = (): PartyRoles =>
  readJson(PARTY_ROLES_STORAGE_KEY, raw => {
    if (!Array.isArray(raw))
      return undefined
    const first = raw[0]
    const second = raw[1]
    const third = raw[2]
    if (!isPartyRole(first) || !isPartyRole(second) || !isPartyRole(third))
      return undefined
    return [first, second, third]
  }, DEFAULT_PARTY_ROLES)

export const storePartyRoles = (roles: PartyRoles): void => {
  writeJson(PARTY_ROLES_STORAGE_KEY, roles)
}

export const readAdvancedNewGame = (): boolean => readFlag(ANG_STORAGE_KEY)

export const storeAdvancedNewGame = (value: boolean): void => {
  writeFlag(ANG_STORAGE_KEY, value)
}

const POOL_SEARCH_STORAGE_KEY = 'xb2-pool-search'

export type PoolSearchOptions = {
  matchRole: boolean
  uniqueWeapon: boolean
  borrowBound: boolean
  allowPoppiElementChange: boolean
  rexFixedAttacker: boolean
}

const DEFAULT_POOL_SEARCH: PoolSearchOptions = {
  matchRole: true,
  uniqueWeapon: true,
  borrowBound: true,
  allowPoppiElementChange: true,
  rexFixedAttacker: false,
}

const readOptionalFlag = (
  record: Record<string, unknown>,
  key: keyof PoolSearchOptions,
  fallback: boolean,
): boolean =>
  typeof record[key] === 'boolean' ? record[key] : fallback

export const readPoolSearch = (): PoolSearchOptions =>
  readJson(POOL_SEARCH_STORAGE_KEY, raw => {
    if (!raw || typeof raw !== 'object')
      return undefined
    const record = raw as Record<string, unknown>
    if (typeof record.matchRole !== 'boolean'
      || typeof record.uniqueWeapon !== 'boolean'
      || typeof record.borrowBound !== 'boolean')
      return undefined
    return {
      matchRole: record.matchRole,
      uniqueWeapon: record.uniqueWeapon,
      borrowBound: record.borrowBound,
      allowPoppiElementChange: readOptionalFlag(
        record,
        'allowPoppiElementChange',
        DEFAULT_POOL_SEARCH.allowPoppiElementChange,
      ),
      rexFixedAttacker: readOptionalFlag(
        record,
        'rexFixedAttacker',
        DEFAULT_POOL_SEARCH.rexFixedAttacker,
      ),
    }
  }, DEFAULT_POOL_SEARCH)

export const storePoolSearch = (options: PoolSearchOptions): void => {
  writeJson(POOL_SEARCH_STORAGE_KEY, options)
}

