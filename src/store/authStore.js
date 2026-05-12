import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  profile: null,
  examDate: '2026-07-29',

  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),

  loadProfile: async (userId) => {
    if (!supabase) return
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) set({ profile: data, examDate: data.exam_date ?? '2026-07-29' })
  },

  updateExamDate: (date) => set({ examDate: date }),

  signIn: async (email, password) => {
    if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    set({ user: data.user })
    return data
  },

  signUp: async (email, password) => {
    if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut()
    set({ user: null, profile: null, examDate: '2026-07-29' })
  },
}))
