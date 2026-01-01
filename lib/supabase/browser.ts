'use client'

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Hard failure if environment variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  
  throw new Error(
    `[CRITICAL] Missing required Supabase environment variables: ${missing.join(', ')}. ` +
    `These must be set in Vercel environment variables and available at build time.`
  )
}

// Validate that values are not placeholders
if (supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
  const placeholderVars = []
  if (supabaseUrl.includes('placeholder')) placeholderVars.push('NEXT_PUBLIC_SUPABASE_URL')
  if (supabaseAnonKey.includes('placeholder')) placeholderVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  
  throw new Error(
    `[CRITICAL] Supabase environment variables contain placeholder values. ` +
    `Please set real values in Vercel environment variables. ` +
    `Found placeholder in: ${placeholderVars.join(' and ')}`
  )
}

// Validate minimum length
if (supabaseUrl.length < 10 || supabaseAnonKey.length < 10) {
  throw new Error(
    `[CRITICAL] Supabase environment variables appear to be invalid (too short). ` +
    `Please verify they are set correctly in Vercel.`
  )
}

// Create Supabase browser client with SSR cookie support
export function createBrowserSupabaseClient() {
  // Type assertion is safe because we validate above
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!)
}

