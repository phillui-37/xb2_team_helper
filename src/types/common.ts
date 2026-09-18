export type Language = 'ja' | 'en' | 'zh-tw'
export type BladeSource = 'FIXED' | 'BINDED' | 'FREE'
export type SlotName = string | null
export type BladeOwners = ReadonlyMap<string, string>

export const DRIVER_NIA = 'nia'
export const DRIVER_TORA = 'tora'

export type MemberState = {
  driver: string | null
  blades: [SlotName, SlotName, SlotName]
  matchRole: boolean
  borrowBound: boolean
}

export type BladeInfo = {
  id: number
  name: string
  weaponName: string
  weaponRole: string
  elements: string[]
  elementMask: number
  index: number
  advancedNewGame: boolean
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
  allElementsMask: number
}
