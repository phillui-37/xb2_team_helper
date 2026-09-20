import { solve, teamMemoKey } from "../src/model/solver.ts"
import type { BladeInfo, Catalog, DriverInfo, MemberState, TeamMember } from "../src/types/common.ts"
import { ANY_ELEMENT, emptyBladeElements } from "../src/types/common.ts"

function blade(
  name: string,
  index: number,
  elementMask = 1,
  weaponName = "w",
  advancedNewGame = false,
  auxCoreSlots = 1,
  canChangeElement = false,
): BladeInfo {
  return {
    id: index,
    name,
    weaponName,
    weaponRole: "Attacker",
    elements: ["fire"],
    elementMask,
    index,
    advancedNewGame,
    auxCoreSlots,
    canChangeElement,
  }
}

function driver(name: string, role: string, canUseForeign: boolean): DriverInfo {
  return { id: 0, name, role, fixedBlades: [], canUseForeign }
}

function mockCatalog(opts: {
  blades: BladeInfo[]
  drivers: DriverInfo[]
  effectsOf: (driver: string, blade: string) => string[]
  candidates: BladeInfo[]
  allElementsMask?: number
}): Catalog {
  const bladeByName = new Map(opts.blades.map(b => [b.name, b]))
  const driverByName = new Map(opts.drivers.map(d => [d.name, d]))
  const effectIndex = new Map([["break", 0], ["topple", 1], ["launch", 2], ["smash", 3]])
  const elements = ["fire", "water", "wind", "ice", "electricity", "earth", "dark", "light"]
  return {
    bladeByName,
    driverByName,
    effectIndex,
    elements,
    elementIndex: new Map(elements.map((name, i) => [name, i])),
    allElementsMask: opts.allElementsMask ?? 1,
    effectsOf: opts.effectsOf,
    solverCandidatesFor: () => opts.candidates,
    isForeignBound: () => false,
    isEligible: () => true,
    isOnRole: () => true,
  } as Catalog
}

const locked = [
  "seihai", "nia-blade", "corvin",
  "kaguduchi", "wadatumi", "kasandra",
  "saika", "wulfric",
].map((name, index) => blade(name, index))
const fills = [8, 9, 10].map(index => blade(`fill-${index}`, index))
const drivers = [
  driver("rex", "Attacker", true),
  driver("merefu", "Tank", false),
  driver("zig", "Attacker", false),
]

const effectsOf = (d: string, b: string): string[] => {
  if (d === "rex" && b === "seihai")
    return ["break", "topple"]
  if (d === "rex" && b === "nia-blade")
    return ["launch", "smash"]
  if (d === "rex" && b === "corvin")
    return ["break", "topple"]
  if (d === "merefu" && b === "kaguduchi")
    return ["launch", "smash"]
  return []
}

const member = (
  driver: string,
  blades: MemberState["blades"],
  opts: Partial<Pick<MemberState, "matchRole" | "borrowBound" | "uniqueWeapon" | "allowElementChange" | "bladeElements">> = {},
): MemberState => ({
  driver,
  blades,
  matchRole: opts.matchRole ?? true,
  borrowBound: opts.borrowBound ?? false,
  uniqueWeapon: opts.uniqueWeapon ?? false,
  allowElementChange: opts.allowElementChange ?? false,
  bladeElements: opts.bladeElements ?? emptyBladeElements(),
})

const members: MemberState[] = [
  member("rex", ["seihai", "nia-blade", "corvin"], { borrowBound: true }),
  member("merefu", ["kaguduchi", "wadatumi", "kasandra"]),
  member("zig", ["saika", "wulfric", null]),
]

function uniqueKeys(teams: { members: TeamMember[] }[]): string[] {
  return [...new Set(teams.map(t => teamMemoKey(t.members)))]
}

function assert(cond: boolean, message: string): void {
  if (!cond)
    throw new Error(message)
}

const screenshotLike = mockCatalog({
  blades: [...locked, fills[0]!],
  drivers,
  effectsOf,
  candidates: [fills[0]!],
})

const oneFill = solve(screenshotLike, members, true, new Map())
assert(oneFill.length === 1, `expected 1 team, got ${oneFill.length}`)
assert(oneFill[0]?.members[2]?.blades[2] === "fill-8", "empty slot should fill the only candidate")

const threeCandidates = mockCatalog({
  blades: [...locked, ...fills],
  drivers,
  effectsOf,
  candidates: fills,
})
const threeFill = solve(threeCandidates, members, true, new Map())
assert(threeFill.length === 3, `expected 3 distinct teams, got ${threeFill.length}`)
assert(uniqueKeys(threeFill).length === 3, "three fills must stay distinct and not double-emitted")

