import type { BladeInfo, Catalog } from "../types/common"

export const POPPI_BLADES = ['hana js', 'hana jk', 'hana jd'] as const

const POOL_STORAGE_KEY = 'xb2-blade-pool'
const ALLOW_TORA_STORAGE_KEY = 'xb2-allow-tora'

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

export const readPool = (catalog: Catalog): Set<string> => {
  try {
    const raw = localStorage.getItem(POOL_STORAGE_KEY)
    if (!raw)
      return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed))
      return new Set()
    const pool = new Set<string>()
    for (const name of parsed) {
      if (typeof name === 'string' && catalog.bladeByName.has(name) && !isPoppi(name))
        pool.add(name)
    }
    return pool
  } catch {
    return new Set()
  }
}

export const storePool = (pool: ReadonlySet<string>): void => {
  try {
    localStorage.setItem(POOL_STORAGE_KEY, JSON.stringify([...pool]))
  } catch {
    // ignore quota / private mode
  }
}

export const readAllowTora = (): boolean => {
  try {
    return localStorage.getItem(ALLOW_TORA_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export const storeAllowTora = (value: boolean): void => {
  try {
    localStorage.setItem(ALLOW_TORA_STORAGE_KEY, value ? '1' : '0')
  } catch {
    // ignore quota / private mode
  }
}
