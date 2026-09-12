import { Data } from "effect"

export class SqlSeedError extends Data.TaggedError("SqlSeedError")<{
  readonly cause: unknown
}> {}

export class SqlQueryError extends Data.TaggedError("SqlQueryError")<{
  readonly sql: string
  readonly cause: unknown
}> {}

export class RowDecodeError extends Data.TaggedError("RowDecodeError")<{
  readonly table: string
  readonly cause: unknown
}> {}

export class CatalogBuildError extends Data.TaggedError("CatalogBuildError")<{
  readonly cause: unknown
}> {}

export type DataLoadError =
  | SqlSeedError
  | SqlQueryError
  | RowDecodeError
  | CatalogBuildError
