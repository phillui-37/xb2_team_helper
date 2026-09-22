import type { Catalog } from "../../types/common"
import { buildCatalog } from "../catalog"
import catalogJson from "./catalog.json"
import type { RawCatalog } from "./rowSchema"

let cached: Catalog | undefined

/** Project the build-time SQL snapshot. Rows are Schema-checked in `pnpm catalog`. */
export function loadCatalog(): Catalog {
  if (!cached)
    cached = buildCatalog(catalogJson as RawCatalog)
  return cached
}
