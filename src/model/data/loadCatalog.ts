import { Schema } from "effect"
import type { Catalog } from "../../types/common"
import { buildCatalog } from "../catalog"
import catalogJson from "./catalog.json"
import { CatalogBuildError } from "./errors"
import { RawCatalogSchema } from "./rowSchema"

let cached: Catalog | undefined

/** Decode the build-time SQL snapshot and project the in-memory catalog. */
export function loadCatalog(): Catalog {
  if (cached)
    return cached
  try {
    const raw = Schema.decodeUnknownSync(RawCatalogSchema)(catalogJson)
    cached = buildCatalog(raw)
    return cached
  } catch (cause) {
    throw new CatalogBuildError({ cause })
  }
}
