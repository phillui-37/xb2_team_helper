import { Context, Effect, Layer, Schema } from "effect"
import { PGlite } from "@electric-sql/pglite"
import initSql from "../../db/init_db.sql?raw"
import pouchGiftsSql from "../../db/pouch_gifts.sql?raw"
import { RowDecodeError, SqlQueryError, SqlSeedError } from "./errors"

export interface SqlService {
  readonly seed: Effect.Effect<void, SqlSeedError>
  readonly query: <S extends Schema.ConstraintDecoder<unknown>>(
    table: string,
    sql: string,
    schema: S,
  ) => Effect.Effect<Array<S["Type"]>, SqlQueryError | RowDecodeError>
}

export class Sql extends Context.Service<Sql, SqlService>()("xb2/Sql") {}

export const SqlLive = Layer.sync(Sql, (): SqlService => {
  const db = new PGlite()
  let seeded = false

  const seed: Effect.Effect<void, SqlSeedError> = Effect.tryPromise({
    try: async () => {
      if (seeded)
        return
      await db.exec(initSql)
      await db.exec(pouchGiftsSql)
      seeded = true
    },
    catch: cause => new SqlSeedError({ cause }),
  })

  const query = <S extends Schema.ConstraintDecoder<unknown>>(
    table: string,
    sql: string,
    schema: S,
  ): Effect.Effect<Array<S["Type"]>, SqlQueryError | RowDecodeError> =>
    Effect.gen(function* () {
      const result = yield* Effect.tryPromise({
        try: () => db.query(sql),
        catch: cause => new SqlQueryError({ sql: table, cause }),
      })
      return yield* Effect.forEach(result.rows, row =>
        Effect.try({
          try: () => Schema.decodeUnknownSync(schema)(row),
          catch: cause => new RowDecodeError({ table, cause }),
        }),
      )
    })

  return { seed, query }
})
