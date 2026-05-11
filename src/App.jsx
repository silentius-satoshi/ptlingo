import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/authStore'
import { useUiStore } from './store/uiStore'
import useGamificationStore from './stores/gamificationStore'
import AppLayout from './components/layout/AppLayout'
import AuthPage from './pages/AuthPage'
import MFAChallenge from './components/auth/MFAChallenge'
import AuthCallback from './pages/AuthCallback'
import ResetPassword from './pages/ResetPassword'
import ThePathPage from './pages/ThePathPage'
import QuestionBankPage from './pages/QuestionBankPage'
import MockExamStartPage from './pages/MockExamStartPage'
import ExamPage from './pages/ExamPage'
import ReviewPage from './pages/ReviewPage'
import ResultsPage from './pages/ResultsPage'
import SubmissionsPage from './pages/SubmissionsPage'
import NotesPage from './pages/NotesPage'
import PerformancePage from './pages/PerformancePage'
import AchievementsPage from './pages/AchievementsPage'
import TutorPage from './pages/TutorPage'
import ProfilePage from './pages/ProfilePage'
import RationalePage from './pages/RationalePage'
import LoadingSpinner from './components/shared/LoadingSpinner'
import XPToast from './components/gamification/XPToast'
import IosInstallHint from './components/IosInstallHint'

// Checks user only — used for /mfa-challenge (user exists but may not be AAL2)
function RequireAuth({ children }) {
  const { user, loading } = useAuthStore()
  const location = useLocation()
  if (loading) return <LoadingSpinner size="lg" className="h-screen" />
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />
  return children
}

// Checks user + MFA assurance level — used for all app routes
function RequireFullAuth({ children }) {
  const { user, loading } = useAuthStore()
  const location = useLocation()
  const [mfaOk, setMfaOk] = useState(null) // null=checking, true=ok, false=needs-mfa

  useEffect(() => {
    if (!user || !supabase) { setMfaOk(true); return }
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data, error }) => {
      if (error || !data) { setMfaOk(true); return } // fail open
      setMfaOk(data.currentLevel === data.nextLevel)
    })
  }, [user])

  if (loading) return <LoadingSpinner size="lg" className="h-screen" />
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />
  if (mfaOk === null) return <LoadingSpinner size="lg" className="h-screen" />
  if (!mfaOk) return <Navigate to="/mfa-challenge" replace />
  return children
}

export default function App() {
  const { setUser, setLoading } = useAuthStore()
  const { darkMode } = useUiStore()
  const loadGamification = useGamificationStore((s) => s.load)
  const rechargeEnergy   = useGamificationStore((s) => s.rechargeEnergy)

  // Apply dark mode class on mount
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Bootstrap Supabase auth listener
  useEffect(() => {
    if (!supabase) {
      setUser(null)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadGamification(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadGamification(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading, loadGamification])

  // Recharge energy whenever the user returns to the app
  useEffect(() => {
    const handler = () => rechargeEnergy()
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [rechargeEnergy])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* MFA challenge — requires auth but not yet AAL2 */}
        <Route path="/mfa-challenge" element={<RequireAuth><MFAChallenge /></RequireAuth>} />

        {/* Sidebar app layout */}
        <Route element={<RequireFullAuth><AppLayout /></RequireFullAuth>}>
          <Route index element={<ThePathPage />} />
          <Route path="submissions" element={<SubmissionsPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="question-bank" element={<QuestionBankPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="tutor" element={<TutorPage />} />
          <Route path="exam/:examId/start" element={<MockExamStartPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Full-screen routes — auth + MFA required, no sidebar */}
        <Route element={<RequireFullAuth><Outlet /></RequireFullAuth>}>
          <Route path="exam/:sessionId" element={<ExamPage />} />
          <Route path="review/:sessionId" element={<ReviewPage />} />
          <Route path="results/:sessionId" element={<ResultsPage />} />
          <Route path="rationale" element={<RationalePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <XPToast />
      <IosInstallHint />
    </BrowserRouter>
  )
}
