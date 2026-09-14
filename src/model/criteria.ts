import { Array as Arr, Effect, Predicate, pipe } from "effect"
import type { BladeInfo, BladeOwners, Catalog, MemberState } from "../types/common"
import { canPickFromTeam } from "./availability"

/** Query context for blade criteria — consumers never touch SQL. */
export type CriterionContext = {
  catalog: Catalog
  driver: string
  blade: BladeInfo
  owners: BladeOwners
}

/**
 * Labeled Predicate — Boolean algebra via Predicate.every / some / not.
 * Combine into richer criteria without writing new SQL.
 */
export type Criterion = {
  readonly label: string
  readonly predicate: Predicate.Predicate<CriterionContext>
}

export const criterion = (
  label: string,
  predicate: Predicate.Predicate<CriterionContext>,
): Criterion => ({ label, predicate })

export const pass: Criterion = criterion("pass", () => true)

export const and = (...xs: Criterion[]): Criterion => {
  if (xs.length === 0)
    return pass
  if (xs.length === 1)
    return xs[0]!
  return criterion(
    `and(${xs.map(c => c.label).join(", ")})`,
    Predicate.every(xs.map(c => c.predicate)),
  )
}

export const or = (...xs: Criterion[]): Criterion => {
  if (xs.length === 0)
    return pass
  if (xs.length === 1)
    return xs[0]!
  return criterion(
    `or(${xs.map(c => c.label).join(", ")})`,
    Predicate.some(xs.map(c => c.predicate)),
  )
}

export const not = (c: Criterion): Criterion =>
  criterion(`not(${c.label})`, Predicate.not(c.predicate))

export const eligible: Criterion = criterion("eligible", ctx =>
  ctx.catalog.isEligible(ctx.driver, ctx.blade.name, ctx.owners))

export const onRole: Criterion = criterion("onRole", ctx =>
  ctx.catalog.isOnRole(ctx.driver, ctx.blade.name))

export const notFixed: Criterion = criterion("notFixed", ctx =>
  !ctx.catalog.isFixed(ctx.driver, ctx.blade.name))

export const notNamed = (blocked: ReadonlySet<string>): Criterion =>
  criterion(`notNamed(${blocked.size})`, ctx => !blocked.has(ctx.blade.name))

/** Unused blades, plus unique blades Rex can take or the dedicated driver can return. */
export const availableFromState = (
  members: readonly MemberState[],
  heldByDriver: readonly (string | null)[],
): Criterion =>
  criterion("availableFromState", ctx =>
    canPickFromTeam(ctx.catalog, ctx.driver, ctx.blade.name, members, heldByDriver))

export const allowName = (name: string | null): Criterion =>
  name
    ? criterion(`allowName(${name})`, ctx => ctx.blade.name === name)
    : criterion("allowName(none)", () => false)

export const niaBladeOk = (niaDriverTaken: boolean): Criterion =>
  criterion(`niaBladeOk(${niaDriverTaken})`, ctx => !(niaDriverTaken && ctx.blade.name === "nia"))

/** Empty list = no restriction (SQL WHERE 1=1). */
export const anyElement = (elements: readonly string[]): Criterion =>
  elements.length === 0
    ? pass
    : criterion(`anyElement(${elements.join("|")})`, ctx =>
      ctx.blade.elements.some(el => elements.includes(el)))

export const anyWeapon = (weapons: readonly string[]): Criterion =>
  weapons.length === 0
    ? pass
    : criterion(`anyWeapon(${weapons.join("|")})`, ctx =>
      weapons.includes(ctx.blade.weaponName))

export const anyEffect = (effects: readonly string[]): Criterion =>
  effects.length === 0
    ? pass
    : criterion(`anyEffect(${effects.join("|")})`, ctx => {
      const have = ctx.catalog.effectsOf(ctx.driver, ctx.blade.name)
      return effects.some(eff => have.includes(eff))
    })

export const manualPick: Criterion = eligible

/** Solver default: eligible + on-role. Own unused fixed blades stay pickable so Rex can return a stolen blade. */
export const solverPick: Criterion = and(eligible, onRole)

export const uiFilters = (filter: {
  elements: readonly string[]
  weapons: readonly string[]
  effects: readonly string[]
}): Criterion => and(anyElement(filter.elements), anyWeapon(filter.weapons), anyEffect(filter.effects))

/**
 * List-in-Effect query monad: `fromBlades ▹ where ▹ run`.
 * Keeps a uniform Effect boundary for logging/tracing; views stay sync consumers.
 */
export type BladeQuery = Effect.Effect<ReadonlyArray<BladeInfo>>

export const fromBlades = (blades: readonly BladeInfo[]): BladeQuery =>
  Effect.succeed(blades)

export const where =
  (base: Omit<CriterionContext, "blade">, criteria: Criterion) =>
  (query: BladeQuery): BladeQuery =>
    Effect.map(query, Arr.filter(blade => criteria.predicate({ ...base, blade })))

export const selectBlades = (
  blades: readonly BladeInfo[],
  base: Omit<CriterionContext, "blade">,
  criteria: Criterion,
): BladeInfo[] =>
  pipe(fromBlades(blades), where(base, criteria), Effect.runSync) as BladeInfo[]

export const matchesBlade = (
  base: Omit<CriterionContext, "blade">,
  blade: BladeInfo,
  criteria: Criterion,
): boolean =>
  criteria.predicate({ ...base, blade })
