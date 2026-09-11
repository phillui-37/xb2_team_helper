import { PGlite } from "@electric-sql/pglite";
import constant from "../ui/misc/constant";
import { Opt, TBlade, ValueOf } from "../types/common";
import initSql from "../db/init_db.sql?raw";
import getFixedBladeByDriverSql from '../db/get_fixed_blade_by_driver.sql?raw'
import getBladeAttrByDriverAndBladeSql from '../db/get_blade_attr_by_driver_and_blade.sql?raw'

export default class DB {
  private static instance: DB | undefined
  static getInstance() {
    if (!this.instance)
      this.instance = new DB(initSql)
    return this.instance
  }

  private readonly db: PGlite
  constructor(private readonly initScript: string) {
    this.db = new PGlite()
    this.db.exec(initScript)
      .then(ret => console.log('db init done, detail: ', ret))
      .catch(err => console.error(err))
  }

  query = <R>(sql: string, params?: any[]) => this.db.query<R>(sql, params)

  getFixedBladeByDriver = (driver: ValueOf<typeof constant.DRIVER>) => {
    return this.query<{
      driver: ValueOf<typeof constant.DRIVER>
      blades: ValueOf<typeof constant.BLADE>[]
    }>(getFixedBladeByDriverSql, [driver]).then(result => result.rows)
  }

  getBladeAttrByDriverAndBlade = (
    blade: ValueOf<typeof constant.BLADE>,
    driver: ValueOf<typeof constant.DRIVER>,
  ): Promise<Opt<Omit<TBlade, 'isBind'>>> => {
    return this.query<{
      blade: ValueOf<typeof constant.BLADE>
      weapon: ValueOf<typeof constant.WEAPON>
      element1: ValueOf<typeof constant.ELEMENT>
      element2: Opt<ValueOf<typeof constant.ELEMENT>>
      effects: string // join by ','
    }>(getBladeAttrByDriverAndBladeSql, [driver, blade]).then(result => {
      const entry = result.rows[0]
      if (!entry) return entry
      return {
        name: entry.blade,
        elements: [entry.element1, entry.element2].filter(x => !!x),
        weapon: entry.weapon,
        effects: entry.effects.split(',') as ValueOf<typeof constant.EFFECT>[]
      }
    })
  }
}