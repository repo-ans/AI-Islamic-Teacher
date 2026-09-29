import { Mail, Sparkles } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Logo } from '../components/Logo'
import { Button, ErrorNote, Input, Label } from '../components/ui'
import { DEMO_MODE } from '../lib/env'
import { repo } from '../lib/repo'
import { errorMessage } from '../lib/utils'

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen gap-5 p-3 sm:p-5 lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col rounded-[24px] bg-white p-6 sm:p-10">
        <Logo />
        <div className="mx-auto my-auto w-full max-w-sm py-10">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
        <p className="text-xs text-subtle">Free forever for students · Lessons reviewed against the Quran and authentic Sunnah</p>
      </div>

      <div className="relative hidden overflow-hidden rounded-[24px] bg-brand p-10 text-white lg:flex lg:flex-col">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-lime px-3 py-1 text-xs font-medium text-ink">
          <Sparkles className="size-3.5" /> Your AI Islamic teacher
        </span>
        <h2 className="mt-6 max-w-md text-4xl leading-tight font-semibold tracking-tight">
          Learn Islam daily, one gentle lesson at a time.
        </h2>
        <p className="mt-4 max-w-md text-white/70">
          Lessons adapt to children, teens, adults, new Muslims and curious non-Muslims — in the language you understand best.
        </p>

        <div className="mt-auto space-y-3">
          <Bubble who="Teacher">Assalamu alaikum! How is your day going? Are you ready to start today's class?</Bubble>
          <Bubble who="You" me>
            Alhamdulillah, yes! But what does Tawhid mean?
          </Bubble>
          <Bubble who="Teacher">
            Great question! Tawhid means believing that Allah is One…
            <span className="mt-2 block w-fit rounded-full bg-white/15 px-2.5 py-0.5 text-xs">📖 Quran 112:1-4</span>
          </Bubble>
        </div>
      </div>
    </div>
  )
}

function Bubble({ who, me, children }: { who: string; me?: boolean; children: ReactNode }) {
  return (
    <div className={me ? 'ml-auto max-w-sm' : 'max-w-sm'}>
      <p className="mb-1 text-xs text-white/60">{who}</p>
      <div className={me ? 'rounded-2xl rounded-tr-md bg-lime p-3.5 text-sm text-ink' : 'rounded-2xl rounded-tl-md border border-white/15 bg-white/10 p-3.5 text-sm'}>
        {children}
      </div>
    </div>
  )
}

function GoogleButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        loading={loading}
        onClick={async () => {
          setLoading(true)
          setError('')
          try {
            await repo.signInWithGoogle()
          } catch (e) {
            setError(errorMessage(e))
            setLoading(false)
          }
        }}
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2.1-2 3.2-4.8 3.2-8.2Z" />
          <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23Z" />
          <path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.4-.4-2s.1-1.4.4-2V7.1H2a11 11 0 0 0 0 9.8L5.7 14Z" />
          <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10C6.6 7.4 9.1 5.4 12 5.4Z" />
        </svg>
        Continue with Google
      </Button>
      <ErrorNote>{error}</ErrorNote>
    </>
  )
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-subtle">
      <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await repo.signIn(email.trim(), password)
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue today's lesson.">
      <GoogleButton />
      <Divider />
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <Label>Email</Label>
          <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label className="block">
          <Label hint={undefined}>
            Password
            <Link to="/forgot-password" className="text-xs font-normal text-brand hover:underline">
              Forgot password?
            </Link>
          </Label>
          <Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <ErrorNote>{error}</ErrorNote>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New here?{' '}
        <Link to="/signup" className="font-medium text-ink hover:underline">
          Create a free account
        </Link>
      </p>
    </AuthLayout>
  )
}

export function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setError('Please use at least 8 characters for your password.')
    setLoading(true)
    setError('')
    try {
      const { needsConfirmation } = await repo.signUp(email.trim(), password, name.trim())
      if (needsConfirmation) setConfirm(true)
      else navigate('/onboarding', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (confirm) {
    return (
      <AuthLayout title="Check your email" subtitle={`We sent a confirmation link to ${email}.`}>
        <div className="flex items-start gap-3 rounded-2xl bg-soft p-4 text-sm text-muted">
          <Mail className="mt-0.5 size-5 shrink-0 text-brand" />
          Open the link to activate your account. You'll then set your learning level and choose your first course.
        </div>
        <Link to="/login" className="mt-6 inline-block text-sm font-medium hover:underline">
          ← Back to sign in
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create your free account" subtitle="Your teacher will adapt every lesson to you.">
      <GoogleButton />
      <Divider />
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <Label>Full name</Label>
          <Input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aisha Rahman" />
        </label>
        <label className="block">
          <Label>Email</Label>
          <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label className="block">
          <Label hint="8+ characters">Password</Label>
          <Input type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <ErrorNote>{error}</ErrorNote>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-ink hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a secure link to choose a new password.">
      {sent ? (
        <div className="rounded-2xl bg-ok-soft p-4 text-sm text-ok">
          {DEMO_MODE ? 'Demo mode: no email is sent. Sign in with your existing password.' : `If an account exists for ${email}, a reset link is on its way.`}
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setLoading(true)
            setError('')
            try {
              await repo.sendPasswordReset(email.trim())
              setSent(true)
            } catch (err) {
              setError(errorMessage(err))
            } finally {
              setLoading(false)
            }
          }}
          className="space-y-4"
        >
          <label className="block">
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <ErrorNote>{error}</ErrorNote>
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Send reset link
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-6 inline-block text-sm font-medium hover:underline">
        ← Back to sign in
      </Link>
    </AuthLayout>
  )
}

export function UpdatePasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  return (
    <AuthLayout title="Choose a new password" subtitle="You're signed in through the reset link.">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (password.length < 8) return setError('Please use at least 8 characters.')
          setLoading(true)
          setError('')
          try {
            await repo.updatePassword(password)
            navigate('/', { replace: true })
          } catch (err) {
            setError(errorMessage(err))
          } finally {
            setLoading(false)
          }
        }}
        className="space-y-4"
      >
        <label className="block">
          <Label hint="8+ characters">New password</Label>
          <Input type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <ErrorNote>{error}</ErrorNote>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  )
}
