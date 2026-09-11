import type { BladeInfo, BladeOwners, BladeSource, Catalog, DriverInfo } from "../types/common"

type DriverRow = { id: number; name: string; role: string; can_use_foreign: boolean }
type BladeRow = {
  id: number
  name: string
  weapon: string
  weapon_role: string
  element1: string
  element2: string | null
}
type BindRow = { blade: string; driver: string; is_fixed: boolean }
type EffectRow = { driver: string; weapon: string; effect: string }
type ExcludeRow = { blade: string; driver: string }

export function buildCatalog(raw: {
  drivers: DriverRow[]
  blades: BladeRow[]
  binds: BindRow[]
  effects: EffectRow[]
  excludes: ExcludeRow[]
  foreignBlocked: string[]
}): Catalog {
  const elements = ['fire', 'water', 'wind', 'ice', 'electricity', 'earth', 'dark', 'light']
  const effects = ['break', 'topple', 'launch', 'smash']
  const elementIndex = new Map(elements.map((name, i) => [name, i]))
  const effectIndex = new Map(effects.map((name, i) => [name, i]))

  const bindsByBlade = new Map<string, { driver: string; isFixed: boolean }[]>()
  for (const row of raw.binds) {
    const list = bindsByBlade.get(row.blade) ?? []
    list.push({ driver: row.driver, isFixed: row.is_fixed })
    bindsByBlade.set(row.blade, list)
  }

  const excludeByBlade = new Map<string, Set<string>>()
  for (const row of raw.excludes) {
    const set = excludeByBlade.get(row.blade) ?? new Set<string>()
    set.add(row.driver)
    excludeByBlade.set(row.blade, set)
  }
  const foreignBlocked = new Set(raw.foreignBlocked)

  const fixedByDriver = new Map<string, string[]>()
  for (const row of raw.binds) {
    if (!row.is_fixed)
      continue
    const list = fixedByDriver.get(row.driver) ?? []
    list.push(row.blade)
    fixedByDriver.set(row.driver, list)
  }

  const drivers: DriverInfo[] = raw.drivers.map(d => ({
    id: d.id,
    name: d.name,
    role: d.role,
    fixedBlades: fixedByDriver.get(d.name) ?? [],
    canUseForeign: d.can_use_foreign,
  }))
  const driverByName = new Map(drivers.map(d => [d.name, d]))

  const blades: BladeInfo[] = raw.blades.map((b, index) => {
    const elementNames = [b.element1, b.element2].filter((x): x is string => !!x)
    let elementMask = 0
    for (const el of elementNames) {
      const bit = elementIndex.get(el)
      if (bit !== undefined)
        elementMask |= 1 << bit
    }
    return {
      id: b.id,
      name: b.name,
      weaponName: b.weapon,
      weaponRole: b.weapon_role,
      elements: elementNames,
      elementMask,
      index,
    }
  })
  const bladeByName = new Map(blades.map(b => [b.name, b]))

  const effectsByDriverWeapon = new Map<string, string[]>()
  for (const row of raw.effects) {
    const key = `${row.driver}|${row.weapon}`
    const list = effectsByDriverWeapon.get(key) ?? []
    if (!list.includes(row.effect))
      list.push(row.effect)
    effectsByDriverWeapon.set(key, list)
  }

  const dedicatedDrivers = (blade: string): string[] =>
    (bindsByBlade.get(blade) ?? []).map(b => b.driver)

  const isAssignmentLocked = (blade: string): boolean =>
    (bindsByBlade.get(blade)?.length ?? 0) > 0

  const bladeSource = (blade: string): BladeSource => {
    const binds = bindsByBlade.get(blade)
    if (!binds)
      return 'FREE'
    return binds.some(b => b.isFixed) ? 'FIXED' : 'BINDED'
  }

  const assignableDrivers = (blade: string): string[] => {
    if (isAssignmentLocked(blade))
      return []
    const banned = excludeByBlade.get(blade)
    return drivers.filter(d => !banned?.has(d.name)).map(d => d.name)
  }

  const isEligible = (driver: string, blade: string, owners?: BladeOwners): boolean => {
    if (excludeByBlade.get(blade)?.has(driver))
      return false
    const binds = bindsByBlade.get(blade)
    if (binds)
      return binds.some(b => b.driver === driver)
    const owner = owners?.get(blade)
    if (!owner)
      return true
    if (owner === driver)
      return true
    const info = driverByName.get(driver)
    if (info?.canUseForeign && !foreignBlocked.has(blade))
      return true
    return false
  }

  const isFixed = (driver: string, blade: string): boolean => {
    const binds = bindsByBlade.get(blade)
    return !!binds?.some(b => b.driver === driver && b.isFixed)
  }

  const sourceOf = (driver: string, blade: string): BladeSource | null => {
    if (!isEligible(driver, blade))
      return null
    const binds = bindsByBlade.get(blade)
    if (!binds)
      return 'FREE'
    const bind = binds.find(b => b.driver === driver)
    if (!bind)
      return null
    return bind.isFixed ? 'FIXED' : 'BINDED'
  }

  const isOnRole = (driver: string, blade: string): boolean => {
    const d = driverByName.get(driver)
    const b = bladeByName.get(blade)
    if (!d || !b)
      return false
    return d.role === b.weaponRole
  }

  const effectsOf = (driver: string, blade: string): string[] => {
    const b = bladeByName.get(blade)
    if (!b)
      return []
    return effectsByDriverWeapon.get(`${driver}|${b.weaponName}`) ?? []
  }

  const effectMaskOf = (driver: string, blade: string): number => {
    let mask = 0
    for (const eff of effectsOf(driver, blade)) {
      const bit = effectIndex.get(eff)
      if (bit !== undefined)
        mask |= 1 << bit
    }
    return mask
  }

  const manualCandidatesFor = (driver: string, owners: BladeOwners): BladeInfo[] =>
    blades.filter(b => isEligible(driver, b.name, owners))

  const solverCandidatesFor = (driver: string, owners: BladeOwners): BladeInfo[] =>
    manualCandidatesFor(driver, owners).filter(b => isOnRole(driver, b.name) && !isFixed(driver, b.name))

  return {
    drivers,
    blades,
    bladeByName,
    driverByName,
    elements,
    effects,
    elementIndex,
    effectIndex,
    effectsByDriverWeapon,
    bindsByBlade,
    excludeByBlade,
    foreignBlocked,
    sourceOf,
    bladeSource,
    dedicatedDrivers,
    assignableDrivers,
    isAssignmentLocked,
    isEligible,
    isOnRole,
    isFixed,
    effectsOf,
    effectMaskOf,
    manualCandidatesFor,
    solverCandidatesFor,
    allElementsMask: (1 << elements.length) - 1,
  }
}
