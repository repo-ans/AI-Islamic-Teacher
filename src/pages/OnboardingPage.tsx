import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Logo } from '../components/Logo'
import { Button, Card, CourseBadge, ErrorNote, Input, Label, Pill, Select } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/data'
import { COUNTRIES, LANGUAGES, LEVELS, suggestLevel } from '../lib/levels'
import { orderedLessons } from '../lib/progress'
import { repo } from '../lib/repo'
import type { Level } from '../lib/types'
import { cn, errorMessage } from '../lib/utils'

const SAMPLE: Record<Level, string> = {
  child: 'Allah made everything — the sun, the stars and you! 🌟 He is One, and He loves it when we remember Him.',
  teen: "Think of Tawhid as the foundation of everything — like the base code everything else in Islam runs on.",
  adult: 'Tawhid is affirming Allah\'s oneness in Lordship, worship, and His names and attributes (Quran 112:1-4).',
  new_muslim: 'Tawhid (tow-HEED) simply means "Oneness". It is the belief that there is only one God, Allah. Take your time — every question is welcome.',
  non_muslim: 'Muslims believe in one God, called Allah in Arabic — the same word Arab Christians use. Here is what that belief means, step by step.',
}

export function OnboardingPage() {
  const { user, profile, setProfile } = useAuth()
  const { catalog, refresh } = useData()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [name, setName] = useState(profile?.full_name ?? '')
  const [age, setAge] = useState<string>(profile?.age ? String(profile.age) : '')
  const [country, setCountry] = useState(profile?.country ?? '')
  const [language, setLanguage] = useState(profile?.language ?? 'en')
  const [level, setLevel] = useState<Level | null>(profile?.level ?? null)
  const [courses, setCourses] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const ageNum = age ? Number(age) : null
  const suggested = suggestLevel(ageNum)
  const canNext = [name.trim() && ageNum && ageNum >= 3 && ageNum <= 120 && country && language, !!level, courses.length > 0][step]

  const finish = async () => {
    if (!user || !level) return
    setSaving(true)
    setError('')
    try {
      const updated = await repo.updateProfile(user.id, {
        full_name: name.trim(),
        age: ageNum,
        country,
        language,
        level,
        onboarded: true,
      })
      for (const c of courses) await repo.enroll(user.id, c)
      setProfile(updated)
      await refresh()
      const first = orderedLessons(catalog, courses[0])[0]
      navigate(first ? `/learn/${first.id}` : '/', { replace: true })
    } catch (e) {
      setError(errorMessage(e))
      setSaving(false)
    }
  }

  const steps = ['About you', 'Your level', 'Your course']

  return (
    <div className="min-h-screen p-3 sm:p-5">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between py-2">
          <Logo />
          <ol className="hidden items-center gap-2 sm:flex">
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span
                  className={cn(
                    'grid size-6 place-items-center rounded-full text-xs font-semibold',
                    i < step ? 'bg-ink text-lime' : i === step ? 'bg-lime text-ink' : 'bg-white text-muted',
                  )}
                >
                  {i < step ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className={cn('text-sm', i === step ? 'font-medium' : 'text-muted')}>{s}</span>
                {i < steps.length - 1 && <span className="mx-1 h-px w-8 bg-dash" />}
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
          <Card className="p-6 sm:p-8">
            {step === 0 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">Tell your teacher about you</h1>
                <p className="mt-1 text-sm text-muted">Your age, language and country shape how every lesson is explained.</p>
                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <Label>Your name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="What should the teacher call you?" />
                  </label>
                  <label className="block">
                    <Label>Age</Label>
                    <Input type="number" min={3} max={120} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 11" />
                  </label>
                  <label className="block">
                    <Label>Country</Label>
                    <Select value={country} onChange={(e) => setCountry(e.target.value)}>
                      <option value="">Select country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </Select>
                  </label>
                  <label className="block sm:col-span-2">
                    <Label hint="The teacher answers and explains in this language">Language you understand best</Label>
                    <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                      {LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">Which describes you best?</h1>
                <p className="mt-1 text-sm text-muted">The teacher's words, pace and examples change with your level. You can change it later.</p>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setLevel(l.id)}
                      className={cn(
                        'relative rounded-2xl border p-4 text-left transition',
                        level === l.id ? 'border-ink bg-ink text-white' : 'border-dashed border-dash hover:border-ink/40',
                      )}
                    >
                      <span className="text-2xl">{l.emoji}</span>
                      <p className="mt-2 font-medium">{l.label}</p>
                      <p className={cn('text-sm', level === l.id ? 'text-white/70' : 'text-muted')}>{l.blurb}</p>
                      {suggested === l.id && (
                        <Pill tone="lime" className="absolute top-3 right-3">
                          Suggested
                        </Pill>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">Choose your course</h1>
                <p className="mt-1 text-sm text-muted">Pick one to start — you can add more any time. One new lesson opens each day.</p>
                <div className="mt-7 space-y-3">
                  {catalog.courses.map((c) => {
                    const selected = courses.includes(c.id)
                    const n = catalog.lessons.filter((l) => l.course_id === c.id).length
                    return (
                      <button
                        key={c.id}
                        onClick={() => setCourses((cur) => (selected ? cur.filter((x) => x !== c.id) : [...cur, c.id]))}
                        className={cn(
                          'flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition',
                          selected ? 'border-ink ring-4 ring-ink/5' : 'border-dashed border-dash hover:border-ink/40',
                        )}
                      >
                        <CourseBadge title={c.title} color={c.color} className="size-11 text-sm" />
                        <span className="flex-1">
                          <span className="flex items-center gap-2 font-medium">
                            {c.title} <Pill>{c.category}</Pill>
                          </span>
                          <span className="block text-sm text-muted">{c.description}</span>
                        </span>
                        <span className="hidden text-xs text-muted sm:block">{n} lessons</span>
                        <span className={cn('grid size-6 place-items-center rounded-full border', selected ? 'border-ink bg-ink text-lime' : 'border-dash')}>
                          {selected && <Check className="size-3.5" />}
                        </span>
                      </button>
                    )
                  })}
                  {catalog.courses.length === 0 && <p className="text-sm text-muted">No courses are published yet. Ask an admin to seed the curriculum.</p>}
                </div>
              </>
            )}

            <ErrorNote>{error}</ErrorNote>
            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              {step < 2 ? (
                <Button
                  onClick={() => {
                    if (step === 0 && !level && suggested) setLevel(suggested)
                    setStep((s) => s + 1)
                  }}
                  disabled={!canNext}
                >
                  Continue <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button variant="lime" onClick={finish} disabled={!canNext} loading={saving}>
                  Meet your teacher <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </Card>

          <div className="flex flex-col gap-5">
            <div className="rounded-[24px] bg-brand p-6 text-white">
              <Pill tone="lime">
                <Sparkles className="size-3.5" /> Teacher preview
              </Pill>
              <p className="mt-4 text-sm text-white/70">How your teacher will explain Tawhid:</p>
              <p className="mt-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm leading-relaxed">
                {level ? SAMPLE[level] : 'Choose your level to see how the teacher will speak to you.'}
              </p>
            </div>
            <Card>
              <p className="text-sm font-medium">What happens next</p>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>1 · Your teacher greets you with salam</li>
                <li>2 · Listen to a short recorded lesson</li>
                <li>3 · Ask questions any time — with sources</li>
                <li>4 · Take a quick quiz and get feedback</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
