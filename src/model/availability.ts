import type { Catalog, MemberState } from "../types/common"

/** Driver currently holding this blade, if any. */
export const holderOf = (
  members: readonly MemberState[],
  blade: string,
): string | null => {
  for (const member of members) {
    if (member.driver && member.blades.includes(blade))
      return member.driver
  }
  return null
}

/**
 * Slot options follow current team state. Rex is the only special case:
 * he can take another driver's unique (fixed/binded) blade, and that
 * driver can pick it back while Rex still holds it.
 */
export const canPickFromTeam = (
  catalog: Catalog,
  driver: string,
  blade: string,
  members: readonly MemberState[],
  heldByDriver: readonly (string | null)[],
): boolean => {
  if (heldByDriver.includes(blade))
    return false
  const holder = holderOf(members, blade)
  if (!holder)
    return true
  if (holder === driver)
    return false
  // Rex takes a unique blade from whoever currently has it.
  if (catalog.canBorrowBound(driver, blade) && catalog.isForeignBound(driver, blade))
    return true
  // Dedicated driver returns a unique blade that Rex currently holds.
  return catalog.canBorrowBound(holder, blade)
    && catalog.dedicatedDrivers(blade).includes(driver)
}
