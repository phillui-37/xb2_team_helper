import type { BladeInfo, BladeOwners, Catalog, ElementChoice, MemberState, TeamMember, TeamResult } from "../types/common"
import { ANY_ELEMENT, DRIVER_NIA, DRIVER_REX } from "../types/common"
import { combinations, subsets } from "./combinatorics"
import { hasNiaDriver } from "./members"
import { nativeRoleMatchApplies, rexAssignedFill, rexBladeFitsFill, type PartyRole, type PartyRoles } from "./party"
import { RESULT_CAP, compareTeamResults, createTeamCollector, teamAuxCoreSlots, teamPoolHits } from "./results"

function elementContribution(
  catalog: Catalog,
  blade: BladeInfo,
  allowElementChange: boolean,
  choice: ElementChoice,
): { mask: number; wildcards: number } {
  if (!allowElementChange || !blade.canChangeElement)
    return { mask: blade.elementMask, wildcards: 0 }
  if (choice === ANY_ELEMENT)
    return { mask: 0, wildcards: 1 }
  if (!choice)
    return { mask: blade.elementMask, wildcards: 0 }
  const bit = catalog.elementIndex.get(choice)
  if (bit === undefined)
    return { mask: blade.elementMask, wildcards: 0 }
  return { mask: 1 << bit, wildcards: 0 }
}

function assignWildcardElements(
  catalog: Catalog,
  states: MemberState[],
  team: TeamMember[],
  coveredMask: number,
): { elementMask: number; members: TeamMember[] } {
  const missing: number[] = []
  for (let i = 0; i < catalog.elements.length; i++) {
    if ((coveredMask & (1 << i)) === 0)
      missing.push(i)
  }
  let elementMask = coveredMask
  const members = team.map((member, index) => {
    const state = states.find(s => s.driver === member.driver) ?? states[index]
    const bladeElements: [ElementChoice, ElementChoice, ElementChoice] = [null, null, null]
    for (let slot = 0; slot < 3; slot++) {
      const name = member.blades[slot]
      if (!name)
        continue
      const blade = catalog.bladeByName.get(name)
      if (!blade?.canChangeElement || !state?.allowElementChange)
        continue
      const choice = state.bladeElements[slot]
      if (choice === ANY_ELEMENT) {
        const idx = missing.shift()
        if (idx === undefined) {
          bladeElements[slot] = ANY_ELEMENT
        } else {
          bladeElements[slot] = catalog.elements[idx] ?? ANY_ELEMENT
          elementMask |= 1 << idx
        }
      } else {
        bladeElements[slot] = choice ?? blade.elements[0] ?? null
      }
    }
    return { ...member, bladeElements }
  })
  return { elementMask, members }
}

type DriverWork = {
  driver: string
  matchRole: boolean
  borrowBound: boolean
  uniqueWeapon: boolean
  allowElementChange: boolean
  bladeElements: [ElementChoice, ElementChoice, ElementChoice]
  locked: (string | null)[]
  emptyIdx: number[]
  lockedElem: number
  lockedWildcards: number
  lockedEffects: [number, number, number, number]
  lockedMask: bigint
}

type Stealable = {
  fromDriver: string
  slotIdx: number
  blade: string
}

function addEffects(
  base: [number, number, number, number],
  extra: [number, number, number, number],
): [number, number, number, number] {
  return [base[0] + extra[0], base[1] + extra[1], base[2] + extra[2], base[3] + extra[3]]
}

function effectDelta(catalog: Catalog, driver: string, blade: string): [number, number, number, number] {
  const counts: [number, number, number, number] = [0, 0, 0, 0]
  for (const eff of catalog.effectsOf(driver, blade)) {
    const idx = catalog.effectIndex.get(eff)
    if (idx === 0 || idx === 1 || idx === 2 || idx === 3)
      counts[idx] += 1
  }
  return counts
}

function popcount(mask: number): number {
  let n = mask
  let c = 0
  while (n) {
    n &= n - 1
    c++
  }
  return c
}

