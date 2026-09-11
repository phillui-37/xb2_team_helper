import type { Catalog, MemberState, TeamMember, TeamResult } from "../types/common"

export const RESULT_CAP = 100
export const NIA = 'nia'

type DriverWork = {
  driver: string
  locked: (string | null)[]
  emptyIdx: number[]
  lockedElem: number
  lockedEffects: [number, number, number, number]
  lockedMask: bigint
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
      locked: [...member.blades],
      emptyIdx,
      lockedElem,
      lockedEffects,
      lockedMask,
    })
  }

  works.sort((a, b) => a.emptyIdx.length - b.emptyIdx.length)

  const results: TeamResult[] = []
  const search = (
    driverOrd: number,
    usedMask: bigint,
    elem: number,
    effectCounts: [number, number, number, number],
    filled: Map<string, string[]>,
  ) => {
    if (results.length >= RESULT_CAP)
      return
    if (driverOrd === works.length) {
      if (elem === catalog.allElementsMask && effectCounts.every(c => c >= need)) {
        const team: TeamMember[] = members.map(m => {
          const driver = m.driver as string
          const blades = filled.get(driver) as string[]
          return { driver, blades: [blades[0] as string, blades[1] as string, blades[2] as string] }
        })
        results.push({ members: team, elementMask: elem, effectCounts: [...effectCounts] })
      }
      return
    }

    let remainingSlots = 0
    for (let i = driverOrd; i < works.length; i++)
      remainingSlots += works[i]!.emptyIdx.length
    const missingElem = popcount(catalog.allElementsMask & ~elem)
    const missingEff = effectCounts.reduce((sum, c) => sum + Math.max(0, need - c), 0)
    if (remainingSlots * 2 < missingElem || remainingSlots * 2 < missingEff)
      return

    const work = works[driverOrd] as DriverWork
    const available = (catalog.solverCandidates.get(work.driver) ?? []).filter(b => {
      if ((usedMask & (1n << BigInt(b.index))) !== 0n)
        return false
      if (niaDriverPicked && b.name === NIA)
        return false
      return true
    })
    const combos = combinations(available, work.emptyIdx.length)

    for (const combo of combos) {
      if (results.length >= RESULT_CAP)
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
      search(driverOrd + 1, nextMask, nextElem, nextEffects, filled)
    }
  }

  let startMask = 0n
  let startElem = 0
  let startEffects: [number, number, number, number] = [0, 0, 0, 0]
  for (const work of works) {
    startMask |= work.lockedMask
    startElem |= work.lockedElem
    startEffects = addEffects(startEffects, work.lockedEffects)
  }
  search(0, startMask, startElem, startEffects, new Map())
  return results
}
