import { solve, teamMemoKey } from "../src/model/solver.ts"
import type { BladeInfo, Catalog, DriverInfo, MemberState, TeamMember } from "../src/types/common.ts"

function blade(name: string, index: number, elementMask = 1, weaponName = "w"): BladeInfo {
  return {
    id: index,
    name,
    weaponName,
    weaponRole: "Attacker",
    elements: ["fire"],
    elementMask,
    index,
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
}): Catalog {
  const bladeByName = new Map(opts.blades.map(b => [b.name, b]))
  const driverByName = new Map(opts.drivers.map(d => [d.name, d]))
  const effectIndex = new Map([["break", 0], ["topple", 1], ["launch", 2], ["smash", 3]])
  return {
    bladeByName,
    driverByName,
    effectIndex,
    allElementsMask: 1,
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
  opts: Partial<Pick<MemberState, "matchRole" | "borrowBound" | "uniqueWeapon">> = {},
): MemberState => ({
  driver,
  blades,
  matchRole: opts.matchRole ?? true,
  borrowBound: opts.borrowBound ?? false,
  uniqueWeapon: opts.uniqueWeapon ?? false,
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

console.log("solver duplicate checks passed", {
  screenshotLike: oneFill.length,
  threeCandidates: threeFill.length,
  uniqueWeaponOn: uniqueOn.length,
  uniqueWeaponOff: uniqueOff.length,
  uniqueWeaponCombo: comboFill.length,
})