function cloneWorks(works: DriverWork[]): DriverWork[] {
  return works.map(work => ({
    driver: work.driver,
    matchRole: work.matchRole,
    borrowBound: work.borrowBound,
    uniqueWeapon: work.uniqueWeapon,
    allowElementChange: work.allowElementChange,
    bladeElements: [...work.bladeElements] as [ElementChoice, ElementChoice, ElementChoice],
    locked: [...work.locked],
    emptyIdx: [...work.emptyIdx],
    lockedElem: work.lockedElem,
    lockedWildcards: work.lockedWildcards,
    lockedEffects: [...work.lockedEffects] as [number, number, number, number],
    lockedMask: work.lockedMask,
  }))
}

function weaponOf(catalog: Catalog, blade: string | null): string | undefined {
  if (!blade)
    return undefined
  return catalog.bladeByName.get(blade)?.weaponName
}

function hasDuplicateWeapon(catalog: Catalog, names: readonly (string | null)[]): boolean {
  const seen = new Set<string>()
  for (const name of names) {
    const weapon = weaponOf(catalog, name)
    if (!weapon)
      continue
    if (seen.has(weapon))
      return true
    seen.add(weapon)
  }
  return false
}

function recomputeLocked(catalog: Catalog, work: DriverWork): void {
  let lockedElem = 0
  let lockedWildcards = 0
  const lockedEffects: [number, number, number, number] = [0, 0, 0, 0]
  let lockedMask = 0n
  const emptyIdx: number[] = []
  for (let i = 0; i < 3; i++) {
    const name = work.locked[i]
    if (!name) {
      emptyIdx.push(i)
      continue
    }
    const blade = catalog.bladeByName.get(name)
    if (!blade)
      continue
    const contrib = elementContribution(
      catalog,
      blade,
      work.allowElementChange,
      work.bladeElements[i] ?? null,
    )
    lockedElem |= contrib.mask
    lockedWildcards += contrib.wildcards
    const delta = effectDelta(catalog, work.driver, name)
    lockedEffects[0] += delta[0]
    lockedEffects[1] += delta[1]
    lockedEffects[2] += delta[2]
    lockedEffects[3] += delta[3]
    lockedMask |= 1n << BigInt(blade.index)
  }
  work.emptyIdx = emptyIdx
  work.lockedElem = lockedElem
  work.lockedWildcards = lockedWildcards
  work.lockedEffects = lockedEffects
  work.lockedMask = lockedMask
}

function applySteals(
  catalog: Catalog,
  works: DriverWork[],
  borrower: string,
  stolen: Stealable[],
): DriverWork[] | null {
  const next = cloneWorks(works)
  const rex = next.find(work => work.driver === borrower)
  if (!rex)
    return null
  for (const steal of stolen) {
    const from = next.find(work => work.driver === steal.fromDriver)
    if (!from || from.locked[steal.slotIdx] !== steal.blade)
      return null
    if (rex.emptyIdx.length === 0)
      return null
    from.locked[steal.slotIdx] = null
    const slot = rex.emptyIdx[0] as number
    rex.locked[slot] = steal.blade
    recomputeLocked(catalog, from)
    recomputeLocked(catalog, rex)
  }
  next.sort((a, b) => a.emptyIdx.length - b.emptyIdx.length)
  return next
}

function collectStealable(
  catalog: Catalog,
  works: DriverWork[],
  owners: BladeOwners,
  rexFill: PartyRole | null,
): { borrower: string; blades: Stealable[] } | undefined {
  const borrower = works.find(work =>
    work.borrowBound && !!catalog.driverByName.get(work.driver)?.canUseForeign)
  if (!borrower)
    return undefined
  const blades: Stealable[] = []
  for (const work of works) {
    if (work.driver === borrower.driver)
      continue
    for (let i = 0; i < 3; i++) {
      const blade = work.locked[i]
      if (!blade)
        continue
      if (!catalog.isForeignBound(borrower.driver, blade))
        continue
      if (!catalog.isEligible(borrower.driver, blade, owners))
        continue
      if (borrower.driver === DRIVER_REX && !rexBladeFitsFill(catalog, blade, rexFill))
        continue
      if (borrower.matchRole && nativeRoleMatchApplies(borrower.driver, rexFill)
        && !catalog.isOnRole(borrower.driver, blade))
        continue
      blades.push({ fromDriver: work.driver, slotIdx: i, blade })
    }
  }
  return { borrower: borrower.driver, blades }
}

