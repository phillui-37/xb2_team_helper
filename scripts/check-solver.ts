import { solve, teamMemoKey } from "../src/model/solver.ts"
import type { BladeInfo, Catalog, DriverInfo, MemberState, TeamMember } from "../src/types/common.ts"

function blade(name: string, index: number, elementMask = 1, advancedNewGame = false): BladeInfo {
  return {
    id: index,
    name,
    weaponName: "w",
    weaponRole: "Attacker",
    elements: ["fire"],
    elementMask,
    index,
    advancedNewGame,
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

const angBlade = blade("yoshitsune", 11, 1, true)
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

console.log("solver duplicate checks passed", {
  screenshotLike: oneFill.length,
  threeCandidates: threeFill.length,
  angOff: angOff.length,
  angOn: angOn.length,
})
