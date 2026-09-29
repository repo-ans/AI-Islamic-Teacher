import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import { repo } from './repo'
import type { Catalog, LearnerState } from './types'

interface DataCtx {
  catalog: Catalog
  state: LearnerState
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const emptyCatalog: Catalog = { courses: [], modules: [], lessons: [] }
const emptyState: LearnerState = {
  enrollments: [],
  progress: [],
  attempts: [],
  missed: [],
  reflections: [],
  questions: [],
  activity: [],
}

const Ctx = createContext<DataCtx | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [catalog, setCatalog] = useState<Catalog>(emptyCatalog)
  const [state, setState] = useState<LearnerState>(emptyState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) return
    try {
      const [c, s] = await Promise.all([repo.getCatalog(), repo.getLearnerState(user.id)])
      setCatalog(c)
      setState(s)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return <Ctx.Provider value={{ catalog, state, loading, error, refresh }}>{children}</Ctx.Provider>
}

export function useData() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useData must be used inside DataProvider')
  return v
}
