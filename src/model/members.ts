import type { Catalog, MemberState, SlotName } from "../types/common"
import { DRIVER_NIA, emptyBladeElements } from "../types/common"

export const emptyMember = (): MemberState => ({
  driver: null,
  blades: [null, null, null],
  matchRole: true,
  borrowBound: true,
  uniqueWeapon: true,
  allowElementChange: false,
  bladeElements: emptyBladeElements(),
})

export const prefillFixedBlades = (
  catalog: Catalog,
  driver: string,
  used: ReadonlySet<string> = new Set(),
): [SlotName, SlotName, SlotName] => {
  const blades: [SlotName, SlotName, SlotName] = [null, null, null]
  catalog.driverByName.get(driver)?.fixedBlades.forEach((name, i) => {
    if (i < 3 && !used.has(name))
      blades[i] = name
  })
  return blades
}

export const memberDefaultsForDriver = (
  catalog: Catalog,
  driver: string,
  options: Pick<MemberState, 'matchRole' | 'uniqueWeapon' | 'borrowBound'>,
): Pick<MemberState, 'matchRole' | 'borrowBound' | 'uniqueWeapon' | 'allowElementChange' | 'bladeElements'> => {
  const info = catalog.driverByName.get(driver)
  return {
    matchRole: catalog.isBindsOnly(driver) ? true : options.matchRole,
    borrowBound: !!info?.canUseForeign && options.borrowBound,
    uniqueWeapon: catalog.isBindsOnly(driver) ? true : options.uniqueWeapon,
    allowElementChange: false,
    bladeElements: emptyBladeElements(),
  }
}

export function hasNiaDriver(members: readonly MemberState[]): boolean {
  return members.some(m => m.driver === DRIVER_NIA)
}

export function hasNiaBlade(members: readonly MemberState[]): boolean {
  return members.some(m => m.blades.includes(DRIVER_NIA))
}
