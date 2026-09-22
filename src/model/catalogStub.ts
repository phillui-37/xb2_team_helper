import type { Catalog, CatalogData, CatalogQueries } from "../types/common"
import { DRIVER_REX, DRIVER_TORA, EFFECTS, ELEMENTS } from "../types/common"

const defaultQueries: CatalogQueries = {
  bladeSource: () => "FREE",
  dedicatedDrivers: () => [],
  assignableDrivers: () => [],
  isAssignmentLocked: () => false,
  isEligible: () => true,
  isOnRole: () => true,
  isFixed: () => false,
  isBindsOnly: driver => driver === DRIVER_TORA,
  canBorrowBound: driver => driver === DRIVER_REX,
  isForeignBound: () => false,
  effectsOf: () => [],
  manualCandidatesFor: () => [],
  solverCandidatesFor: () => [],
}

/** Test helper: fill Catalog data/query defaults so mocks need not use `as Catalog`. */
export function stubCatalog(
  opts: Partial<Catalog> & Pick<CatalogData, "blades" | "drivers">,
): Catalog {
  const { blades, drivers } = opts
  return {
    weapons: [],
    bladeByName: new Map(blades.map(b => [b.name, b])),
    driverByName: new Map(drivers.map(d => [d.name, d])),
    elements: [...ELEMENTS],
    effects: [...EFFECTS],
    elementChains: [],
    elementIndex: new Map(ELEMENTS.map((name, i) => [name, i])),
    effectIndex: new Map(EFFECTS.map((name, i) => [name, i])),
    effectsByDriverWeapon: new Map(),
    pouchCategories: [],
    pouchBuffs: [],
    characterGifts: [],
    allElementsMask: (1 << ELEMENTS.length) - 1,
    ...defaultQueries,
    ...opts,
    blades,
    drivers,
  }
}
