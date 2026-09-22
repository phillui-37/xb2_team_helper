import type { Catalog, MemberState, TeamResult } from "../types/common"
import type { PartyRoles } from "./party"
import { solveFromPool } from "./poolSolve"
import { solve } from "./solver"

export type SolveAssignJob = {
  kind: "assign"
  members: MemberState[]
  redundancy: boolean
  owners: [string, string][]
  advancedNewGame: boolean
}

export type SolvePoolJob = {
  kind: "pool"
  pool: string[]
  allowTora: boolean
  redundancy: boolean
  advancedNewGame: boolean
  matchRole: boolean
  uniqueWeapon: boolean
  borrowBound: boolean
  roles: PartyRoles
}

export type SolveJob = SolveAssignJob | SolvePoolJob

export type SolveRequest = {
  id: number
  job: SolveJob
}

export type SolveResponse =
  | { id: number; ok: true; results: TeamResult[] }
  | { id: number; ok: false; error: string }

export function runSolveJob(catalog: Catalog, job: SolveJob): TeamResult[] {
  if (job.kind === "pool") {
    return solveFromPool(catalog, {
      pool: new Set(job.pool),
      allowTora: job.allowTora,
      redundancy: job.redundancy,
      advancedNewGame: job.advancedNewGame,
      matchRole: job.matchRole,
      uniqueWeapon: job.uniqueWeapon,
      borrowBound: job.borrowBound,
      roles: job.roles,
    })
  }
  return solve(
    catalog,
    job.members,
    job.redundancy,
    new Map(job.owners),
    job.advancedNewGame,
  )
}
