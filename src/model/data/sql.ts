import { Context, Effect, Layer, Schema } from "effect"
import { PGlite } from "@electric-sql/pglite"
import initSql from "../../db/init_db.sql?raw"
import pouchGiftsSql from "../../db/pouch_gifts.sql?raw"
import { RowDecodeError, SqlQueryError, SqlSeedError } from "./errors"

export class Sql extends Context.Tag("xb2/Sql")<Sql, {
  readonly seed: Effect.Effect<void, SqlSeedError>
  readonly query: <A>(
    table: string,
    sql: string,
    schema: Schema.Schema<A>,
  ) => Effect.Effect<A[], SqlQueryError | RowDecodeError>
}>() {}

export const SqlLive = Layer.sync(Sql, () => {
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

  const query = <A>(
    table: string,
    sql: string,
    schema: Schema.Schema<A>,
  ): Effect.Effect<A[], SqlQueryError | RowDecodeError> =>
    Effect.gen(function* () {
      const result = yield* Effect.tryPromise({
        try: () => db.query(sql),
        catch: cause => new SqlQueryError({ sql: table, cause }),
      })
      const rows: A[] = []
      for (const row of result.rows) {
        rows.push(yield* Schema.decodeUnknown(schema)(row).pipe(
          Effect.mapError(cause => new RowDecodeError({ table, cause })),
        ))
      }
      return rows
    })

  return { seed, query }
})
