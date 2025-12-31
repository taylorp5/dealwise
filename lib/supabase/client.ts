import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Check if we have valid configuration
const isConfigured = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.length > 10 && 
  supabaseAnonKey.length > 10 && 
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder')

// Only create client if properly configured, otherwise create a minimal client that won't make network requests
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // Disable session persistence to avoid hanging
        autoRefreshToken: false,
      },
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

