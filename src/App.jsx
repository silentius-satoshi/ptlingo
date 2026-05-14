import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/authStore'
import { useUiStore } from './store/uiStore'
import useGamificationStore from './stores/gamificationStore'
import AppLayout from './components/layout/AppLayout'
import LandingPage from './pages/LandingPage'
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
import ShopPage from './pages/ShopPage'
import SettingsPage from './pages/SettingsPage'
import RationalePage from './pages/RationalePage'
import QuizModeOnboarding from './components/onboarding/QuizModeOnboarding'
import OnboardingFlow from './components/onboarding/OnboardingFlow'
import LoadingSpinner from './components/shared/LoadingSpinner'
import XPToast from './components/gamification/XPToast'
import IosInstallHint from './components/IosInstallHint'

// Checks user only — used for /mfa-challenge and /onboarding (user exists, anonymous ok)
function RequireAuth({ children }) {
  const { user, loading } = useAuthStore()
  const location = useLocation()
  if (loading) return <LoadingSpinner size="lg" className="h-screen" />
  if (!user) return <Navigate to="/" state={{ from: location }} replace />
  return children
}

// Checks user + MFA assurance level — used for all app routes
function RequireFullAuth({ children }) {
  const { user, loading } = useAuthStore()
  const location = useLocation()
  const [mfaOk, setMfaOk] = useState(null)

  useEffect(() => {
    if (!user || !supabase) { setMfaOk(true); return }
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data, error }) => {
      if (error || !data) { setMfaOk(true); return }
      setMfaOk(data.currentLevel === data.nextLevel)
    })
  }, [user])

  if (loading) return <LoadingSpinner size="lg" className="h-screen" />
  if (!user) return <Navigate to="/" state={{ from: location }} replace />
  if (mfaOk === null) return <LoadingSpinner size="lg" className="h-screen" />
  if (!mfaOk) return <Navigate to="/mfa-challenge" replace />
  return children
}

// Inner component — owns useNavigate and all auth/onboarding state
function AppInner() {
  const navigate = useNavigate()
  const { setUser, setLoading } = useAuthStore()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingComplete, setOnboardingComplete] = useState(
    () => !!localStorage.getItem('ptlingo_onboarding_complete')
  )
  const loadGamification = useGamificationStore(s => s.load)
  const rechargeEnergy   = useGamificationStore(s => s.rechargeEnergy)

  const startDemoSession = async (user) => {
    const { data: questions } = await supabase
      .from('questions')
      .select('id')
      .eq('quarantined', false)
      .limit(3)

    if (!questions?.length) { navigate('/path'); return }

    const { data: session } = await supabase
      .from('sessions')
      .insert({
        user_id:         user.id,
        type:            'quiz',
        mode:            'practice',
        status:          'in_progress',
        question_ids:    questions.map(q => q.id),
        total_questions: 3,
        current_index:   0,
        time_remaining:  9 * 3600,
        time_multiplier: 1,
        subjects:        ['Demo'],
        difficulty:      [],
        answers:         {},
        marked:          [],
      })
      .select()
      .single()

    if (session) navigate(`/exam/${session.id}?demo=true`)
    else navigate('/path')
  }

  const handleOnboardingComplete = async ({ userType, dailyGoal, examDate }) => {
    localStorage.setItem('ptlingo_onboarding_complete', '1')
    setOnboardingComplete(true)
    if (!localStorage.getItem('ptlingo_quiz_mode_set')) setShowOnboarding(true)

    const user = useAuthStore.getState().user
    if (user && supabase) {
      const patch = { id: user.id, user_type: userType, daily_goal: dailyGoal }
      if (examDate) patch.exam_date = examDate
      await supabase.from('profiles').upsert(patch, { onConflict: 'id' })
      if (examDate) useAuthStore.getState().updateExamDate(examDate)
      await startDemoSession(user)
    } else {
      navigate('/path')
    }
  }

  useEffect(() => {
    if (!supabase) {
      setUser(null)
      return
    }

    const handleSession = (session) => {
      setUser(session?.user ?? null)
      if (!session?.user) return

      loadGamification(session.user.id)
      useAuthStore.getState().loadProfile(session.user.id)

      if (!localStorage.getItem('ptlingo_onboarding_complete')) {
        // Skip onboarding for existing users who already have sessions
        supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .then(({ count }) => {
            if ((count ?? 0) > 0) {
              localStorage.setItem('ptlingo_onboarding_complete', '1')
              setOnboardingComplete(true)
              if (!localStorage.getItem('ptlingo_quiz_mode_set')) setShowOnboarding(true)
            }
          })
      } else {
        if (!localStorage.getItem('ptlingo_quiz_mode_set')) setShowOnboarding(true)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading, loadGamification]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = () => rechargeEnergy()
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [rechargeEnergy])

  return (
    <>
      <Routes>
        {/* Public routes — no auth required */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Onboarding — requires a session (anonymous ok) */}
        <Route path="/onboarding" element={
          <RequireAuth>
            <OnboardingFlow onComplete={handleOnboardingComplete} />
          </RequireAuth>
        } />

        {/* MFA challenge — requires auth but not yet AAL2 */}
        <Route path="/mfa-challenge" element={<RequireAuth><MFAChallenge /></RequireAuth>} />

        {/* Sidebar app layout */}
        <Route element={<RequireFullAuth><AppLayout /></RequireFullAuth>}>
          <Route path="path" element={<ThePathPage />} />
          <Route path="submissions" element={<SubmissionsPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="question-bank" element={<QuestionBankPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="tutor" element={<TutorPage />} />
          <Route path="exam/:examId/start" element={<MockExamStartPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="settings" element={<SettingsPage />} />
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
      <AnimatePresence>
        {showOnboarding && (
          <QuizModeOnboarding onComplete={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>
    </>
  )
}

export default function App() {
  const { darkMode } = useUiStore()

  useEffect(() => {
    document.documentElement.classList[darkMode ? 'add' : 'remove']('dark')
  }, [darkMode])

  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