const uniqueLocked = [
  blade("seihai", 0, 1, "aegis"),
  blade("nia-blade", 1, 1, "scimitar"),
  blade("corvin", 2, 1, "uchigatana"),
  blade("kaguduchi", 3, 1, "katana"),
  blade("wadatumi", 4, 1, "lance"),
  blade("kasandra", 5, 1, "hammer"),
  blade("saika", 6, 1, "bigbang"),
  blade("wulfric", 7, 1, "axe"),
]
const fillSame = blade("fill-same", 8, 1, "bigbang")
const fillNew = blade("fill-new", 9, 1, "cannon")
const uniqueMembers: MemberState[] = [
  member("rex", ["seihai", "nia-blade", "corvin"], { borrowBound: true, uniqueWeapon: true }),
  member("merefu", ["kaguduchi", "wadatumi", "kasandra"], { uniqueWeapon: true }),
  member("zig", ["saika", "wulfric", null], { uniqueWeapon: true }),
]
const uniqueCatalog = mockCatalog({
  blades: [...uniqueLocked, fillSame, fillNew],
  drivers,
  effectsOf,
  candidates: [fillSame, fillNew],
})
const uniqueOn = solve(uniqueCatalog, uniqueMembers, true, new Map())
assert(uniqueOn.length === 1, `unique weapon on: expected 1 team, got ${uniqueOn.length}`)
assert(uniqueOn[0]?.members[2]?.blades[2] === "fill-new", "duplicate weapon fill must be rejected")

const uniqueOff = solve(
  uniqueCatalog,
  uniqueMembers.map(m => m.driver === "zig" ? { ...m, uniqueWeapon: false } : m),
  true,
  new Map(),
)
assert(uniqueOff.length === 2, `unique weapon off: expected 2 teams, got ${uniqueOff.length}`)

const twinA = blade("twin-a", 10, 1, "twin")
const twinB = blade("twin-b", 11, 1, "twin")
const otherFill = blade("other-a", 12, 1, "other")
const twoEmpty: MemberState[] = [
  member("rex", ["seihai", "nia-blade", "corvin"], { borrowBound: true, uniqueWeapon: true }),
  member("merefu", ["kaguduchi", "wadatumi", "kasandra"], { uniqueWeapon: true }),
  member("zig", ["saika", null, null], { uniqueWeapon: true }),
]
const comboCatalog = mockCatalog({
  blades: [...uniqueLocked, twinA, twinB, otherFill],
  drivers,
  effectsOf,
  candidates: [twinA, twinB, otherFill],
})
const comboFill = solve(comboCatalog, twoEmpty, true, new Map())
assert(comboFill.length === 2, `combo unique weapon: expected 2 teams, got ${comboFill.length}`)
assert(
  comboFill.every(team => {
    const blades = team.members[2]?.blades ?? []
    return blades.includes("other-a") && (blades.includes("twin-a") || blades.includes("twin-b"))
  }),
  "combo fills must pair the distinct weapon, not two twins",
)

const angBlade = blade("yoshitsune", 11, 1, "w", true)
const angCatalog = mockCatalog({
  blades: [...locked, fills[0]!, angBlade],
  drivers,
  effectsOf,
  candidates: [fills[0]!, angBlade],
})
const angOff = solve(angCatalog, members, true, new Map(), false)
assert(angOff.length === 1, `expected 1 team with ANG off, got ${angOff.length}`)
assert(angOff[0]?.members[2]?.blades[2] === "fill-8", "ANG blade must stay hidden when the option is off")
const angOn = solve(angCatalog, members, true, new Map(), true)
assert(angOn.length === 2, `expected 2 teams with ANG on, got ${angOn.length}`)
assert(
  uniqueKeys(angOn).some(key => key.includes("yoshitsune")),
  "ANG blade should fill a slot when the option is on",
)

const poppi = (name: string, index: number, defaultBit: number, defaultName: string): BladeInfo => ({
  id: index,
  name,
  weaponName: `hana-${name}`,
  weaponRole: "Tank",
  elements: [defaultName],
  elementMask: defaultBit,
  index,
  advancedNewGame: false,
  auxCoreSlots: 0,
  canChangeElement: true,
})

