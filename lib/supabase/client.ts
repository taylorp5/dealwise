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

// Debug logging in development to help identify configuration issues
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  if (!isConfigured) {
    console.warn('[Supabase Client] Configuration check failed:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlLength: supabaseUrl.length,
      keyLength: supabaseAnonKey.length,
      urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing',
    })
  }
}

// Only create client if properly configured, otherwise create a minimal client that won't make network requests
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true, // Enable session persistence for production
        autoRefreshToken: true, // Enable token refresh for production
        detectSessionInUrl: true, // Detect auth callback in URL
        flowType: 'pkce', // Use PKCE flow for better security
      },
      global: {
        headers: {
          'x-client-info': 'dealwise-web',
        },
      },
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

