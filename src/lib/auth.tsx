import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { repo } from './repo'
import type { AuthUser, Profile } from './types'

interface AuthCtx {
  user: AuthUser | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<Profile | null>
  setProfile: (p: Profile) => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (u: AuthUser | null) => {
    if (!u) {
      setProfile(null)
      return null
    }
    let p = await repo.getProfile(u.id)
    if (!p) {
      // The profile row is created by a DB trigger — give it a moment on first sign-up.
      await new Promise((r) => setTimeout(r, 800))
      p = await repo.getProfile(u.id)
    }
    setProfile(p)
    return p
  }, [])

  useEffect(() => {
    let alive = true
    repo
      .getUser()
      .then(async (u) => {
        if (!alive) return
        setUser(u)
        await loadProfile(u)
      })
      .catch((e) => console.error(e))
      .finally(() => alive && setLoading(false))

    const off = repo.onAuthChange((u) => {
      setUser((prev) => (prev?.id === u?.id ? prev : u))
      void loadProfile(u)
    })
    return () => {
      alive = false
      off()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(() => loadProfile(user), [loadProfile, user])

  return <Ctx.Provider value={{ user, profile, loading, refreshProfile, setProfile }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}
