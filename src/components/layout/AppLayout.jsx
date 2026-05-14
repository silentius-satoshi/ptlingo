import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import TopStatsBar from './TopStatsBar'
import BiometricLock from '../auth/BiometricLock'
import { useAuthStore } from '../../store/authStore'

export default function AppLayout() {
  const navigate = useNavigate()
  const isAnonymous = useAuthStore(s => s.isAnonymous)
  const [anonBannerDismissed, setAnonBannerDismissed] = useState(
    () => !!sessionStorage.getItem('ptlingo_anon_banner_dismissed')
  )

  const dismissBanner = () => {
    sessionStorage.setItem('ptlingo_anon_banner_dismissed', '1')
    setAnonBannerDismissed(true)
  }

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
            {isAnonymous && !anonBannerDismissed && (
              <div
                className="mx-4 mt-4 rounded-xl p-4 flex items-center justify-between flex-shrink-0"
                style={{ background: '#1C1F2E', border: '1px solid #22C55E' }}
              >
                <div>
                  <p className="text-white font-bold text-sm">Save your progress</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Create a free account to keep your streak and XP.
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-3">
                  <button onClick={dismissBanner} className="text-xs text-slate-500 px-2">
                    Later
                  </button>
                  <button
                    onClick={() => navigate('/auth?upgrade=true')}
                    className="px-3 py-1.5 rounded-lg text-white text-xs font-bold"
                    style={{ background: '#22C55E' }}
                  >
                    Sign up
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
