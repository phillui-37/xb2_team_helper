import { PGlite } from "@electric-sql/pglite"
import initSql from "../db/init_db.sql?raw"
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
    this.ready = this.db.exec(initSql).then(() => undefined)
  }

  async getCatalog(): Promise<Catalog> {
    if (this.catalog)
      return this.catalog
    await this.ready
    const [drivers, blades, binds, effects, excludes, foreignBlocked] = await Promise.all([
      this.db.query<DriverRow>(`
        SELECT d.id, d.name, r.name AS role, d.can_use_foreign
        FROM driver d
        JOIN role r ON r.id = d.role_id
        ORDER BY d.id
      `),
      this.db.query<BladeRow>(`
        SELECT
          b.id,
          b.name,
          w.name AS weapon,
          wr.name AS weapon_role,
          e1.name AS element1,
          e2.name AS element2
        FROM blade b
        JOIN weapon w ON w.id = b.weapon_id
        JOIN role wr ON wr.id = w.role_id
        JOIN element e1 ON e1.id = b.element1_id
        LEFT JOIN element e2 ON e2.id = b.element2_id
        ORDER BY b.id
      `),
      this.db.query<BindRow>(`
        SELECT b.name AS blade, d.name AS driver, bbd.is_fixed
        FROM blade_bind_driver bbd
        JOIN blade b ON b.id = bbd.blade_id
        JOIN driver d ON d.id = bbd.driver_id
      `),
      this.db.query<EffectRow>(`
        SELECT d.name AS driver, w.name AS weapon, e.name AS effect
        FROM driver_weapon_effect dwe
        JOIN driver d ON d.id = dwe.driver_id
        JOIN weapon w ON w.id = dwe.weapon_id
        JOIN effect e ON e.id = dwe.effect_id
      `),
      this.db.query<ExcludeRow>(`
        SELECT b.name AS blade, d.name AS driver
        FROM blade_driver_exclude bde
        JOIN blade b ON b.id = bde.blade_id
        JOIN driver d ON d.id = bde.driver_id
      `),
      this.db.query<{ blade: string }>(`
        SELECT b.name AS blade
        FROM foreign_blade_exclude fbe
        JOIN blade b ON b.id = fbe.blade_id
      `),
    ])
    this.catalog = buildCatalog({
      drivers: drivers.rows,
      blades: blades.rows,
      binds: binds.rows,
      effects: effects.rows,
      excludes: excludes.rows,
      foreignBlocked: foreignBlocked.rows.map(r => r.blade),
    })
    return this.catalog
  }
}
