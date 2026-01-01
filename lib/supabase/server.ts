import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Hard failure if environment variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  
  throw new Error(
    `[CRITICAL] Missing required Supabase environment variables: ${missing.join(', ')}. ` +
    `These must be set in Vercel environment variables.`
  )
}

// Validate that values are not placeholders
if (supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
  throw new Error(
    `[CRITICAL] Supabase environment variables contain placeholder values. ` +
    `Please set real values in Vercel environment variables.`
  )
}

// Validate minimum length
if (supabaseUrl.length < 10 || supabaseAnonKey.length < 10) {
  throw new Error(
    `[CRITICAL] Supabase environment variables appear to be invalid (too short). ` +
    `Please verify they are set correctly in Vercel.`
  )
}

export function createServerSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (e) {
            // ignore if called from a read-only context
          }
        },
      },
    }
  )
}

// Backward compatibility alias
export const createServerSupabaseClient = createServerSupabase

