import type { BladeOwners, Catalog, MemberState, SlotName } from "../types/common"

const STORAGE_KEY = 'xb2-blade-owners'

export function emptyOwners(): Map<string, string> {
  return new Map()
}

export function readOwners(catalog: Catalog): Map<string, string> {
  const owners = emptyOwners()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw)
      return owners
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return owners
    for (const [blade, driver] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof driver !== 'string')
        continue
      if (catalog.isAssignmentLocked(blade))
        continue
      if (!catalog.bladeByName.has(blade) || !catalog.driverByName.has(driver))
        continue
      if (!catalog.assignableDrivers(blade).includes(driver))
        continue
      owners.set(blade, driver)
    }
  } catch {
    // ignore bad storage
  }
  return owners
}

export function storeOwners(owners: BladeOwners) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(owners)))
  } catch {
    // ignore
  }
}

export function sanitizeMembers(catalog: Catalog, members: MemberState[], owners: BladeOwners): MemberState[] {
  return members.map(member => {
    if (!member.driver)
      return member
    const driver = member.driver
    const blades = member.blades.map(blade => {
      if (!blade)
        return blade
      if (catalog.isFixed(driver, blade))
        return blade
      return catalog.isEligible(driver, blade, owners) ? blade : null
    }) as [SlotName, SlotName, SlotName]
    return { driver, blades }
  })
}
