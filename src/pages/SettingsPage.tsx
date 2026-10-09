import { CalendarPlus, RotateCcw, Save } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, ErrorNote, Input, Label, Pill, SectionTitle, Select } from '../components/ui'
import { useAuth } from '../lib/auth'
import { dayOffset, formatDay, now, setDayOffset } from '../lib/clock'
import { DEMO_MODE, TTS_ENABLED } from '../lib/env'
import { COUNTRIES, LANGUAGES, LEVELS } from '../lib/levels'
import { repo } from '../lib/repo'
import { resetDemoDb } from '../lib/repo/local'
import type { Level } from '../lib/types'
import { errorMessage } from '../lib/utils'

export function SettingsPage() {
  const { user, profile, setProfile } = useAuth()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '')
  const [level, setLevel] = useState<Level>(profile?.level ?? 'adult')
  const [language, setLanguage] = useState(profile?.language ?? 'en')
  const [country, setCountry] = useState(profile?.country ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  if (!user || !profile) return null

  const save = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const p = await repo.updateProfile(user.id, { full_name: name.trim(), age: age ? Number(age) : null, level, language, country })
      setProfile(p)
      setSaved(true)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <SectionTitle title="Learning profile" subtitle="Your teacher adapts its language, examples and pace to these settings." />
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <Label>Age</Label>
            <Input type="number" min={3} max={120} value={age} onChange={(e) => setAge(e.target.value)} />
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
          <label className="block">
            <Label>Level</Label>
            <Select value={level} onChange={(e) => setLevel(e.target.value as Level)}>
              {LEVELS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <Label>Teaching language</Label>
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={save} loading={saving}>
            <Save className="size-4" /> Save changes
          </Button>
          {saved && <Pill tone="ok">Saved</Pill>}
        </div>
        <div className="mt-3 max-w-2xl">
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Card>

      <div className="space-y-5">
        <Card>
          <SectionTitle title="Account" />
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Email</dt>
              <dd>{profile.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Role</dt>
              <dd className="capitalize">{profile.role}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Narration</dt>
              <dd>{TTS_ENABLED ? 'AI voice (recorded)' : 'Browser voice'}</dd>
            </div>
          </dl>
        </Card>

        {DEMO_MODE && (
          <Card>
            <SectionTitle title="Demo tools" subtitle="Only available in demo mode." />
            <p className="text-sm text-muted">
              App date: <span className="font-medium text-ink">{formatDay(now())}</span>
              {dayOffset() > 0 && ` (+${dayOffset()} day${dayOffset() > 1 ? 's' : ''})`}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                variant="lime"
                onClick={() => {
                  setDayOffset(dayOffset() + 1)
                  location.reload()
                }}
              >
                <CalendarPlus className="size-4" /> Simulate next day
              </Button>
              <Button
                variant="outline"
                disabled={dayOffset() === 0}
                onClick={() => {
                  setDayOffset(0)
                  location.reload()
                }}
              >
                Back to today
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (!confirm('Reset all demo progress and curriculum edits?')) return
                  resetDemoDb()
                  setDayOffset(0)
                  location.assign('/onboarding')
                }}
              >
                <RotateCcw className="size-4" /> Reset demo data
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
