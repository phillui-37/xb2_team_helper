import type { BladeOwners, Catalog, MemberState, SlotName } from "../types/common"
import { readJson, writeJson } from "./storage"

const STORAGE_KEY = 'xb2-blade-owners'

const parseOwners = (raw: unknown): Record<string, string> | undefined => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return undefined
  const owners: Record<string, string> = {}
  for (const [blade, driver] of Object.entries(raw)) {
    if (typeof driver === 'string')
      owners[blade] = driver
  }
  return owners
}

const acceptOwner = (catalog: Catalog, blade: string, driver: string): boolean =>
  !catalog.isAssignmentLocked(blade)
  && catalog.bladeByName.has(blade)
  && catalog.driverByName.has(driver)
  && catalog.assignableDrivers(blade).includes(driver)

export const readOwners = (catalog: Catalog): Map<string, string> => {
  const decoded = readJson(STORAGE_KEY, parseOwners, {})
  const owners = new Map<string, string>()
  for (const [blade, driver] of Object.entries(decoded)) {
    if (acceptOwner(catalog, blade, driver))
      owners.set(blade, driver)
  }
  return owners
}

export const storeOwners = (owners: BladeOwners): void => {
  writeJson(STORAGE_KEY, Object.fromEntries(owners))
}

export const sanitizeMembers = (
  catalog: Catalog,
  members: MemberState[],
  owners: BladeOwners,
): MemberState[] =>
  members.map(member => {
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
    const bladeElements = member.bladeElements.map((choice, slot) =>
      blades[slot] ? choice : null,
    ) as MemberState['bladeElements']
    return { ...member, driver, blades, bladeElements }
  })

export const reconcileMembers = (
  catalog: Catalog,
  members: MemberState[],
  owners: BladeOwners,
  preferIndex?: number,
): MemberState[] => {
  const sanitized = sanitizeMembers(catalog, members, owners)
  const order = preferIndex === undefined
    ? sanitized.map((_, i) => i)
    : [preferIndex, ...sanitized.map((_, i) => i).filter(i => i !== preferIndex)]
  const slots = sanitized.map(member => [...member.blades] as [SlotName, SlotName, SlotName])
  const claimed = new Set<string>()
  for (const index of order) {
    const blades = slots[index]!
    for (let slot = 0; slot < 3; slot++) {
      const blade = blades[slot]
      if (!blade)
        continue
      if (claimed.has(blade))
        blades[slot] = null
      else
        claimed.add(blade)
    }
  }
  const next = sanitized.map((member, i) => ({ ...member, blades: slots[i]! }))
  for (const member of next) {
    if (!member.driver || !catalog.isBindsOnly(member.driver))
      continue
    for (const name of catalog.driverByName.get(member.driver)?.fixedBlades ?? []) {
      if (member.blades.includes(name) || claimed.has(name))
        continue
      const empty = member.blades.findIndex(blade => !blade)
      if (empty < 0)
        continue
      member.blades[empty] = name
      claimed.add(name)
    }
  }
  return next
}
