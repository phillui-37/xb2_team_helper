import { Effect, Schema } from "effect"
import type { BladeOwners, Catalog, MemberState, SlotName } from "../types/common"
import { OwnersJsonSchema } from "./data/rowSchema"

const STORAGE_KEY = 'xb2-blade-owners'

export function emptyOwners(): Map<string, string> {
  return new Map()
}

export function readOwners(catalog: Catalog): Map<string, string> {
  return Effect.runSync(Effect.sync(() => {
    const owners = emptyOwners()
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw)
        return owners
      const decoded = Schema.decodeUnknownSync(OwnersJsonSchema)(JSON.parse(raw))
      for (const [blade, driver] of Object.entries(decoded)) {
        if (catalog.isAssignmentLocked(blade))
          continue
        if (!catalog.bladeByName.has(blade) || !catalog.driverByName.has(driver))
          continue
        if (!catalog.assignableDrivers(blade).includes(driver))
          continue
        owners.set(blade, driver)
      }
    } catch {
      // corrupt storage → empty map
    }
    return owners
  }))
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