export function solve(
  catalog: Catalog,
  members: MemberState[],
  redundancy: boolean,
  owners: BladeOwners,
  advancedNewGame = false,
  priorityPool?: ReadonlySet<string>,
  partyRoles?: PartyRoles,
): TeamResult[] {
  if (members.length !== 3 || members.some(m => !m.driver))
    return []

  const need = redundancy ? 2 : 1
  const niaDriverPicked = hasNiaDriver(members)
  const rexFill = rexAssignedFill(
    catalog,
    members.map(member => member.driver as string),
    partyRoles,
  )
  const works: DriverWork[] = []

  for (const member of members) {
    const driver = member.driver
    if (!driver)
      return []
    for (const name of member.blades) {
      if (name && !catalog.bladeByName.get(name))
        return []
    }
    const work: DriverWork = {
      driver,
      matchRole: member.matchRole,
      borrowBound: member.borrowBound,
      uniqueWeapon: member.uniqueWeapon,
      allowElementChange: member.allowElementChange,
      bladeElements: [...member.bladeElements],
      locked: [...member.blades],
      emptyIdx: [],
      lockedElem: 0,
      lockedWildcards: 0,
      lockedEffects: [0, 0, 0, 0],
      lockedMask: 0n,
    }
    recomputeLocked(catalog, work)
    works.push(work)
  }

  if (works.some(work =>
    work.driver === DRIVER_REX
    && work.locked.some(name => !!name && !rexBladeFitsFill(catalog, name, rexFill))))
    return []

  works.sort((a, b) => a.emptyIdx.length - b.emptyIdx.length)

  const collectPlan = (planned: DriverWork[], resultCap: number): TeamResult[] => {
    const found: TeamResult[] = []
    if (resultCap <= 0)
      return found
    const planWildcards = planned.reduce((sum, work) => sum + work.lockedWildcards, 0)

    const search = (
      driverOrd: number,
      usedMask: bigint,
      elem: number,
      effectCounts: [number, number, number, number],
      filled: Map<string, string[]>,
    ) => {
      if (found.length >= resultCap)
        return
      if (driverOrd === planned.length) {
        const missingElem = popcount(catalog.allElementsMask & ~elem)
        if (missingElem <= planWildcards && effectCounts.every(c => c >= need)) {
          const team: TeamMember[] = members.map(m => {
            const driver = m.driver as string
            const blades = filled.get(driver) as string[]
            return {
              driver,
              blades: [blades[0] as string, blades[1] as string, blades[2] as string],
              bladeElements: [null, null, null],
            }
          })
          const resolved = assignWildcardElements(catalog, members, team, elem)
          found.push({
            members: resolved.members,
            elementMask: resolved.elementMask,
            effectCounts: [...effectCounts],
            auxCoreSlots: teamAuxCoreSlots(catalog, resolved.members),
            poolHits: priorityPool ? teamPoolHits(resolved.members, priorityPool) : 0,
          })
        }
        return
      }

      let remainingSlots = 0
      for (let i = driverOrd; i < planned.length; i++)
        remainingSlots += planned[i]!.emptyIdx.length
      const missingElem = popcount(catalog.allElementsMask & ~elem)
      const missingEff = effectCounts.reduce((sum, c) => sum + Math.max(0, need - c), 0)
      if (remainingSlots * 2 + planWildcards < missingElem || remainingSlots * 2 < missingEff)
        return

      const work = planned[driverOrd] as DriverWork
      if (work.uniqueWeapon && hasDuplicateWeapon(catalog, work.locked))
        return
      const lockedWeapons = new Set<string>()
      if (work.uniqueWeapon) {
        for (const name of work.locked) {
          const weapon = weaponOf(catalog, name)
          if (weapon)
            lockedWeapons.add(weapon)
        }
      }
      const matchNativeRole = work.matchRole && nativeRoleMatchApplies(work.driver, rexFill)
      const available = catalog.solverCandidatesFor(work.driver, owners, matchNativeRole).filter(b => {
        if ((usedMask & (1n << BigInt(b.index))) !== 0n)
          return false
        if (niaDriverPicked && b.name === DRIVER_NIA)
          return false
        if (work.driver === DRIVER_REX && !rexBladeFitsFill(catalog, b.name, rexFill))
          return false
        if (catalog.isForeignBound(work.driver, b.name)) {
          if (!work.borrowBound)
            return false
          if (!catalog.canBorrowBound(work.driver, b.name))
            return false
        }
        if (work.uniqueWeapon && lockedWeapons.has(b.weaponName))
          return false
        if (b.advancedNewGame && !advancedNewGame)
          return false
        if (catalog.isBindsOnly(work.driver) && !catalog.isFixed(work.driver, b.name))
          return false
        return true
      })
      if (priorityPool) {
        available.sort((a, b) => {
          const ap = priorityPool.has(a.name) ? 0 : 1
          const bp = priorityPool.has(b.name) ? 0 : 1
          if (ap !== bp)
            return ap - bp
          return a.index - b.index
        })
      }
      const combos = combinations(available, work.emptyIdx.length)

      for (const combo of combos) {
        if (found.length >= resultCap)
          return
        if (work.uniqueWeapon && hasDuplicateWeapon(catalog, combo.map(b => b.name)))
          continue
        let nextMask = usedMask
        let nextElem = elem
        let nextEffects = effectCounts
        const slots = [...work.locked]
        for (let i = 0; i < combo.length; i++) {
          const blade = combo[i]!
          const slot = work.emptyIdx[i] as number
          slots[slot] = blade.name
          nextMask |= 1n << BigInt(blade.index)
          nextElem |= blade.elementMask
          nextEffects = addEffects(nextEffects, effectDelta(catalog, work.driver, blade.name))
        }
        filled.set(work.driver, slots.map(s => s as string))
        search(driverOrd + 1, nextMask, nextElem, nextEffects, filled)
      }
    }

    let startMask = 0n
    let startElem = 0
    let startEffects: [number, number, number, number] = [0, 0, 0, 0]
    for (const work of planned) {
      startMask |= work.lockedMask
      startElem |= work.lockedElem
      startEffects = addEffects(startEffects, work.lockedEffects)
    }
    search(0, startMask, startElem, startEffects, new Map())
    return found
  }

  const steal = collectStealable(catalog, works, owners, rexFill)
  const borrowerWork = steal
    ? works.find(work => work.driver === steal.borrower)
    : undefined
  const maxSteal = borrowerWork?.emptyIdx.length ?? 0
  const stealPlans = steal
    ? subsets(steal.blades).filter(plan => plan.length <= maxSteal)
    : [[]]
  const prepared = stealPlans.map(plan => {
    if (plan.length === 0)
      return works
    return applySteals(catalog, works, steal!.borrower, plan)
  }).filter((planned): planned is DriverWork[] => !!planned)

  // Fair share first so one steal plan cannot fill RESULT_CAP alone. A plan that
  // returns fewer than `quota` is exhausted; only capped plans are continued.
  // Continuation restarts DFS, so skip the teams already taken from that plan
  // instead of pushing them again.
  const quota = Math.max(1, Math.floor(RESULT_CAP / Math.max(1, prepared.length)))
  const buckets = prepared.map(planned => collectPlan(planned, quota))
  const { results, take } = createTeamCollector()
  for (const bucket of buckets)
    for (const team of bucket)
      take(team)
  if (results.length < RESULT_CAP) {
    for (let i = 0; i < prepared.length; i++) {
      if (results.length >= RESULT_CAP)
        break
      const already = buckets[i]!.length
      if (already < quota)
        continue
      const more = collectPlan(prepared[i]!, RESULT_CAP)
      for (const team of more.slice(already))
        take(team)
    }
  }
  results.sort(compareTeamResults)
  return results
}
