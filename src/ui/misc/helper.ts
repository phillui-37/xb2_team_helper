import { TMember, ValueOf } from "../../types/common";
import constant from "./constant";

export const getMemberAttr = (member: TMember) => {
  const effects: Record<ValueOf<typeof constant.EFFECT>, number> = {
    [constant.EFFECT.BREAK]: 0,
    [constant.EFFECT.TOPPLE]: 0,
    [constant.EFFECT.LAUNCH]: 0,
    [constant.EFFECT.SMASH]: 0,
  }
  const elements = new Set<ValueOf<typeof constant.ELEMENT>>()

  member.blades.forEach(blade => {
    if (!blade) return
    blade.effects.forEach(eff => effects[eff]++)
    blade.elements.forEach(elements.add)
  })

  return {
    effects,
    elements: Array.from(elements),
  }
}