import { match, P } from "ts-pattern"
import type { BladeInfo, BladeOwners, Catalog, MemberState } from "../types/common"
import { DRIVER_NIA } from "../types/common"
import { canPickFromTeam } from "./availability"

/** Query context for blade criteria — consumers never touch SQL. */
export type CriterionContext = {
  catalog: Catalog
  driver: string
  blade: BladeInfo
  owners: BladeOwners
}

export type Criterion = {
  readonly label: string
  readonly predicate: (ctx: CriterionContext) => boolean
}

export const criterion = (
  label: string,
  predicate: (ctx: CriterionContext) => boolean,
): Criterion => ({ label, predicate })

export const pass: Criterion = criterion("pass", () => true)

const combine = (
  kind: "and" | "or",
  join: (ctx: CriterionContext, preds: Criterion[]) => boolean,
  xs: Criterion[],
): Criterion =>
  match(xs)
    .with([], () => pass)
    .with([P.select()], c => c)
    .otherwise(all =>
      criterion(`${kind}(${all.map(c => c.label).join(", ")})`, ctx => join(ctx, all)),
    )

export const and = (...xs: Criterion[]): Criterion =>
  combine("and", (ctx, all) => all.every(c => c.predicate(ctx)), xs)

export const or = (...xs: Criterion[]): Criterion =>
  combine("or", (ctx, all) => all.some(c => c.predicate(ctx)), xs)

export const not = (c: Criterion): Criterion =>
  criterion(`not(${c.label})`, ctx => !c.predicate(ctx))

export const eligible: Criterion = criterion("eligible", ctx =>
  ctx.catalog.isEligible(ctx.driver, ctx.blade.name, ctx.owners))

export const onRole: Criterion = criterion("onRole", ctx =>
  ctx.catalog.isOnRole(ctx.driver, ctx.blade.name))

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
  criterion(`niaBladeOk(${niaDriverTaken})`, ctx => !(niaDriverTaken && ctx.blade.name === DRIVER_NIA))

/** NG+ blades are hidden unless Advanced New Game is on. */
export const advancedNewGameOk = (enabled: boolean): Criterion =>
  criterion(`advancedNewGameOk(${enabled})`, ctx => !ctx.blade.advancedNewGame || enabled)

/** Empty list = no restriction. */
const restrict = (
  items: readonly string[],
  label: string,
  pred: (ctx: CriterionContext, items: readonly string[]) => boolean,
): Criterion =>
  match(items)
    .with([], () => pass)
    .otherwise(xs => criterion(`${label}(${xs.join("|")})`, ctx => pred(ctx, xs)))

export const anyElement = (elements: readonly string[]): Criterion =>
  restrict(elements, "anyElement", (ctx, xs) =>
    ctx.blade.elements.some(el => xs.includes(el)))

export const anyWeapon = (weapons: readonly string[]): Criterion =>
  restrict(weapons, "anyWeapon", (ctx, xs) =>
    xs.includes(ctx.blade.weaponName))

export const anyEffect = (effects: readonly string[]): Criterion =>
  restrict(effects, "anyEffect", (ctx, xs) => {
    const have = ctx.catalog.effectsOf(ctx.driver, ctx.blade.name)
    return xs.some(eff => have.includes(eff))
  })

/** Solver default: eligible + on-role. Own unused fixed blades stay pickable so Rex can return a stolen blade. */
export const solverPick: Criterion = and(eligible, onRole)

export const uiFilters = (filter: {
  elements: readonly string[]
  weapons: readonly string[]
  effects: readonly string[]
}): Criterion => and(anyElement(filter.elements), anyWeapon(filter.weapons), anyEffect(filter.effects))

export const selectBlades = (
  blades: readonly BladeInfo[],
  base: Omit<CriterionContext, "blade">,
  criteria: Criterion,
): BladeInfo[] =>
  blades.filter(blade => criteria.predicate({ ...base, blade }))
