import { Data } from "effect"

export class CatalogBuildError extends Data.TaggedError("CatalogBuildError")<{
  readonly cause: unknown
}> {}
