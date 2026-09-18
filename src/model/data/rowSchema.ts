import { Schema } from "effect"

export const DriverRowSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  role: Schema.String,
  can_use_foreign: Schema.Boolean,
})

export const BladeRowSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  weapon: Schema.String,
  weapon_role: Schema.String,
  element1: Schema.String,
  element2: Schema.NullOr(Schema.String),
  advanced_new_game: Schema.Boolean,
})

export const BindRowSchema = Schema.Struct({
  blade: Schema.String,
  driver: Schema.String,
  is_fixed: Schema.Boolean,
})

export const EffectRowSchema = Schema.Struct({
  driver: Schema.String,
  weapon: Schema.String,
  effect: Schema.String,
})

export const ExcludeRowSchema = Schema.Struct({
  blade: Schema.String,
  driver: Schema.String,
})

export const WeaponRowSchema = Schema.Struct({
  name: Schema.String,
  role: Schema.String,
})

export const ChainRowSchema = Schema.Struct({
  element1: Schema.String,
  element2: Schema.String,
  element3: Schema.String,
})

export const PouchCategoryRowSchema = Schema.Struct({
  name: Schema.String,
  buff_key: Schema.String,
})

export const FavoriteCategoryRowSchema = Schema.Struct({
  owner_type: Schema.Literals(["driver", "blade"]),
  owner_name: Schema.String,
  persona: Schema.String,
  category: Schema.String,
  buff_key: Schema.String,
  sort_order: Schema.Number,
})

export const FavoriteItemRowSchema = Schema.Struct({
  owner_type: Schema.Literals(["driver", "blade"]),
  owner_name: Schema.String,
  persona: Schema.String,
  item: Schema.String,
  category: Schema.String,
  sort_order: Schema.Number,
})

export const ForeignBlockedRowSchema = Schema.Struct({
  blade: Schema.String,
})

/** v4 Record is positional: Record(keySchema, valueSchema). */
export const OwnersJsonSchema = Schema.Record(Schema.String, Schema.String)

