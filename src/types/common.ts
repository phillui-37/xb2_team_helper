export type Language = 'ja' | 'en' | 'zh-tw'
export type BladeSource = 'FIXED' | 'BINDED' | 'FREE'
export type SlotName = string | null
export type BladeOwners = ReadonlyMap<string, string>

export const DRIVER_REX = 'rex'
export const DRIVER_NIA = 'nia'
export const DRIVER_TORA = 'tora'
export const BLADE_SEIHAI = 'seihai'
export const DRIVER_ORDER = ['rex', 'nia', 'merefu', 'zig', 'tora'] as const
export type DriverName = typeof DRIVER_ORDER[number]

/** Canonical element order; bit i in elementMask is ELEMENTS[i]. */
export const ELEMENTS = ['fire', 'water', 'wind', 'ice', 'electricity', 'earth', 'dark', 'light'] as const
export type ElementName = typeof ELEMENTS[number]

/** Canonical driver-art effect order; effectCounts[i] is EFFECTS[i]. */
export const EFFECTS = ['break', 'topple', 'launch', 'smash'] as const
export type EffectName = typeof EFFECTS[number]

/** Wildcard element for Poppiswap blades: solver may use any element. */
export const ANY_ELEMENT = '-'

export type ElementChoice = string | null

export const emptyBladeElements = (): [ElementChoice, ElementChoice, ElementChoice] =>
  [null, null, null]

export type MemberState = {
  driver: string | null
  blades: [SlotName, SlotName, SlotName]
  matchRole: boolean
  borrowBound: boolean
  uniqueWeapon: boolean
  allowElementChange: boolean
  bladeElements: [ElementChoice, ElementChoice, ElementChoice]
}

export type BladeInfo = {
  id: number
  name: string
  weaponName: string
  weaponRole: string
  /** Default element(s) from the database. */
  elements: string[]
  elementMask: number
  index: number
  advancedNewGame: boolean
  auxCoreSlots: number
  canChangeElement: boolean
}

export type DriverInfo = {
  id: number
  name: string
  role: string
  fixedBlades: string[]
  canUseForeign: boolean
}

export type TeamMember = {
  driver: string
  blades: [string, string, string]
  /** Resolved element per slot; null means the blade's default. */
  bladeElements: [ElementChoice, ElementChoice, ElementChoice]
}

export type TeamResult = {
  members: TeamMember[]
  elementMask: number
  effectCounts: [number, number, number, number]
  auxCoreSlots: number
  /** How many equipped blades were in the user's priority pool. */
  poolHits: number
}

export type WeaponInfo = {
  name: string
  role: string
}

export type GiftOwnerType = 'driver' | 'blade'

export type PouchCategory = {
  name: string
  buffKey: string
}

export type PouchBuff = {
  key: string
  categoryNames: string[]
}

export type GiftItem = {
  name: string
  category: string
}

export type CharacterGift = {
  id: string
  ownerType: GiftOwnerType
  ownerName: string
  persona: string | null
  categories: string[]
  items: GiftItem[]
  buffKeys: string[]
}

export type CatalogData = {
  drivers: DriverInfo[]
  blades: BladeInfo[]
  weapons: WeaponInfo[]
  bladeByName: Map<string, BladeInfo>
  driverByName: Map<string, DriverInfo>
  elements: string[]
  effects: string[]
  elementChains: [string, string, string][]
  elementIndex: Map<string, number>
  effectIndex: Map<string, number>
  effectsByDriverWeapon: Map<string, string[]>
  pouchCategories: PouchCategory[]
  pouchBuffs: PouchBuff[]
  characterGifts: CharacterGift[]
  allElementsMask: number
}

export type CatalogQueries = {
  bladeSource: (blade: string) => BladeSource
  dedicatedDrivers: (blade: string) => string[]
  assignableDrivers: (blade: string) => string[]
  isAssignmentLocked: (blade: string) => boolean
  isEligible: (driver: string, blade: string, owners?: BladeOwners) => boolean
  isOnRole: (driver: string, blade: string) => boolean
  isFixed: (driver: string, blade: string) => boolean
  isBindsOnly: (driver: string) => boolean
  canBorrowBound: (driver: string, blade: string) => boolean
  isForeignBound: (driver: string, blade: string) => boolean
  effectsOf: (driver: string, blade: string) => string[]
  manualCandidatesFor: (driver: string, owners: BladeOwners) => BladeInfo[]
  solverCandidatesFor: (driver: string, owners: BladeOwners, matchRole?: boolean) => BladeInfo[]
}

export type Catalog = CatalogData & CatalogQueries

