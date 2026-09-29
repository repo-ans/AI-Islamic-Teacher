import type { ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { AppShell } from './components/AppShell'
import { PageLoader } from './components/ui'
import { useAuth } from './lib/auth'
import { DataProvider, useData } from './lib/data'
import { nextUp } from './lib/progress'
import { AdminPage } from './pages/AdminPage'
import { AskPage } from './pages/AskPage'
import { AssessmentPage } from './pages/AssessmentPage'
import { ForgotPasswordPage, LoginPage, SignupPage, UpdatePasswordPage } from './pages/AuthPages'
import { ClassroomPage } from './pages/classroom/ClassroomPage'
import { CourseDetailPage } from './pages/CourseDetailPage'
import { CoursesPage } from './pages/CoursesPage'
import { DashboardPage } from './pages/DashboardPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ProgressPage } from './pages/ProgressPage'
import { RevisionPage } from './pages/RevisionPage'
import { SettingsPage } from './pages/SettingsPage'

export function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route path="/update-password" element={<UpdatePasswordPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<RequireOnboarded />}>
          <Route path="/learn/:lessonId" element={<ClassroomPage />} />
          <Route path="/assessment/:moduleId" element={<AssessmentPage />} />
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="/today" element={<TodayRedirect />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:courseId" element={<CourseDetailPage />} />
            <Route path="/ask" element={<AskPage />} />
            <Route path="/revision" element={<RevisionPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminOnly><AdminPage /></AdminOnly>} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function PublicOnly() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return (
    <DataProvider>
      <Outlet />
    </DataProvider>
  )
}

function RequireOnboarded() {
  const { profile } = useAuth()
  const { loading } = useData()
  if (!profile || loading) return <PageLoader />
  if (!profile.onboarded) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  if (profile?.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

function TodayRedirect() {
  const { catalog, state } = useData()
  const next = nextUp(catalog, state)
  if (next && next.status !== 'tomorrow') return <Navigate to={`/learn/${next.lesson.id}`} replace />
  return <Navigate to={next ? `/courses/${next.course.id}` : '/courses'} replace />
}
