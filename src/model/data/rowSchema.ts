import { Schema } from "effect"

/** SQL row shapes for `pnpm catalog`. Client code only type-imports `RawCatalog`. */

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
  aux_core_slots: Schema.Number,
  can_change_element: Schema.Boolean,
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

export type DriverRow = typeof DriverRowSchema.Type
export type BladeRow = typeof BladeRowSchema.Type
export type BindRow = typeof BindRowSchema.Type
export type EffectRow = typeof EffectRowSchema.Type
export type ExcludeRow = typeof ExcludeRowSchema.Type
export type WeaponRow = typeof WeaponRowSchema.Type
export type ChainRow = typeof ChainRowSchema.Type
export type PouchCategoryRow = typeof PouchCategoryRowSchema.Type
export type FavoriteCategoryRow = typeof FavoriteCategoryRowSchema.Type
export type FavoriteItemRow = typeof FavoriteItemRowSchema.Type
export type ForeignBlockedRow = typeof ForeignBlockedRowSchema.Type

export const RawCatalogSchema = Schema.Struct({
  drivers: Schema.Array(DriverRowSchema),
  blades: Schema.Array(BladeRowSchema),
  binds: Schema.Array(BindRowSchema),
  effects: Schema.Array(EffectRowSchema),
  excludes: Schema.Array(ExcludeRowSchema),
  foreignBlocked: Schema.Array(Schema.String),
  weapons: Schema.Array(WeaponRowSchema),
  elementChains: Schema.Array(ChainRowSchema),
  pouchCategories: Schema.Array(PouchCategoryRowSchema),
  favoriteCategories: Schema.Array(FavoriteCategoryRowSchema),
  favoriteItems: Schema.Array(FavoriteItemRowSchema),
})

export type RawCatalog = typeof RawCatalogSchema.Type

