import {
  BookOpen,
  CalendarDays,
  ChartColumn,
  ChevronDown,
  CircleHelp,
  CirclePlay,
  LayoutGrid,
  LogOut,
  Menu,
  MessageCircleQuestion,
  PanelLeft,
  RotateCcw,
  Search,
  Settings,
  Shield,
  Bell,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../lib/auth'
import { hijriDate } from '../lib/clock'
import { useData } from '../lib/data'
import { DEMO_MODE } from '../lib/env'
import { levelLabel } from '../lib/levels'
import { courseProgress, enrolledCourses, nextUp, reviewQueue, weakTopics } from '../lib/progress'
import { repo } from '../lib/repo'
import { cn, firstName } from '../lib/utils'
import { Avatar, CourseBadge, IconButton } from './ui'
import { Logo } from './Logo'
import { HelpDialog } from './HelpDialog'

export function AppShell() {
  const [mobileNav, setMobileNav] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  useEffect(() => setMobileNav(false), [location.pathname])

  return (
    <div className="min-h-screen p-3 sm:p-5">
      {DEMO_MODE && (
        <div className="mb-3 rounded-2xl bg-ink px-4 py-2 text-center text-xs text-white/80">
          <span className="font-medium text-lime">Demo mode</span> — data is stored in this browser and the AI teacher runs offline.
          Add Supabase keys in <code className="text-white">.env</code> for the full experience.
        </div>
      )}
      <TopBar onMenu={() => setMobileNav(true)} />
      <div className="mt-4 flex gap-5">
        <aside className={cn('hidden shrink-0 lg:block', collapsed ? 'w-[76px]' : 'w-64')}>
          <div className="sticky top-5">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={() => setMobileNav(false)} />
          <div className="absolute inset-y-3 left-3 w-72 animate-rise">
            <Sidebar collapsed={false} onClose={() => setMobileNav(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { profile } = useAuth()
  const [help, setHelp] = useState(false)
  return (
    <header className="flex items-center gap-3">
      <IconButton className="lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="size-4" />
      </IconButton>
      <Link to="/" className="mr-2 flex items-center gap-2.5 lg:w-64">
        <Logo />
      </Link>
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <span className="hidden items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink md:inline-flex">
          <CalendarDays className="size-4 text-muted" />
          {hijriDate()}
        </span>
        <IconButton onClick={() => setHelp(true)} aria-label="How it works">
          <CircleHelp className="size-[18px]" />
        </IconButton>
        <Notifications />
        {profile && <UserMenu />}
      </div>
      {help && <HelpDialog onClose={() => setHelp(false)} />}
    </header>
  )
}

function GlobalSearch() {
  const { catalog } = useData()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    const courses = catalog.courses
      .filter((c) => `${c.title} ${c.description}`.toLowerCase().includes(s))
      .map((c) => ({ key: c.id, label: c.title, sub: 'Course', to: `/courses/${c.id}` }))
    const lessons = catalog.lessons
      .filter((l) => `${l.title} ${l.description}`.toLowerCase().includes(s))
      .map((l) => ({
        key: l.id,
        label: l.title,
        sub: catalog.courses.find((c) => c.id === l.course_id)?.title ?? 'Lesson',
        to: `/courses/${l.course_id}`,
      }))
    return [...courses, ...lessons].slice(0, 7)
  }, [q, catalog])

  return (
    <div className="relative hidden max-w-md flex-1 sm:block">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
      <input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search lessons, courses, topics"
        className="h-11 w-full rounded-xl border border-line bg-white pr-14 pl-10 text-sm outline-none placeholder:text-subtle focus:border-brand"
      />
      <kbd className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md bg-soft px-1.5 py-0.5 text-[11px] font-medium text-muted">⌘K</kbd>
      {open && q && (
        <div className="absolute inset-x-0 top-12 z-40 rounded-2xl border border-line bg-white p-2 shadow-xl shadow-ink/5">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">No matches. Try “Ask the Teacher” for questions.</p>
          ) : (
            results.map((r) => (
              <button
                key={r.key}
                onMouseDown={() => {
                  navigate(r.to)
                  setQ('')
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-soft"
              >
                <span className="font-medium">{r.label}</span>
                <span className="text-xs text-muted">{r.sub}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function Notifications() {
  const { catalog, state } = useData()
  const [open, setOpen] = useState(false)
  const next = nextUp(catalog, state)
  const items: Array<{ text: string; to: string }> = []
  if (next && next.status !== 'tomorrow') items.push({ text: `Today's lesson is ready: ${next.lesson.title}`, to: `/learn/${next.lesson.id}` })
  const reviews = enrolledCourses(catalog, state).reduce((n, c) => n + reviewQueue(state, c.id).length, 0)
  if (reviews) items.push({ text: `${reviews} missed question${reviews > 1 ? 's' : ''} will be reviewed in your next lesson`, to: '/revision' })

  return (
    <div className="relative">
      <IconButton onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <Bell className="size-[18px]" />
        {items.length > 0 && <span className="absolute top-2 right-2.5 size-2 rounded-full bg-danger ring-2 ring-white" />}
      </IconButton>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-80 rounded-2xl border border-line bg-white p-2 shadow-xl shadow-ink/5">
            <p className="px-3 py-2 text-xs font-medium tracking-wide text-muted uppercase">Notifications</p>
            {items.length === 0 ? (
              <p className="px-3 pb-3 text-sm text-muted">You're all caught up.</p>
            ) : (
              items.map((i) => (
                <Link key={i.text} to={i.to} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm hover:bg-soft">
                  {i.text}
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

function UserMenu() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  if (!profile) return null
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-xl border border-line bg-white py-1.5 pr-3 pl-1.5 hover:bg-soft"
      >
        <Avatar name={profile.full_name || profile.email || '?'} />
        <span className="hidden text-left sm:block">
          <span className="block text-sm leading-tight font-medium">{profile.full_name || 'Student'}</span>
          <span className="block text-xs leading-tight text-muted">
            {levelLabel(profile.level)}
            {profile.country ? ` · ${profile.country}` : ''}
          </span>
        </span>
        <ChevronDown className="size-4 text-muted" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-52 rounded-2xl border border-line bg-white p-1.5 shadow-xl shadow-ink/5">
            <Link to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-soft">
              <Settings className="size-4" /> Settings
            </Link>
            <button
              onClick={async () => {
                await repo.signOut()
                navigate('/login')
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger hover:bg-danger-soft"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Sidebar({ collapsed, onToggle, onClose }: { collapsed: boolean; onToggle?: () => void; onClose?: () => void }) {
  const { profile } = useAuth()
  const { catalog, state } = useData()
  const next = nextUp(catalog, state)
  const weak = weakTopics(state).length
  const courses = enrolledCourses(catalog, state)

  const nav: Array<{ to: string; label: string; icon: ReactNode; badge?: number; end?: boolean }> = [
    { to: '/', label: 'Dashboard', icon: <LayoutGrid className="size-4" />, end: true },
    { to: next && next.status !== 'tomorrow' ? `/learn/${next.lesson.id}` : '/today', label: "Today's lesson", icon: <CirclePlay className="size-4" /> },
    { to: '/courses', label: 'Courses', icon: <BookOpen className="size-4" /> },
    { to: '/ask', label: 'Ask the Teacher', icon: <MessageCircleQuestion className="size-4" /> },
    { to: '/revision', label: 'Revision', icon: <RotateCcw className="size-4" />, badge: weak || undefined },
    { to: '/progress', label: 'Progress', icon: <ChartColumn className="size-4" /> },
  ]
  if (profile?.role === 'admin') nav.push({ to: '/admin', label: 'Curriculum admin', icon: <Shield className="size-4" /> })

  return (
    <nav className="flex h-[calc(100vh-7.5rem)] min-h-[520px] flex-col rounded-[24px] bg-white p-4">
      <div className={cn('mb-3 flex items-center px-2', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && <span className="text-xs font-medium text-muted">Workspace</span>}
        {onClose ? (
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close menu">
            <X className="size-4" />
          </button>
        ) : (
          <button onClick={onToggle} className="text-muted hover:text-ink" aria-label="Collapse sidebar">
            <PanelLeft className="size-4" />
          </button>
        )}
      </div>

      <ul className="space-y-1">
        {nav.map((n) => (
          <li key={n.label}>
            <NavLink
              to={n.to}
              end={n.end}
              title={collapsed ? n.label : undefined}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors',
                  collapsed && 'justify-center',
                  isActive ? 'bg-ink font-medium text-white' : 'text-ink/80 hover:bg-soft',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('grid size-7 place-items-center rounded-lg', isActive ? 'bg-lime text-ink' : 'text-muted')}>{n.icon}</span>
                  {!collapsed && <span className="flex-1">{n.label}</span>}
                  {!collapsed && n.badge ? (
                    <span className={cn('text-xs', isActive ? 'text-white/70' : 'text-muted')}>{n.badge}</span>
                  ) : null}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="my-4 border-t border-dashed border-dash" />

      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
          <div className="mb-2 flex items-center justify-between px-2 text-xs text-muted">
            <span>My courses</span>
            <span>{courses.length}</span>
          </div>
          <ul className="space-y-1">
            {courses.map((c) => {
              const p = courseProgress(catalog, state.progress, c.id)
              return (
                <li key={c.id}>
                  <NavLink
                    to={`/courses/${c.id}`}
                    className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-soft', isActive && 'bg-soft')}
                  >
                    <CourseBadge title={c.title} color={c.color} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{c.title}</span>
                      <span className="block text-xs text-muted">
                        {p.done} of {p.total} lessons
                      </span>
                    </span>
                  </NavLink>
                </li>
              )
            })}
            {courses.length === 0 && (
              <li className="px-2 text-xs text-muted">
                <Link to="/courses" className="underline">
                  Choose a course
                </Link>{' '}
                to begin.
              </li>
            )}
          </ul>
        </div>
      )}
      {collapsed && <div className="flex-1" />}

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          cn('mt-3 flex items-center gap-3 rounded-xl px-2 py-2 text-sm', collapsed && 'justify-center', isActive ? 'bg-soft font-medium' : 'text-ink/80 hover:bg-soft')
        }
      >
        <span className="grid size-7 place-items-center text-muted">
          <Settings className="size-4" />
        </span>
        {!collapsed && <span>Settings</span>}
      </NavLink>
      {!collapsed && profile && <p className="mt-2 px-2 text-[11px] text-subtle">Signed in as {firstName(profile.full_name)}</p>}
    </nav>
  )
}
