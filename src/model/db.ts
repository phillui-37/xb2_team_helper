import { loadCatalogPromise } from "./data/loadCatalog"
import type { Catalog } from "../types/common"

/**
 * Thin façade over the Effect data plane (Sql → Schema → Catalog projection).
 * Views keep calling this; they stay transparent to Effect / SQL.
 */
export default class DB {
  private static instance: DB | undefined
  static getInstance() {
    if (!this.instance)
      this.instance = new DB()
    return this.instance
  }

  private catalog: Catalog | undefined

  async getCatalog(): Promise<Catalog> {
    if (this.catalog)
      return this.catalog
    this.catalog = await loadCatalogPromise()
    return this.catalog
  }
}
