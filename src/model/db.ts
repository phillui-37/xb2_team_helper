import { PGlite } from "@electric-sql/pglite"
import initSql from "../db/init_db.sql?raw"
import translationsSql from "../db/translations.sql?raw"
import type { Catalog } from "../types/common"
import { buildCatalog } from "./catalog"

type DriverRow = { id: number; name: string; role: string }
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
type TranslationRow = { translation_key: string; language: string; translated_text: string }

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
    this.ready = this.db.exec(initSql)
      .then(() => this.db.exec(translationsSql))
      .then(() => undefined)
  }

  async getCatalog(): Promise<Catalog> {
    if (this.catalog)
      return this.catalog
    await this.ready
    const [drivers, blades, binds, effects, translations] = await Promise.all([
      this.db.query<DriverRow>(`
        SELECT d.id, d.name, r.name AS role
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
      this.db.query<TranslationRow>(`
        SELECT translation_key, language, translated_text
        FROM translation
      `),
    ])
    this.catalog = buildCatalog({
      drivers: drivers.rows,
      blades: blades.rows,
      binds: binds.rows,
      effects: effects.rows,
      translations: translations.rows,
    })
    return this.catalog
  }
}
