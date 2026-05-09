import { useNavigate } from 'react-router-dom'
import { User, LogOut } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'

function getInitials(email = '') {
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

export default function SidebarFooter() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  return (
    <div className="px-3 py-3 border-t border-slate-700 space-y-1">
      {/* User info + Profile link */}
      <button
        onClick={() => navigate('/profile')}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[10px] font-bold">{getInitials(user?.email)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-200 truncate">{user?.email}</p>
          <p className="text-[10px] text-slate-500">View profile</p>
        </div>
        <User className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
      </button>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-red-400 hover:bg-slate-700/50 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        Sign Out
      </button>
    </div>
  )
}
