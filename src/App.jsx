import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/authStore'
import { useUiStore } from './store/uiStore'
import AppLayout from './components/layout/AppLayout'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import QuestionBankPage from './pages/QuestionBankPage'
import MockExamStartPage from './pages/MockExamStartPage'
import ExamPage from './pages/ExamPage'
import ReviewPage from './pages/ReviewPage'
import ResultsPage from './pages/ResultsPage'
import SubmissionsPage from './pages/SubmissionsPage'
import NotesPage from './pages/NotesPage'
import DiagnosticPage from './pages/DiagnosticPage'
import LoadingSpinner from './components/shared/LoadingSpinner'

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
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="submissions" element={<SubmissionsPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="question-bank" element={<QuestionBankPage />} />
          <Route path="diagnostic" element={<DiagnosticPage />} />
          <Route path="mock-exam/:examId" element={<MockExamStartPage />} />
          <Route path="exam/:sessionId" element={<ExamPage />} />
          <Route path="review/:sessionId" element={<ReviewPage />} />
          <Route path="results/:sessionId" element={<ResultsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
