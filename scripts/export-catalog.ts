import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { PGlite } from "@electric-sql/pglite"
import { Schema } from "effect"
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
  RawCatalogSchema,
  WeaponRowSchema,
  type RawCatalog,
} from "../src/model/data/rowSchema.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const dbDir = join(root, "src/db")
export const catalogJsonPath = join(root, "src/model/data/catalog.json")

const sqlFile = (name: string): string =>
  readFileSync(join(dbDir, name), "utf8")

const query = async <S extends Schema.ConstraintDecoder<unknown>>(
  db: PGlite,
  file: string,
  schema: S,
): Promise<Array<S["Type"]>> => {
  const result = await db.query(sqlFile(file))
  return result.rows.map(row => Schema.decodeUnknownSync(schema)(row))
}

export async function loadRawCatalog(): Promise<RawCatalog> {
  const db = new PGlite()
  await db.exec(sqlFile("init_db.sql"))
  await db.exec(sqlFile("pouch_gifts.sql"))
  const raw: RawCatalog = {
    drivers: await query(db, "get_drivers.sql", DriverRowSchema),
    blades: await query(db, "get_blades.sql", BladeRowSchema),
    binds: await query(db, "get_binds.sql", BindRowSchema),
    effects: await query(db, "get_driver_weapon_effects.sql", EffectRowSchema),
    excludes: await query(db, "get_blade_driver_excludes.sql", ExcludeRowSchema),
    foreignBlocked: (await query(db, "get_foreign_blocked_blades.sql", ForeignBlockedRowSchema))
      .map(row => row.blade),
    weapons: await query(db, "get_weapons.sql", WeaponRowSchema),
    elementChains: await query(db, "get_element_chains.sql", ChainRowSchema),
    pouchCategories: await query(db, "get_pouch_categories.sql", PouchCategoryRowSchema),
    favoriteCategories: await query(db, "get_favorite_categories.sql", FavoriteCategoryRowSchema),
    favoriteItems: await query(db, "get_favorite_items.sql", FavoriteItemRowSchema),
  }
  await db.close()
  return Schema.decodeUnknownSync(RawCatalogSchema)(raw)
}

export async function exportCatalog(outPath = catalogJsonPath): Promise<string> {
  const raw = await loadRawCatalog()
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(raw, null, 2)}\n`)
  return outPath
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isCli) {
  exportCatalog()
    .then(path => {
      console.log(`wrote ${path}`)
    })
    .catch(err => {
      console.error(err)
      process.exitCode = 1
    })
}