const poppiJs = poppi("hana js", 0, 1 << 5, "earth")
const poppiJk = poppi("hana jk", 1, 1 << 0, "fire")
const poppiJd = poppi("hana jd", 2, 1 << 3, "ice")
const coverFire = blade("cover-fire", 3, 1 << 0)
const coverWater = blade("cover-water", 4, 1 << 1)
const coverWind = blade("cover-wind", 5, 1 << 2)
const coverIce = blade("cover-ice", 6, 1 << 3)
const coverElec = blade("cover-elec", 7, 1 << 4)
const coverEarth = blade("cover-earth", 8, 1 << 5)
const coverDark = blade("cover-dark", 9, 1 << 6)
const poppiDrivers = [
  driver("rex", "Attacker", true),
  driver("merefu", "Tank", false),
  driver("tora", "Tank", false),
]
const poppiEffects = (d: string, b: string): string[] => {
  if (d === "rex" && b === "cover-fire")
    return ["break", "topple", "launch", "smash"]
  return []
}
const poppiCatalog = mockCatalog({
  blades: [poppiJs, poppiJk, poppiJd, coverFire, coverWater, coverWind, coverIce, coverElec, coverEarth, coverDark],
  drivers: poppiDrivers,
  effectsOf: poppiEffects,
  candidates: [],
  allElementsMask: 0b11111111,
})
const toraPoppiMembers = (opts: Partial<Pick<MemberState, "allowElementChange" | "bladeElements">> = {}): MemberState[] => [
  member("rex", ["cover-fire", "cover-water", "cover-wind"]),
  member("merefu", ["cover-ice", "cover-elec", "cover-earth"]),
  member("tora", ["hana js", "hana jk", "hana jd"], opts),
]

const poppiDefault = solve(poppiCatalog, toraPoppiMembers(), false, new Map())
assert(poppiDefault.length === 0, `default Poppi elements should miss light/dark, got ${poppiDefault.length}`)

const poppiAny = solve(
  poppiCatalog,
  toraPoppiMembers({
    allowElementChange: true,
    bladeElements: [ANY_ELEMENT, ANY_ELEMENT, ANY_ELEMENT],
  }),
  false,
  new Map(),
)
assert(poppiAny.length === 1, `wildcard Poppi elements should complete the set, got ${poppiAny.length}`)
assert(
  poppiAny[0]?.members[2]?.bladeElements.includes("light")
    && poppiAny[0]?.members[2]?.bladeElements.includes("dark"),
  "wildcard Poppi should be assigned the missing light and dark elements",
)

const poppiCustom = solve(
  poppiCatalog,
  toraPoppiMembers({
    allowElementChange: true,
    bladeElements: ["light", "dark", "fire"],
  }),
  false,
  new Map(),
)
assert(poppiCustom.length === 1, `custom Poppi elements should complete the set, got ${poppiCustom.length}`)
assert(
  poppiCustom[0]?.members[2]?.bladeElements[0] === "light"
    && poppiCustom[0]?.members[2]?.bladeElements[1] === "dark",
  "result should keep the chosen custom elements",
)

const poppiCustomOff = solve(
  poppiCatalog,
  toraPoppiMembers({
    allowElementChange: false,
    bladeElements: ["light", "dark", "fire"],
  }),
  false,
  new Map(),
)
assert(poppiCustomOff.length === 0, "custom elements must be ignored when allowElementChange is off")

const lowFill = blade("fill-low", 13, 1, "w", false, 1)
const highFill = blade("fill-high", 14, 1, "w", false, 3)
const sortCatalog = mockCatalog({
  blades: [...locked, lowFill, highFill],
  drivers,
  effectsOf,
  candidates: [lowFill, highFill],
})
const sorted = solve(sortCatalog, members, true, new Map())
assert(sorted.length === 2, `aux-core sort: expected 2 teams, got ${sorted.length}`)
assert(sorted[0]?.members[2]?.blades[2] === "fill-high", "higher aux-core team should sort first")
assert(sorted[1]?.members[2]?.blades[2] === "fill-low", "lower aux-core team should sort second")
assert(sorted[0]!.auxCoreSlots > sorted[1]!.auxCoreSlots, "auxCoreSlots should decrease")
assert(
  sorted.every((team, i) => i === 0 || sorted[i - 1]!.auxCoreSlots >= team.auxCoreSlots),
  "results must be sorted by aux core slot count descending",
)

console.log("solver duplicate checks passed", {
  screenshotLike: oneFill.length,
  threeCandidates: threeFill.length,
  uniqueWeaponOn: uniqueOn.length,
  uniqueWeaponOff: uniqueOff.length,
  uniqueWeaponCombo: comboFill.length,
  angOff: angOff.length,
  angOn: angOn.length,
  poppiDefault: poppiDefault.length,
  poppiAny: poppiAny.length,
  poppiCustom: poppiCustom.length,
  poppiCustomOff: poppiCustomOff.length,
  auxCoreSort: sorted.map(team => team.auxCoreSlots),
})
