export type Opt<T> = T | undefined
export type ValueOf<T> = T[keyof T]
export type Language = 'ja' | 'en' | 'zh-tw'
export type BladeSource = 'FIXED' | 'BINDED' | 'FREE'
export type SlotName = string | null
export type BladeOwners = ReadonlyMap<string, string>

export type MemberState = {
  driver: string | null
  blades: [SlotName, SlotName, SlotName]
}

export type BladeInfo = {
  id: number
  name: string
  weaponName: string
  weaponRole: string
  elements: string[]
  elementMask: number
  index: number
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
}

export type TeamResult = {
  members: TeamMember[]
  elementMask: number
  effectCounts: [number, number, number, number]
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

export type Catalog = {
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
  bindsByBlade: Map<string, { driver: string; isFixed: boolean }[]>
  excludeByBlade: Map<string, Set<string>>
  foreignBlocked: Set<string>
  sourceOf: (driver: string, blade: string) => BladeSource | null
  bladeSource: (blade: string) => BladeSource
  dedicatedDrivers: (blade: string) => string[]
  assignableDrivers: (blade: string) => string[]
  isAssignmentLocked: (blade: string) => boolean
  isEligible: (driver: string, blade: string, owners?: BladeOwners) => boolean
  isOnRole: (driver: string, blade: string) => boolean
  isFixed: (driver: string, blade: string) => boolean
  effectsOf: (driver: string, blade: string) => string[]
  effectMaskOf: (driver: string, blade: string) => number
  manualCandidatesFor: (driver: string, owners: BladeOwners) => BladeInfo[]
  solverCandidatesFor: (driver: string, owners: BladeOwners) => BladeInfo[]
  allElementsMask: number
}
