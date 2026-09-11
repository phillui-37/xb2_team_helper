import { useEffect, useMemo, useState } from "react"
import { Button, Checkbox, CircularProgress, FormControlLabel, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import DB from "../../model/db"
import { hasNiaBlade, hasNiaDriver, solve, usedBladeSet } from "../../model/solver"
import type { Catalog, Language, MemberState, TeamResult } from "../../types/common"
import { I18nProvider, LANGUAGES, readStoredLanguage, storeLanguage, useI18n } from "../i18n/LanguageContext"
import MemberColumn from "../components/MemberColumn"
import ResultList from "../components/ResultList"

const emptyMember = (): MemberState => ({ driver: null, blades: [null, null, null] })

export default function MainPage() {
  const [catalog, setCatalog] = useState<Catalog | undefined>(undefined)
  const [lang, setLang] = useState<Language>(readStoredLanguage)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    DB.getInstance().getCatalog()
      .then(setCatalog)
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  const changeLang = (next: Language) => {
    storeLanguage(next)
    setLang(next)
  }

  if (error)
    return <div className="p-6 text-red-700">{error}</div>
  if (!catalog)
    return <div className="flex min-h-screen items-center justify-center"><CircularProgress /></div>

  return (
    <I18nProvider catalog={catalog} lang={lang} setLang={changeLang}>
      <TeamBuilder catalog={catalog} />
    </I18nProvider>
  )
}

function TeamBuilder(props: { catalog: Catalog }) {
  const { catalog } = props
  const { t, lang, setLang } = useI18n()
  const [members, setMembers] = useState<MemberState[]>([emptyMember(), emptyMember(), emptyMember()])
  const [redundancy, setRedundancy] = useState(false)
  const [results, setResults] = useState<TeamResult[] | undefined>(undefined)
  const [calculating, setCalculating] = useState(false)

  const usedBlades = useMemo(() => usedBladeSet(members), [members])
  const takenDrivers = useMemo(
    () => new Set(members.map(m => m.driver).filter((d): d is string => !!d)),
    [members],
  )
  const niaBladeTaken = hasNiaBlade(members)
  const niaDriverTaken = hasNiaDriver(members)
  const canCalculate = members.every(m => m.driver)

  const updateMember = (index: number, next: MemberState) => {
    setMembers(ori => ori.map((m, i) => i === index ? next : m))
    setResults(undefined)
  }

  const runCalculate = () => {
    if (!canCalculate)
      return
    setCalculating(true)
    setResults(undefined)
    window.setTimeout(() => {
      const found = solve(catalog, members, redundancy)
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
            usedBlades={usedBlades}
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
    </div>
  )
}
