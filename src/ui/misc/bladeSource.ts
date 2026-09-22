import { match } from "ts-pattern"
import type { BladeSource } from "../../types/common"

export const sourceLabelKey = (source: BladeSource) =>
  match(source)
    .with('FIXED', () => 'ui.sourceFixed')
    .with('BINDED', () => 'ui.sourceBinded')
    .with('FREE', () => 'ui.sourceFree')
    .exhaustive()
