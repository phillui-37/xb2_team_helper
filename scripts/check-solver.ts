import { solve, solveFromPool, teamMemoKey, driverTriples, DEFAULT_PARTY_ROLES } from "../src/model/solver.ts"
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
  binds?: Record<string, { drivers: string[]; fixed?: boolean }>
}): Catalog {
  const bladeByName = new Map(opts.blades.map(b => [b.name, b]))
  const driverByName = new Map(opts.drivers.map(d => [d.name, d]))
  const effectIndex = new Map([["break", 0], ["topple", 1], ["launch", 2], ["smash", 3]])
  const elements = ["fire", "water", "wind", "ice", "electricity", "earth", "dark", "light"]
  const binds = opts.binds ?? {}
  return {
    bladeByName,
    driverByName,
    drivers: opts.drivers,
    effectIndex,
    elements,
    elementIndex: new Map(elements.map((name, i) => [name, i])),
    allElementsMask: opts.allElementsMask ?? 1,
    effectsOf: opts.effectsOf,
    solverCandidatesFor: () => opts.candidates,
    isForeignBound: (driver, blade) => {
      const dedicated = binds[blade]?.drivers ?? []
      return dedicated.length > 0 && !dedicated.includes(driver)
    },
    isEligible: () => true,
    isOnRole: () => true,
    bladeSource: (blade) => {
      const bind = binds[blade]
      if (!bind)
        return "FREE"
      return bind.fixed ? "FIXED" : "BINDED"
    },
    dedicatedDrivers: (blade) => binds[blade]?.drivers ?? [],
    isBindsOnly: (driver) => driver === "tora",
    isFixed: (driver, blade) => !!binds[blade]?.fixed && (binds[blade]?.drivers.includes(driver) ?? false),
    canBorrowBound: (driver, blade) => {
      if (driver !== "rex")
        return false
      return blade !== "hana js" && blade !== "hana jk" && blade !== "hana jd"
    },
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
assert(sorted.every(team => team.poolHits === 0), "assign mode should not count pool hits")

const triplesNoTora = driverTriples(false)
assert(triplesNoTora.length === 4, `expected 4 core triples, got ${triplesNoTora.length}`)
assert(triplesNoTora.every(t => t.length === 3 && !t.includes("tora")), "core triples must omit Tora")
const triplesWithTora = driverTriples(true)
assert(triplesWithTora.length === 10, `expected 10 triples with Tora, got ${triplesWithTora.length}`)
assert(triplesWithTora.filter(t => t.includes("tora")).length === 6, "Tora should join 6 pairs")

function driverWithFixed(name: string, role: string, canUseForeign: boolean, fixedBlades: string[]): DriverInfo {
  return { id: 0, name, role, fixedBlades, canUseForeign }
}

const poolLow = blade("fill-pool", 20, 1, "w", false, 1)
const poolMid = blade("fill-pool-mid", 21, 1, "w", false, 2)
const otherHigh = blade("fill-other", 22, 1, "w", false, 5)
const poolPriorityCatalog = mockCatalog({
  blades: [...locked, poolLow, poolMid, otherHigh],
  drivers,
  effectsOf,
  candidates: [poolLow, poolMid, otherHigh],
})
const poolMembers: MemberState[] = [
  member("rex", ["seihai", "nia-blade", "corvin"], { borrowBound: true }),
  member("merefu", ["kaguduchi", "wadatumi", "kasandra"]),
  member("zig", ["saika", "wulfric", null]),
]
const poolPreferred = solve(
  poolPriorityCatalog,
  poolMembers,
  true,
  new Map(),
  false,
  new Set(["fill-pool", "fill-pool-mid"]),
)
assert(poolPreferred.length === 3, `pool priority: expected 3 teams, got ${poolPreferred.length}`)
assert(poolPreferred[0]?.members[2]?.blades[2] === "fill-pool-mid", "highest aux among pool blades should rank first")
assert(poolPreferred[0]?.poolHits === 1, "used pool blade should count as a hit")
assert(
  poolPreferred.every((team, i) => i === 0 || poolPreferred[i - 1]!.poolHits >= team.poolHits),
  "pool hits must sort descending",
)
assert(
  poolPreferred.some(team => team.members[2]?.blades[2] === "fill-other"),
  "non-pool blades may still fill leftover slots",
)

const extraPool = Array.from({ length: 10 }, (_, i) => blade(`extra-pool-${i}`, 30 + i))
const overflowCatalog = mockCatalog({
  blades: [...locked, ...extraPool],
  drivers,
  effectsOf,
  candidates: extraPool,
})
const overflowPool = new Set(extraPool.map(b => b.name))
const overflow = solve(overflowCatalog, poolMembers, true, new Map(), false, overflowPool)
assert(overflow.length > 0, "a 10-blade pool must still produce teams")
assert(
  overflow.every(team => team.members.flatMap(m => m.blades).filter(name => overflowPool.has(name)).length <= 1),
  "only the empty slot can take a pool blade; the other 10 cannot all be used",
)

const toraDrivers = [
  driverWithFixed("rex", "Attacker", true, ["seihai"]),
  driverWithFixed("merefu", "Tank", false, ["kaguduchi"]),
  driverWithFixed("tora", "Tank", false, ["hana js", "hana jk", "hana jd"]),
]
const coverLight = blade("cover-light", 10, 1 << 7)
const seihaiFixed = blade("seihai", 11, (1 << 0) | (1 << 7), "seihai")
const kaguduchiFixed = blade("kaguduchi", 12, 1 << 0, "whip")
const toraPoolCatalog = mockCatalog({
  blades: [
    poppiJs, poppiJk, poppiJd, seihaiFixed, kaguduchiFixed,
    coverFire, coverWater, coverWind, coverIce, coverElec, coverEarth, coverDark, coverLight,
  ],
  drivers: toraDrivers,
  effectsOf: (d, b) => {
    if (d === "rex" && b === "cover-fire")
      return ["break", "topple"]
    if (d === "merefu" && b === "cover-water")
      return ["launch", "smash"]
    return []
  },
  candidates: [coverFire, coverWater, coverWind, coverIce, coverElec, coverEarth, coverDark, coverLight],
  allElementsMask: 0b11111111,
})
const toraOn = solveFromPool(toraPoolCatalog, {
  pool: new Set(["cover-fire", "cover-water", "cover-wind", "cover-ice", "cover-elec", "cover-earth", "cover-dark", "cover-light"]),
  allowTora: true,
  redundancy: false,
  advancedNewGame: false,
  matchRole: true,
  uniqueWeapon: false,
  borrowBound: true,
  roles: ["Attacker", "Tank", "Tank"],
})
assert(toraOn.length >= 1, `allow Tora should produce a team, got ${toraOn.length}`)
assert(
  toraOn.some(team => team.members.some(m => m.driver === "tora"
    && m.blades.includes("hana js")
    && m.blades.includes("hana jk")
    && m.blades.includes("hana jd"))),
  "Tora teams must include all three Poppi without them being in the pool",
)

const toraOff = solveFromPool(toraPoolCatalog, {
  pool: new Set(["cover-fire", "cover-water", "cover-wind", "cover-ice", "cover-elec", "cover-earth", "cover-dark", "cover-light"]),
  allowTora: false,
  redundancy: false,
  advancedNewGame: false,
  matchRole: true,
  uniqueWeapon: false,
  borrowBound: true,
  roles: ["Attacker", "Tank", "Tank"],
})
assert(toraOff.every(team => team.members.every(m => m.driver !== "tora")), "allow Tora off must omit Tora")
assert(toraOff.length === 0, "three-driver teams without Tora cannot be formed from only two drivers")

const roleDrivers = [
  driver("rex", "Attacker", true),
  driver("nia", "Healer", false),
  driver("merefu", "Tank", false),
  driver("zig", "Attacker", false),
  driver("tora", "Tank", false),
]
const roleCatalog = mockCatalog({
  blades: [blade("x", 0)],
  drivers: roleDrivers,
  effectsOf: () => [],
  candidates: [],
})
const roleNames = new Set(roleDrivers.map(d => d.name))
const balancedRoles = driverTriples(true, roleNames, { catalog: roleCatalog, roles: DEFAULT_PARTY_ROLES })
assert(balancedRoles.length === 4, `balanced roles: expected 4 triples, got ${balancedRoles.length}`)
assert(balancedRoles.every(t => t.includes("nia")), "Attacker/Tank/Healer must include Nia")
assert(balancedRoles.every(t => !(t.includes("rex") && t.includes("zig"))), "two attackers cannot fill one attacker slot")
assert(balancedRoles.filter(t => t.includes("tora")).length === 2, "Tora should pair with each attacker + Nia")
const twoAttackers = driverTriples(false, roleNames, {
  catalog: roleCatalog,
  roles: ["Attacker", "Attacker", "Tank"],
})
assert(twoAttackers.length === 1, `two attackers + tank: expected 1 triple, got ${twoAttackers.length}`)
assert(twoAttackers[0]?.includes("rex") && twoAttackers[0]?.includes("zig") && twoAttackers[0]?.includes("merefu"), "Rex + Zeke + Mòrag")

const wadatumi = blade("wadatumi", 40)
const boundFills = [41, 42, 43, 44, 45].map(index => blade(`bound-fill-${index}`, index))
const boundDrivers = [
  driverWithFixed("rex", "Attacker", true, ["seihai"]),
  driverWithFixed("nia", "Healer", false, ["pyauko"]),
  driverWithFixed("merefu", "Tank", false, ["kaguduchi"]),
]
const boundCatalog = mockCatalog({
  blades: [blade("seihai", 0), blade("pyauko", 1), blade("kaguduchi", 2), wadatumi, ...boundFills],
  drivers: boundDrivers,
  effectsOf: (d, b) => {
    if (d === "rex" && b === "seihai")
      return ["break", "topple", "launch", "smash"]
    return []
  },
  candidates: [wadatumi, ...boundFills],
  binds: {
    seihai: { drivers: ["rex"], fixed: true },
    pyauko: { drivers: ["nia"], fixed: true },
    kaguduchi: { drivers: ["merefu"], fixed: true },
    wadatumi: { drivers: ["merefu"] },
  },
})
const boundKeep = solveFromPool(boundCatalog, {
  pool: new Set(["wadatumi"]),
  allowTora: false,
  redundancy: false,
  advancedNewGame: false,
  matchRole: false,
  uniqueWeapon: false,
  borrowBound: false,
  roles: DEFAULT_PARTY_ROLES,
})
assert(boundKeep.length >= 1, `bound owner keep: expected teams, got ${boundKeep.length}`)
assert(
  boundKeep.every(team => {
    const merefu = team.members.find(m => m.driver === "merefu")
    const rex = team.members.find(m => m.driver === "rex")
    return !!merefu?.blades.includes("wadatumi") && !rex?.blades.includes("wadatumi")
  }),
  "Mòrag's bound blade must stay on Mòrag when Rex is not borrowing",
)
assert(
  boundKeep.every(team => team.members.every(m => m.driver !== "tora")),
  "Tora must stay out when allow Tora is off",
)

const poppiFills = [50, 51, 52, 53].map(index => blade(`poppi-fill-${index}`, index))
const poppiCandidates = mockCatalog({
  blades: [poppiJs, poppiJk, poppiJd, seihaiFixed, kaguduchiFixed, coverFire, ...poppiFills],
  drivers: [
    driverWithFixed("rex", "Attacker", true, ["seihai"]),
    driverWithFixed("merefu", "Tank", false, ["kaguduchi"]),
    driverWithFixed("tora", "Tank", false, ["hana js", "hana jk", "hana jd"]),
  ],
  effectsOf: (d, b) => (d === "rex" && b === "cover-fire" ? ["break", "topple", "launch", "smash"] : []),
  candidates: [poppiJs, poppiJk, poppiJd, coverFire, ...poppiFills],
  binds: {
    seihai: { drivers: ["rex"], fixed: true },
    kaguduchi: { drivers: ["merefu"], fixed: true },
    "hana js": { drivers: ["tora"], fixed: true },
    "hana jk": { drivers: ["tora"], fixed: true },
    "hana jd": { drivers: ["tora"], fixed: true },
  },
})
const poppiGuard = solveFromPool(poppiCandidates, {
  pool: new Set(["cover-fire"]),
  allowTora: true,
  redundancy: false,
  advancedNewGame: false,
  matchRole: false,
  uniqueWeapon: false,
  borrowBound: true,
  roles: ["Attacker", "Tank", "Tank"],
})
assert(
  poppiGuard.every(team => team.members.every(m =>
    m.driver === "tora"
      ? m.blades.every(b => b === "hana js" || b === "hana jk" || b === "hana jd")
      : !m.blades.includes("hana js") && !m.blades.includes("hana jk") && !m.blades.includes("hana jd"))),
  "Poppi stay on Tora; Rex cannot borrow them",
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
  poolPreferred: poolPreferred.map(team => [team.members[2]?.blades[2], team.poolHits, team.auxCoreSlots]),
  overflow: overflow.length,
  toraOn: toraOn.length,
  toraOff: toraOff.length,
  balancedRoles: balancedRoles.length,
  twoAttackers: twoAttackers.length,
  boundKeep: boundKeep.length,
  poppiGuard: poppiGuard.length,
})
