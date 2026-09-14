import { solve, teamMemoKey } from "../src/model/solver.ts"
import type { BladeInfo, Catalog, DriverInfo, MemberState, TeamMember } from "../src/types/common.ts"

function blade(name: string, index: number, elementMask = 1): BladeInfo {
  return {
    id: index,
    name,
    weaponName: "w",
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
const zanobia = blade("zanobia", 8)
const extra = blade("extra", 9)
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

const members: MemberState[] = [
  { driver: "rex", blades: ["seihai", "nia-blade", "corvin"], matchRole: true, borrowBound: true },
  { driver: "merefu", blades: ["kaguduchi", "wadatumi", "kasandra"], matchRole: true, borrowBound: false },
  { driver: "zig", blades: ["saika", "wulfric", null], matchRole: true, borrowBound: false },
]

function uniqueKeys(teams: { members: TeamMember[] }[]): string[] {
  return [...new Set(teams.map(t => teamMemoKey(t.members)))]
}

function assert(cond: boolean, message: string): void {
  if (!cond)
    throw new Error(message)
}

const screenshotLike = mockCatalog({
  blades: [...locked, zanobia],
  drivers,
  effectsOf,
  candidates: [zanobia],
})

const oneFill = solve(screenshotLike, members, true, new Map())
assert(oneFill.length === 1, `expected 1 team after memo, got ${oneFill.length}`)
assert(oneFill[0]?.members[2]?.blades[2] === "zanobia", "empty slot should fill zanobia")

const twoCandidates = mockCatalog({
  blades: [...locked, zanobia, extra],
  drivers,
  effectsOf,
  candidates: [zanobia, extra],
})
const twoFill = solve(twoCandidates, members, true, new Map())
assert(twoFill.length === 2, `expected 2 distinct teams, got ${twoFill.length}`)
assert(uniqueKeys(twoFill).length === 2, "two fills must stay distinct")

console.log("solver memo checks passed", {
  screenshotLike: oneFill.length,
  twoCandidates: twoFill.length,
})
