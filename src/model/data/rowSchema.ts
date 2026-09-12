import { Schema } from "effect"
import type {
  BladeRow,
  BindRow,
  ChainRow,
  DriverRow,
  EffectRow,
  ExcludeRow,
  FavoriteCategoryRow,
  FavoriteItemRow,
  PouchCategoryRow,
  WeaponRow,
} from "../../types/dbRows"

export const DriverRowSchema: Schema.Schema<DriverRow> = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  role: Schema.String,
  can_use_foreign: Schema.Boolean,
})

export const BladeRowSchema: Schema.Schema<BladeRow> = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  weapon: Schema.String,
  weapon_role: Schema.String,
  element1: Schema.String,
  element2: Schema.NullOr(Schema.String),
})

export const BindRowSchema: Schema.Schema<BindRow> = Schema.Struct({
  blade: Schema.String,
  driver: Schema.String,
  is_fixed: Schema.Boolean,
})

export const EffectRowSchema: Schema.Schema<EffectRow> = Schema.Struct({
  driver: Schema.String,
  weapon: Schema.String,
  effect: Schema.String,
})

export const ExcludeRowSchema: Schema.Schema<ExcludeRow> = Schema.Struct({
  blade: Schema.String,
  driver: Schema.String,
})

export const WeaponRowSchema: Schema.Schema<WeaponRow> = Schema.Struct({
  name: Schema.String,
  role: Schema.String,
})

export const ChainRowSchema: Schema.Schema<ChainRow> = Schema.Struct({
  element1: Schema.String,
  element2: Schema.String,
  element3: Schema.String,
})

export const PouchCategoryRowSchema: Schema.Schema<PouchCategoryRow> = Schema.Struct({
  name: Schema.String,
  buff_key: Schema.String,
})

export const FavoriteCategoryRowSchema: Schema.Schema<FavoriteCategoryRow> = Schema.Struct({
  owner_type: Schema.Literal("driver", "blade"),
  owner_name: Schema.String,
  persona: Schema.String,
  category: Schema.String,
  buff_key: Schema.String,
  sort_order: Schema.Number,
})

export const FavoriteItemRowSchema: Schema.Schema<FavoriteItemRow> = Schema.Struct({
  owner_type: Schema.Literal("driver", "blade"),
  owner_name: Schema.String,
  persona: Schema.String,
  item: Schema.String,
  category: Schema.String,
  sort_order: Schema.Number,
})

export const ForeignBlockedRowSchema = Schema.Struct({
  blade: Schema.String,
})

export const OwnersJsonSchema = Schema.Record({ key: Schema.String, value: Schema.String })
