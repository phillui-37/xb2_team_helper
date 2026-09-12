import { Effect } from "effect"
import type { BladeInfo, BladeOwners, Catalog } from "../types/common"

/** Query context for blade criteria — consumers never touch SQL. */
export type CriterionContext = {
  catalog: Catalog
  driver: string
  blade: BladeInfo
  owners: BladeOwners
}

/**
 * Composable LINQ-style Where predicate.
 * Combine with `and` / `or` / `not` to build richer criteria without new SQL.
 */
export type Criterion = {
  readonly label: string
  readonly test: (ctx: CriterionContext) => boolean
}

export const criterion = (label: string, test: (ctx: CriterionContext) => boolean): Criterion => ({
  label,
  test,
})

export const pass: Criterion = criterion("pass", () => true)

export const and = (...xs: Criterion[]): Criterion => {
  if (xs.length === 0)
    return pass
  if (xs.length === 1)
    return xs[0]!
  return criterion(`and(${xs.map(c => c.label).join(", ")})`, ctx => xs.every(c => c.test(ctx)))
}

export const or = (...xs: Criterion[]): Criterion => {
  if (xs.length === 0)
    return pass
  if (xs.length === 1)
    return xs[0]!
  return criterion(`or(${xs.map(c => c.label).join(", ")})`, ctx => xs.some(c => c.test(ctx)))
}

export const not = (c: Criterion): Criterion =>
  criterion(`not(${c.label})`, ctx => !c.test(ctx))

/** Driver may equip this blade under ownership / bind rules. */
export const eligible: Criterion = criterion("eligible", ctx =>
  ctx.catalog.isEligible(ctx.driver, ctx.blade.name, ctx.owners))

export const onRole: Criterion = criterion("onRole", ctx =>
  ctx.catalog.isOnRole(ctx.driver, ctx.blade.name))

export const notFixed: Criterion = criterion("notFixed", ctx =>
  !ctx.catalog.isFixed(ctx.driver, ctx.blade.name))

export const notNamed = (blocked: ReadonlySet<string>): Criterion =>
  criterion(`notNamed(${blocked.size})`, ctx => !blocked.has(ctx.blade.name))

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

/** Manual team picker base: eligible only. */
export const manualPick: Criterion = eligible

/** Solver fill base: eligible + on-role + not fixed. */
export const solverPick: Criterion = and(eligible, onRole, notFixed)

/** UI filter strip (elements / weapons / effects). */
export const uiFilters = (filter: {
  elements: readonly string[]
  weapons: readonly string[]
  effects: readonly string[]
}): Criterion => and(anyElement(filter.elements), anyWeapon(filter.weapons), anyEffect(filter.effects))

/**
 * Execute a criteria pipeline via Effect.sync for a uniform data-plane boundary
 * (logging / tracing can hook here later without touching views).
 */
export const selectBlades = (
  blades: readonly BladeInfo[],
  base: Omit<CriterionContext, "blade">,
  criteria: Criterion,
): BladeInfo[] =>
  Effect.runSync(Effect.sync(() => {
    const out: BladeInfo[] = []
    for (const blade of blades) {
      if (criteria.test({ ...base, blade }))
        out.push(blade)
    }
    return out
  }))

export const matchesBlade = (
  base: Omit<CriterionContext, "blade">,
  blade: BladeInfo,
  criteria: Criterion,
): boolean =>
  Effect.runSync(Effect.sync(() => criteria.test({ ...base, blade })))
