import { Effect } from "effect"
import getDriversSql from "../../db/get_drivers.sql?raw"
import getBladesSql from "../../db/get_blades.sql?raw"
import getBindsSql from "../../db/get_binds.sql?raw"
import getDriverWeaponEffectsSql from "../../db/get_driver_weapon_effects.sql?raw"
import getBladeDriverExcludesSql from "../../db/get_blade_driver_excludes.sql?raw"
import getForeignBlockedBladesSql from "../../db/get_foreign_blocked_blades.sql?raw"
import getWeaponsSql from "../../db/get_weapons.sql?raw"
import getElementChainsSql from "../../db/get_element_chains.sql?raw"
import getPouchCategoriesSql from "../../db/get_pouch_categories.sql?raw"
import getFavoriteCategoriesSql from "../../db/get_favorite_categories.sql?raw"
import getFavoriteItemsSql from "../../db/get_favorite_items.sql?raw"
import type { Catalog } from "../../types/common"
import { buildCatalog } from "../catalog"
import { CatalogBuildError, type DataLoadError } from "./errors"
import {
  BladeRowSchema,
  BindRowSchema,
  ChainRowSchema,
  DriverRowSchema,
  EffectRowSchema,
  ExcludeRowSchema,
  FavoriteCategoryRowSchema,
  FavoriteItemRowSchema,
  ForeignBlockedRowSchema,
  PouchCategoryRowSchema,
  WeaponRowSchema,
} from "./rowSchema"
import { Sql, SqlLive } from "./sql"

/** Sql source → Schema decode → Catalog projection. */
const projectCatalog = Effect.gen(function* () {
  const sql = yield* Sql
  yield* sql.seed

  const [
    drivers,
    blades,
    binds,
    effects,
    excludes,
    foreignBlocked,
    weapons,
    elementChains,
    pouchCategories,
    favoriteCategories,
    favoriteItems,
  ] = yield* Effect.all([
    sql.query("drivers", getDriversSql, DriverRowSchema),
    sql.query("blades", getBladesSql, BladeRowSchema),
    sql.query("binds", getBindsSql, BindRowSchema),
    sql.query("effects", getDriverWeaponEffectsSql, EffectRowSchema),
    sql.query("excludes", getBladeDriverExcludesSql, ExcludeRowSchema),
    sql.query("foreignBlocked", getForeignBlockedBladesSql, ForeignBlockedRowSchema),
    sql.query("weapons", getWeaponsSql, WeaponRowSchema),
    sql.query("elementChains", getElementChainsSql, ChainRowSchema),
    sql.query("pouchCategories", getPouchCategoriesSql, PouchCategoryRowSchema),
    sql.query("favoriteCategories", getFavoriteCategoriesSql, FavoriteCategoryRowSchema),
    sql.query("favoriteItems", getFavoriteItemsSql, FavoriteItemRowSchema),
  ], { concurrency: "unbounded" })

  return yield* Effect.try({
    try: () => buildCatalog({
      drivers,
      blades,
      binds,
      effects,
      excludes,
      foreignBlocked: foreignBlocked.map(r => r.blade),
      weapons,
      elementChains,
      pouchCategories,
      favoriteCategories,
      favoriteItems,
    }),
    catch: cause => new CatalogBuildError({ cause }),
  })
}).pipe(Effect.provide(SqlLive))

/**
 * Allocate the memo cell once; each `loadCatalog` run reuses the same inner Effect.
 * (Effect.cached alone would re-allocate if re-suspended each call.)
 */
export const loadCatalog: Effect.Effect<Catalog, DataLoadError> =
  Effect.runSync(Effect.cached(projectCatalog))

export const loadCatalogPromise = (): Promise<Catalog> =>
  Effect.runPromise(loadCatalog)
