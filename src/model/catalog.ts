import { match, P } from "ts-pattern"
import type { BladeInfo, BladeOwners, BladeSource, Catalog, CharacterGift, DriverInfo, PouchBuff, PouchCategory, WeaponInfo } from "../types/common"
import { DRIVER_TORA } from "../types/common"
import type {
  BladeRow,
  BindRow,
  ChainRow,
  DriverRow,
  EffectRow,
  ExcludeRow,
  FavoriteCategoryRow,
  FavoriteItemRow,
  PouchCategoryRow,
  WeaponRow,
} from "../types/dbRows"
import { eligible, manualPick, selectBlades, solverPick } from "./criteria"

export function buildCatalog(raw: {
  drivers: DriverRow[]
  blades: BladeRow[]
  binds: BindRow[]
  effects: EffectRow[]
  excludes: ExcludeRow[]
  foreignBlocked: string[]
  weapons: WeaponRow[]
  elementChains: ChainRow[]
  pouchCategories: PouchCategoryRow[]
  favoriteCategories: FavoriteCategoryRow[]
  favoriteItems: FavoriteItemRow[]
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
      advancedNewGame: b.advanced_new_game,
      auxCoreSlots: b.aux_core_slots,
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

  const bladeSource = (blade: string): BladeSource =>
    match(bindsByBlade.get(blade))
      .with(P.nullish, () => 'FREE' as const)
      .when(binds => binds.some(b => b.isFixed), () => 'FIXED' as const)
      .otherwise(() => 'BINDED' as const)

  const isBindsOnly = (driver: string): boolean => driver === DRIVER_TORA

  const canBorrowBound = (driver: string, blade: string): boolean => {
    const info = driverByName.get(driver)
    return !!info?.canUseForeign && !foreignBlocked.has(blade)
  }

  const assignableDrivers = (blade: string): string[] => {
    if (isAssignmentLocked(blade))
      return []
    const banned = excludeByBlade.get(blade)
    return drivers
      .filter(d => !isBindsOnly(d.name) && !banned?.has(d.name))
      .map(d => d.name)
  }

  const isEligible = (driver: string, blade: string, owners?: BladeOwners): boolean => {
    if (excludeByBlade.get(blade)?.has(driver))
      return false
    const binds = bindsByBlade.get(blade)
    if (binds) {
      if (binds.some(b => b.driver === driver))
        return true
      // Rex can use another driver's fixed/bound blade except Poppi α / QT / QTπ.
      return canBorrowBound(driver, blade)
    }
    if (isBindsOnly(driver))
      return false
    const owner = owners?.get(blade)
    if (!owner || owner === driver)
      return true
    return canBorrowBound(driver, blade)
  }

  const isFixed = (driver: string, blade: string): boolean => {
    const binds = bindsByBlade.get(blade)
    return !!binds?.some(b => b.driver === driver && b.isFixed)
  }

  const isForeignBound = (driver: string, blade: string): boolean => {
    const dedicated = dedicatedDrivers(blade)
    return dedicated.length > 0 && !dedicated.includes(driver)
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

  const weapons: WeaponInfo[] = raw.weapons.map(w => ({ name: w.name, role: w.role }))
  const elementChains: [string, string, string][] = raw.elementChains.map(c => [c.element1, c.element2, c.element3])
  const pouchCategories: PouchCategory[] = raw.pouchCategories.map(c => ({
    name: c.name,
    buffKey: c.buff_key,
  }))
  const pouchBuffs: PouchBuff[] = [...new Map(
    pouchCategories.map(c => [c.buffKey, [] as string[]]),
  ).entries()].map(([key]) => ({
    key,
    categoryNames: pouchCategories.filter(c => c.buffKey === key).map(c => c.name),
  }))

  const giftMap = new Map<string, CharacterGift>()
  const giftKey = (ownerType: string, ownerName: string, persona: string) =>
    `${ownerType}:${ownerName}:${persona}`

  for (const row of raw.favoriteCategories) {
    const id = giftKey(row.owner_type, row.owner_name, row.persona)
    let gift = giftMap.get(id)
    if (!gift) {
      gift = {
        id,
        ownerType: row.owner_type,
        ownerName: row.owner_name,
        persona: row.persona || null,
        categories: [],
        items: [],
        buffKeys: [],
      }
      giftMap.set(id, gift)
    }
    if (!gift.categories.includes(row.category))
      gift.categories.push(row.category)
    if (!gift.buffKeys.includes(row.buff_key))
      gift.buffKeys.push(row.buff_key)
  }
  for (const row of raw.favoriteItems) {
    const id = giftKey(row.owner_type, row.owner_name, row.persona)
    let gift = giftMap.get(id)
    if (!gift) {
      gift = {
        id,
        ownerType: row.owner_type,
        ownerName: row.owner_name,
        persona: row.persona || null,
        categories: [],
        items: [],
        buffKeys: [],
      }
      giftMap.set(id, gift)
    }
    if (!gift.items.some(item => item.name === row.item))
      gift.items.push({ name: row.item, category: row.category })
  }
  const characterGifts = [...giftMap.values()]

  const catalog: Catalog = {
    drivers,
    blades,
    weapons,
    bladeByName,
    driverByName,
    elements,
    effects,
    elementChains,
    elementIndex,
    effectIndex,
    effectsByDriverWeapon,
    pouchCategories,
    pouchBuffs,
    characterGifts,
    bladeSource,
    dedicatedDrivers,
    assignableDrivers,
    isAssignmentLocked,
    isEligible,
    isOnRole,
    isFixed,
    isBindsOnly,
    canBorrowBound,
    isForeignBound,
    effectsOf,
    manualCandidatesFor: (driver, owners) =>
      selectBlades(blades, { catalog, driver, owners }, manualPick),
    solverCandidatesFor: (driver, owners, matchRole = true) =>
      selectBlades(
        blades,
        { catalog, driver, owners },
        matchRole ? solverPick : eligible,
      ),
    allElementsMask: (1 << elements.length) - 1,
  }
  return catalog
}
