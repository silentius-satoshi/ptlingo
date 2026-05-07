import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/authStore'
import { useUiStore } from './store/uiStore'
import useGamificationStore from './stores/gamificationStore'
import AppLayout from './components/layout/AppLayout'
import AuthPage from './pages/AuthPage'
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
import LoadingSpinner from './components/shared/LoadingSpinner'
import XPToast from './components/gamification/XPToast'

function RequireAuth({ children }) {
  const { user, loading } = useAuthStore()
  const location = useLocation()
  if (loading) return <LoadingSpinner size="lg" className="h-screen" />
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />
  return children
}

export default function App() {
  const { setUser, setLoading } = useAuthStore()
  const { darkMode } = useUiStore()
  const loadGamification = useGamificationStore((s) => s.load)

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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

        {/* Sidebar app layout */}
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<ThePathPage />} />
          <Route path="submissions" element={<SubmissionsPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="question-bank" element={<QuestionBankPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="tutor" element={<TutorPage />} />
          <Route path="exam/:examId/start" element={<MockExamStartPage />} />
        </Route>

        {/* Full-screen routes — auth required, no sidebar */}
        <Route element={<RequireAuth><Outlet /></RequireAuth>}>
          <Route path="exam/:sessionId" element={<ExamPage />} />
          <Route path="review/:sessionId" element={<ReviewPage />} />
          <Route path="results/:sessionId" element={<ResultsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <XPToast />
    </BrowserRouter>
  )
}
