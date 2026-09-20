export type DriverRow = { id: number; name: string; role: string; can_use_foreign: boolean }

export type BladeRow = {
  id: number
  name: string
  weapon: string
  weapon_role: string
  element1: string
  element2: string | null
  advanced_new_game: boolean
  aux_core_slots: number
}

export type BindRow = { blade: string; driver: string; is_fixed: boolean }
export type EffectRow = { driver: string; weapon: string; effect: string }
export type ExcludeRow = { blade: string; driver: string }
export type WeaponRow = { name: string; role: string }
export type ChainRow = { element1: string; element2: string; element3: string }
export type PouchCategoryRow = { name: string; buff_key: string }

export type FavoriteCategoryRow = {
  owner_type: 'driver' | 'blade'
  owner_name: string
  persona: string
  category: string
  buff_key: string
  sort_order: number
}

export type FavoriteItemRow = {
  owner_type: 'driver' | 'blade'
  owner_name: string
  persona: string
  item: string
  category: string
  sort_order: number
}
