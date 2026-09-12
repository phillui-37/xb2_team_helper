import type { Catalog } from "../../../types/common"
import type { ComponentType } from "react"
import BladeGiftsSection from "./BladeGiftsSection"
import ElementChainSection from "./ElementChainSection"
import WeaponEffectsSection from "./WeaponEffectsSection"

export type WikiSectionId = 'weapon-effects' | 'element-chain' | 'blade-gifts'

export type WikiSection = {
  id: WikiSectionId
  labelKey: string
  Page: ComponentType<{ catalog: Catalog }>
}

export const WIKI_SECTIONS: readonly WikiSection[] = [
  { id: 'weapon-effects', labelKey: 'ui.wikiWeaponEffects', Page: WeaponEffectsSection },
  { id: 'element-chain', labelKey: 'ui.wikiElementChain', Page: ElementChainSection },
  { id: 'blade-gifts', labelKey: 'ui.wikiBladeGifts', Page: BladeGiftsSection },
]
