import { match, P } from "ts-pattern"
import { Tab, Tabs, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import { loadCatalog } from "../../model/data/loadCatalog"
import type { Catalog, Language } from "../../types/common"
import { LANGUAGES, useI18n } from "../i18n/LanguageContext"
import { useAppSession } from "../state/useAppSession"
import AssignPage from "./AssignPage"
import TeamPage from "./TeamPage"
import WikiPage from "./wiki/WikiPage"

function readCatalog(): { catalog: Catalog } | { error: string } {
  try {
    return { catalog: loadCatalog() }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export default function MainPage() {
  return match(readCatalog())
    .with({ error: P.string }, ({ error }) => (
      <div className="p-app text-red-700">{error}</div>
    ))
    .otherwise(({ catalog }) => (
      <AppShell catalog={catalog} />
    ))
}

function AppShell(props: { catalog: Catalog }) {
  const { t, lang, setLang } = useI18n()
  const session = useAppSession(props.catalog)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 p-app">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Typography variant="h5">{t("ui.title")}</Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={lang}
          onChange={(_event, value: Language | null) => {
            if (value)
              setLang(value)
          }}
        >
          {LANGUAGES.map(item => (
            <ToggleButton key={item.id} value={item.id}>{item.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </header>

      <Tabs
        value={session.tab}
        onChange={(_event, value: typeof session.tab) => session.setTab(value)}
      >
        <Tab value="team" label={t("ui.tabTeam")} />
        <Tab value="assign" label={t("ui.tabAssign")} />
        <Tab value="wiki" label={t("ui.tabWiki")} />
      </Tabs>

      {match(session.tab)
        .with("team", () => (
          <TeamPage session={session} />
        ))
        .with("assign", () => (
          <AssignPage
            catalog={session.catalog}
            owners={session.owners}
            advancedNewGame={session.advancedNewGame}
            onAdvancedNewGameChange={session.updateAdvancedNewGame}
            onChange={session.updateOwners}
          />
        ))
        .with("wiki", () => (
          <WikiPage catalog={session.catalog} />
        ))
        .exhaustive()}
    </div>
  )
}
