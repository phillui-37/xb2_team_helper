import type { BladeOwners, Catalog, MemberState, TeamMember, TeamResult } from "../types/common"

export const RESULT_CAP = 100
export const NIA = 'nia'

type DriverWork = {
  driver: string
  matchRole: boolean
  borrowBound: boolean
  locked: (string | null)[]
  emptyIdx: number[]
  lockedElem: number
  lockedEffects: [number, number, number, number]
  lockedMask: bigint
}

type Stealable = {
  fromDriver: string
  slotIdx: number
  blade: string
}

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0)
    return [[]]
  if (k > items.length)
    return []
  const out: T[][] = []
  const rec = (start: number, acc: T[]) => {
    if (acc.length === k) {
      out.push(acc.slice())
      return
    }
    for (let i = start; i < items.length; i++) {
      acc.push(items[i] as T)
      rec(i + 1, acc)
      acc.pop()
    }
  }
  rec(0, [])
  return out
}

function subsets<T>(items: T[]): T[][] {
  const out: T[][] = [[]]
  for (const item of items) {
    const n = out.length
    for (let i = 0; i < n; i++)
      out.push([...out[i]!, item])
  }
  return out
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
    if (idx === 0) counts[0] += 1
    else if (idx === 1) counts[1] += 1
    else if (idx === 2) counts[2] += 1
    else if (idx === 3) counts[3] += 1
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

/** Completed assignment identity. Intermediate (driver, usedMask) is not a valid merge key. */
export function teamMemoKey(members: TeamMember[]): string {
  return members.map(m => `${m.driver}:${m.blades.join(",")}`).join("|")
}

function cloneWorks(works: DriverWork[]): DriverWork[] {
  return works.map(work => ({
    driver: work.driver,
    matchRole: work.matchRole,
    borrowBound: work.borrowBound,
    locked: [...work.locked],
    emptyIdx: [...work.emptyIdx],
    lockedElem: work.lockedElem,
    lockedEffects: [...work.lockedEffects] as [number, number, number, number],
    lockedMask: work.lockedMask,
  }))
}

function recomputeLocked(catalog: Catalog, work: DriverWork): void {
  let lockedElem = 0
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
    lockedElem |= blade.elementMask
    const delta = effectDelta(catalog, work.driver, name)
    lockedEffects[0] += delta[0]
    lockedEffects[1] += delta[1]
    lockedEffects[2] += delta[2]
    lockedEffects[3] += delta[3]
    lockedMask |= 1n << BigInt(blade.index)
  }
  work.emptyIdx = emptyIdx
  work.lockedElem = lockedElem
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
      if (borrower.matchRole && !catalog.isOnRole(borrower.driver, blade))
        continue
      blades.push({ fromDriver: work.driver, slotIdx: i, blade })
    }
  }
  return { borrower: borrower.driver, blades }
}

export function usedBladeSet(members: MemberState[]): Set<string> {
  const used = new Set<string>()
  for (const member of members) {
    for (const blade of member.blades) {
      if (blade)
        used.add(blade)
    }
  }
  return used
}

export function hasNiaDriver(members: MemberState[]): boolean {
  return members.some(m => m.driver === NIA)
}

export function hasNiaBlade(members: MemberState[]): boolean {
  return members.some(m => m.blades.includes(NIA))
}

