import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isValidUrl = (url) => {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

if (!isValidUrl(supabaseUrl)) {
  console.warn(
    '[NPTE Prep] VITE_SUPABASE_URL is missing or invalid. ' +
    'Add your Supabase project URL to .env.local to enable auth and data.'
  )
}

export const supabase = isValidUrl(supabaseUrl)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
