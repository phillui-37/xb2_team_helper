import { useEffect, useMemo, useState } from "react"
import { Button, Checkbox, CircularProgress, FormControlLabel, Tab, Tabs, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import DB from "../../model/db"
import { hasNiaBlade, hasNiaDriver, solve } from "../../model/solver"
import { readOwners, reconcileMembers, storeOwners } from "../../model/owners"
import type { Catalog, Language, MemberState, TeamResult } from "../../types/common"
import { LANGUAGES, useI18n } from "../i18n/LanguageContext"
import MemberColumn from "../components/MemberColumn"
import ResultList from "../components/ResultList"
import AssignPage from "./AssignPage"
import WikiPage from "./wiki/WikiPage"

const emptyMember = (): MemberState => ({
  driver: null,
  blades: [null, null, null],
  matchRole: true,
  borrowBound: true,
})

export default function MainPage() {
  const [catalog, setCatalog] = useState<Catalog | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    DB.getInstance().getCatalog()
      .then(setCatalog)
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  if (error)
    return <div className="p-6 text-red-700">{error}</div>
  if (!catalog)
    return <div className="flex min-h-screen items-center justify-center"><CircularProgress /></div>

  return <AppShell catalog={catalog} />
}

function AppShell(props: { catalog: Catalog }) {
  const { catalog } = props
  const { t, lang, setLang } = useI18n()
  const [tab, setTab] = useState(0)
  const [owners, setOwners] = useState<Map<string, string>>(() => readOwners(catalog))
  const [members, setMembers] = useState<MemberState[]>([emptyMember(), emptyMember(), emptyMember()])
  const [redundancy, setRedundancy] = useState(false)
  const [results, setResults] = useState<TeamResult[] | undefined>(undefined)
  const [calculating, setCalculating] = useState(false)

  const takenDrivers = useMemo(
    () => new Set(members.map(m => m.driver).filter((d): d is string => !!d)),
    [members],
  )
  const niaBladeTaken = hasNiaBlade(members)
  const niaDriverTaken = hasNiaDriver(members)
  const canCalculate = members.every(m => m.driver)

  const updateMember = (index: number, next: MemberState) => {
    setMembers(ori => reconcileMembers(
      catalog,
      ori.map((m, i) => i === index ? next : m),
      owners,
      index,
    ))
    setResults(undefined)
  }

  const updateOwners = (next: Map<string, string>) => {
    storeOwners(next)
    setOwners(next)
    setMembers(ori => reconcileMembers(catalog, ori, next))
    setResults(undefined)
  }

  const runCalculate = () => {
    if (!canCalculate)
      return
    setCalculating(true)
    setResults(undefined)
    window.setTimeout(() => {
      const found = solve(catalog, members, redundancy, owners)
      setResults(found)
      setCalculating(false)
    }, 0)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Typography variant="h5">{t('ui.title')}</Typography>
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
        value={tab}
        onChange={(_event, value: number) => setTab(value)}
      >
        <Tab label={t('ui.tabTeam')} />
        <Tab label={t('ui.tabAssign')} />
        <Tab label={t('ui.tabWiki')} />
      </Tabs>

      {tab === 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <FormControlLabel
              control={
                <Checkbox
                  checked={redundancy}
                  onChange={event => {
                    setRedundancy(event.target.checked)
                    setResults(undefined)
                  }}
                />
              }
              label={t('ui.redundancy')}
            />
            <Button
              variant="contained"
              onClick={runCalculate}
              disabled={!canCalculate || calculating}
            >
              {t('ui.calculate')}
            </Button>
            {!canCalculate && (
              <Typography variant="body2" color="text.secondary">{t('ui.selectDrivers')}</Typography>
            )}
            {calculating && <CircularProgress size={22} />}
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            {members.map((member, index) => (
              <MemberColumn
                key={index}
                catalog={catalog}
                index={index}
                state={member}
                members={members}
                owners={owners}
                takenDrivers={takenDrivers}
                niaBladeTaken={niaBladeTaken}
                niaDriverTaken={niaDriverTaken}
                onChange={next => updateMember(index, next)}
              />
            ))}
          </div>

          <section className="flex flex-col gap-2">
            <Typography variant="h6">{t('ui.results')}</Typography>
            {calculating && <Typography color="text.secondary">{t('ui.loading')}</Typography>}
            {results && <ResultList catalog={catalog} results={results} />}
          </section>
        </>
      )}

      {tab === 1 && (
        <AssignPage catalog={catalog} owners={owners} onChange={updateOwners} />
      )}

      {tab === 2 && (
        <WikiPage catalog={catalog} />
      )}
    </div>
  )
}