export function solve(
  catalog: Catalog,
  members: MemberState[],
  redundancy: boolean,
  owners: BladeOwners,
): TeamResult[] {
  if (members.length !== 3 || members.some(m => !m.driver))
    return []

  const need = redundancy ? 2 : 1
  const niaDriverPicked = hasNiaDriver(members)
  const works: DriverWork[] = []

  for (const member of members) {
    const driver = member.driver
    if (!driver)
      return []
    let lockedElem = 0
    const lockedEffects: [number, number, number, number] = [0, 0, 0, 0]
    let lockedMask = 0n
    const emptyIdx: number[] = []
    for (let i = 0; i < 3; i++) {
      const name = member.blades[i]
      if (!name) {
        emptyIdx.push(i)
        continue
      }
      const blade = catalog.bladeByName.get(name)
      if (!blade)
        return []
      lockedElem |= blade.elementMask
      const delta = effectDelta(catalog, driver, name)
      lockedEffects[0] += delta[0]
      lockedEffects[1] += delta[1]
      lockedEffects[2] += delta[2]
      lockedEffects[3] += delta[3]
      lockedMask |= 1n << BigInt(blade.index)
    }
    works.push({
      driver,
      matchRole: member.matchRole,
      borrowBound: member.borrowBound,
      locked: [...member.blades],
      emptyIdx,
      lockedElem,
      lockedEffects,
      lockedMask,
    })
  }

  works.sort((a, b) => a.emptyIdx.length - b.emptyIdx.length)

  const results: TeamResult[] = []
  // DP memo of completed assignments. Intermediate (driver, usedMask) would
  // merge distinct slottings; steal-plan search also restarts in a second pass,
  // so the same team would otherwise be emitted twice.
  const seen = new Set<string>()
  const search = (
    planned: DriverWork[],
    driverOrd: number,
    usedMask: bigint,
    elem: number,
    effectCounts: [number, number, number, number],
    filled: Map<string, string[]>,
    resultCap: number,
  ) => {
    if (results.length >= resultCap)
      return
    if (driverOrd === planned.length) {
      if (elem === catalog.allElementsMask && effectCounts.every(c => c >= need)) {
        const team: TeamMember[] = members.map(m => {
          const driver = m.driver as string
          const blades = filled.get(driver) as string[]
          return { driver, blades: [blades[0] as string, blades[1] as string, blades[2] as string] }
        })
        const key = teamMemoKey(team)
        if (seen.has(key))
          return
        seen.add(key)
        results.push({ members: team, elementMask: elem, effectCounts: [...effectCounts] })
      }
      return
    }

    let remainingSlots = 0
    for (let i = driverOrd; i < planned.length; i++)
      remainingSlots += planned[i]!.emptyIdx.length
    const missingElem = popcount(catalog.allElementsMask & ~elem)
    const missingEff = effectCounts.reduce((sum, c) => sum + Math.max(0, need - c), 0)
    if (remainingSlots * 2 < missingElem || remainingSlots * 2 < missingEff)
      return

    const work = planned[driverOrd] as DriverWork
    const available = catalog.solverCandidatesFor(work.driver, owners, work.matchRole).filter(b => {
      if ((usedMask & (1n << BigInt(b.index))) !== 0n)
        return false
      if (niaDriverPicked && b.name === NIA)
        return false
      if (!work.borrowBound && catalog.isForeignBound(work.driver, b.name))
        return false
      return true
    })
    const combos = combinations(available, work.emptyIdx.length)

    for (const combo of combos) {
      if (results.length >= resultCap)
        return
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
      search(planned, driverOrd + 1, nextMask, nextElem, nextEffects, filled, resultCap)
    }
  }

  const runPlan = (planned: DriverWork[], resultCap: number) => {
    if (results.length >= resultCap)
      return
    let startMask = 0n
    let startElem = 0
    let startEffects: [number, number, number, number] = [0, 0, 0, 0]
    for (const work of planned) {
      startMask |= work.lockedMask
      startElem |= work.lockedElem
      startEffects = addEffects(startEffects, work.lockedEffects)
    }
    search(planned, 0, startMask, startElem, startEffects, new Map(), resultCap)
  }

  const steal = collectStealable(catalog, works, owners)
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

  const quota = Math.max(1, Math.floor(RESULT_CAP / Math.max(1, prepared.length)))
  for (const planned of prepared)
    runPlan(planned, Math.min(RESULT_CAP, results.length + quota))
  for (const planned of prepared)
    runPlan(planned, RESULT_CAP)
  return results
}
