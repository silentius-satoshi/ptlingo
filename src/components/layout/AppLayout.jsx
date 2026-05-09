import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import TopStatsBar from './TopStatsBar'
import BiometricLock from '../auth/BiometricLock'

export default function AppLayout() {
  return (
    <BiometricLock>
      <div
        className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopStatsBar />
          <main className="flex-1 flex flex-col overflow-y-auto pb-24 md:pb-0">
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
