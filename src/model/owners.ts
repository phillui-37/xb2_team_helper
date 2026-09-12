import { Effect, Option, Schema, pipe } from "effect"
import type { BladeOwners, Catalog, MemberState, SlotName } from "../types/common"
import { OwnersJsonSchema } from "./data/rowSchema"

const STORAGE_KEY = 'xb2-blade-owners'

export const emptyOwners = (): Map<string, string> => new Map()

const parseOwnersJson = (raw: string): Effect.Effect<Record<string, string>> =>
  pipe(
    Effect.try(() => JSON.parse(raw) as unknown),
    Effect.flatMap(unknown =>
      Effect.try({
        try: () => Schema.decodeUnknownSync(OwnersJsonSchema)(unknown),
        catch: () => new Error("owners-schema"),
      }),
    ),
    Effect.orElseSucceed(() => ({}) as Record<string, string>),
  )

const acceptOwner = (catalog: Catalog, blade: string, driver: string): boolean =>
  !catalog.isAssignmentLocked(blade)
  && catalog.bladeByName.has(blade)
  && catalog.driverByName.has(driver)
  && catalog.assignableDrivers(blade).includes(driver)

export const readOwners = (catalog: Catalog): Map<string, string> =>
  pipe(
    Effect.sync(() => Option.fromNullishOr(localStorage.getItem(STORAGE_KEY))),
    Effect.flatMap(Option.match({
      onNone: () => Effect.succeed({} as Record<string, string>),
      onSome: parseOwnersJson,
    })),
    Effect.map(decoded => {
      const owners = emptyOwners()
      for (const [blade, driver] of Object.entries(decoded)) {
        if (acceptOwner(catalog, blade, driver))
          owners.set(blade, driver)
      }
      return owners
    }),
    Effect.runSync,
  )

export const storeOwners = (owners: BladeOwners): void => {
  Effect.runSync(Effect.ignore(Effect.try(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(owners)))
  })))
}

export const sanitizeMembers = (
  catalog: Catalog,
  members: MemberState[],
  owners: BladeOwners,
): MemberState[] =>
  members.map(member => {
    if (!member.driver)
      return member
    const driver = member.driver
    const blades = member.blades.map(blade => {
      if (!blade)
        return blade
      if (catalog.isFixed(driver, blade))
        return blade
      return catalog.isEligible(driver, blade, owners) ? blade : null
    }) as [SlotName, SlotName, SlotName]
    return { driver, blades }
  })
