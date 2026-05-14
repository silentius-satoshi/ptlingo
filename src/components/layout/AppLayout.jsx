import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import TopStatsBar from './TopStatsBar'
import BiometricLock from '../auth/BiometricLock'
import { useAuthStore } from '../../store/authStore'

export default function AppLayout() {
  const navigate = useNavigate()
  const isAnonymous = useAuthStore(s => s.isAnonymous)

  return (
    <BiometricLock>
      <div
        className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopStatsBar />
          <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden pb-24 md:pb-0">
            {isAnonymous && (
              <div
                className="mx-4 mt-4 rounded-xl p-4 flex-shrink-0"
                style={{ background: '#1C1F2E' }}
              >
                <p className="text-white font-bold text-sm mb-3">
                  Create a profile to save your progress!
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/auth?upgrade=true')}
                    className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold"
                    style={{ background: '#22C55E' }}
                  >
                    Create a Profile
                  </button>
                  <button
                    onClick={() => navigate('/auth')}
                    className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold"
                    style={{ background: '#38BDF8' }}
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}
            <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-6 md:px-8">
              <Outlet />
            </div>
          </main>
        </div>
        <BottomNav />
      </div>
    </BiometricLock>
  )
}
