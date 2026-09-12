import { useState } from "react"
import { Tab, Tabs } from "@mui/material"
import type { Catalog } from "../../../types/common"
import { useI18n } from "../../i18n/LanguageContext"
import { WIKI_SECTIONS, type WikiSectionId } from "./sections"

const DEFAULT_SECTION = WIKI_SECTIONS[0]!

export default function WikiPage(props: { catalog: Catalog }) {
  const { t } = useI18n()
  const [section, setSection] = useState<WikiSectionId>(DEFAULT_SECTION.id)
  const active = WIKI_SECTIONS.find(item => item.id === section) ?? DEFAULT_SECTION
  const Page = active.Page

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={active.id}
        onChange={(_event, value: WikiSectionId) => setSection(value)}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        {WIKI_SECTIONS.map(item => (
          <Tab key={item.id} value={item.id} label={t(item.labelKey)} />
        ))}
      </Tabs>
      <Page catalog={props.catalog} />
    </div>
  )
}
