export type Opt<T> = T | undefined
export type ValueOf<T> = T[keyof T]
export type Language = 'ja' | 'en' | 'zh-tw'
export type BladeSource = 'FIXED' | 'BINDED' | 'FREE'
export type SlotName = string | null

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

export type Catalog = {
  drivers: DriverInfo[]
  blades: BladeInfo[]
  bladeByName: Map<string, BladeInfo>
  driverByName: Map<string, DriverInfo>
  elements: string[]
  effects: string[]
  elementIndex: Map<string, number>
  effectIndex: Map<string, number>
  effectsByDriverWeapon: Map<string, string[]>
  bindsByBlade: Map<string, { driver: string; isFixed: boolean }[]>
  sourceOf: (driver: string, blade: string) => BladeSource | null
  isEligible: (driver: string, blade: string) => boolean
  isOnRole: (driver: string, blade: string) => boolean
  isFixed: (driver: string, blade: string) => boolean
  effectsOf: (driver: string, blade: string) => string[]
  effectMaskOf: (driver: string, blade: string) => number
  manualCandidates: Map<string, BladeInfo[]>
  solverCandidates: Map<string, BladeInfo[]>
  translations: Map<string, Record<Language, string>>
  allElementsMask: number
}
