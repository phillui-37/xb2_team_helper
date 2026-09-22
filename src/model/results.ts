import type { Catalog, TeamMember, TeamResult } from "../types/common"

export const RESULT_CAP = 100

export function teamAuxCoreSlots(catalog: Catalog, members: TeamMember[]): number {
  let total = 0
  for (const member of members) {
    for (const name of member.blades)
      total += catalog.bladeByName.get(name)?.auxCoreSlots ?? 0
  }
  return total
}

export function teamPoolHits(members: readonly TeamMember[], pool: ReadonlySet<string>): number {
  let hits = 0
  for (const member of members) {
    for (const name of member.blades) {
      if (pool.has(name))
        hits += 1
    }
  }
  return hits
}

/** Driver + slot identity for a completed team. */
export function teamMemoKey(members: TeamMember[]): string {
  return members.map(m => `${m.driver}:${m.blades.join(",")}`).join("|")
}

export const compareTeamResults = (a: TeamResult, b: TeamResult): number => {
  if (b.poolHits !== a.poolHits)
    return b.poolHits - a.poolHits
  return b.auxCoreSlots - a.auxCoreSlots
}

export type TeamCollector = {
  readonly results: TeamResult[]
  take: (team: TeamResult) => void
}

/** Deduped result list capped at `cap`. First unique key wins. */
export function createTeamCollector(cap = RESULT_CAP): TeamCollector {
  const results: TeamResult[] = []
  const seen = new Set<string>()
  return {
    results,
    take(team: TeamResult) {
      if (results.length >= cap)
        return
      const key = teamMemoKey(team.members)
      if (seen.has(key))
        return
      seen.add(key)
      results.push(team)
    },
  }
}
