import { PGlite } from "@electric-sql/pglite"
import initSql from "../db/init_db.sql?raw"
import pouchGiftsSql from "../db/pouch_gifts.sql?raw"
import getDriversSql from "../db/get_drivers.sql?raw"
import getBladesSql from "../db/get_blades.sql?raw"
import getBindsSql from "../db/get_binds.sql?raw"
import getDriverWeaponEffectsSql from "../db/get_driver_weapon_effects.sql?raw"
import getBladeDriverExcludesSql from "../db/get_blade_driver_excludes.sql?raw"
import getForeignBlockedBladesSql from "../db/get_foreign_blocked_blades.sql?raw"
import getWeaponsSql from "../db/get_weapons.sql?raw"
import getElementChainsSql from "../db/get_element_chains.sql?raw"
import getPouchCategoriesSql from "../db/get_pouch_categories.sql?raw"
import getFavoriteCategoriesSql from "../db/get_favorite_categories.sql?raw"
import getFavoriteItemsSql from "../db/get_favorite_items.sql?raw"
import type { Catalog } from "../types/common"
import { buildCatalog } from "./catalog"

type DriverRow = { id: number; name: string; role: string; can_use_foreign: boolean }
type BladeRow = {
  id: number
  name: string
  weapon: string
  weapon_role: string
  element1: string
  element2: string | null
}
type BindRow = { blade: string; driver: string; is_fixed: boolean }
type EffectRow = { driver: string; weapon: string; effect: string }
type ExcludeRow = { blade: string; driver: string }
type WeaponRow = { name: string; role: string }
type ChainRow = { element1: string; element2: string; element3: string }
type PouchCategoryRow = { name: string; buff_key: string }
type FavoriteCategoryRow = {
  owner_type: 'driver' | 'blade'
  owner_name: string
  persona: string
  category: string
  buff_key: string
  sort_order: number
}
type FavoriteItemRow = {
  owner_type: 'driver' | 'blade'
  owner_name: string
  persona: string
  item: string
  category: string
  sort_order: number
}

export default class DB {
  private static instance: DB | undefined
  static getInstance() {
    if (!this.instance)
      this.instance = new DB()
    return this.instance
  }

  private readonly db: PGlite
  readonly ready: Promise<void>
  private catalog: Catalog | undefined

  private constructor() {
    this.db = new PGlite()
    this.ready = this.db.exec(initSql).then(() => this.db.exec(pouchGiftsSql)).then(() => undefined)
  }

  async getCatalog(): Promise<Catalog> {
    if (this.catalog)
      return this.catalog
    await this.ready
    const [drivers, blades, binds, effects, excludes, foreignBlocked, weapons, elementChains, pouchCategories, favoriteCategories, favoriteItems] = await Promise.all([
      this.db.query<DriverRow>(getDriversSql),
      this.db.query<BladeRow>(getBladesSql),
      this.db.query<BindRow>(getBindsSql),
      this.db.query<EffectRow>(getDriverWeaponEffectsSql),
      this.db.query<ExcludeRow>(getBladeDriverExcludesSql),
      this.db.query<{ blade: string }>(getForeignBlockedBladesSql),
      this.db.query<WeaponRow>(getWeaponsSql),
      this.db.query<ChainRow>(getElementChainsSql),
      this.db.query<PouchCategoryRow>(getPouchCategoriesSql),
      this.db.query<FavoriteCategoryRow>(getFavoriteCategoriesSql),
      this.db.query<FavoriteItemRow>(getFavoriteItemsSql),
    ])
    this.catalog = buildCatalog({
      drivers: drivers.rows,
      blades: blades.rows,
      binds: binds.rows,
      effects: effects.rows,
      excludes: excludes.rows,
      foreignBlocked: foreignBlocked.rows.map(r => r.blade),
      weapons: weapons.rows,
      elementChains: elementChains.rows,
      pouchCategories: pouchCategories.rows,
      favoriteCategories: favoriteCategories.rows,
      favoriteItems: favoriteItems.rows,
    })
    return this.catalog
  }
}
