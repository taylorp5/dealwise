import { createClient } from '@supabase/supabase-js'

// Read environment variables - these MUST be set at build time for Next.js to embed them
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Hard failure if environment variables are missing
// This ensures we never use placeholder values in production
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  
  const errorMessage = `[CRITICAL] Missing required Supabase environment variables: ${missing.join(', ')}. ` +
    `These must be set in Vercel environment variables and available at build time. ` +
    `Without these, authentication will fail.`
  
  // Always throw error - do NOT allow client creation with missing env vars
  throw new Error(errorMessage)
}

// Validate that values are not placeholders
if (supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
  const placeholderVars = []
  if (supabaseUrl.includes('placeholder')) placeholderVars.push('NEXT_PUBLIC_SUPABASE_URL')
  if (supabaseAnonKey.includes('placeholder')) placeholderVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  
  const errorMessage = `[CRITICAL] Supabase environment variables contain placeholder values. ` +
    `Please set real values in Vercel environment variables. ` +
    `Found placeholder in: ${placeholderVars.join(' and ')}`
  
  // Always throw error - do NOT allow client creation with placeholders
  throw new Error(errorMessage)
}

// Validate minimum length
if (supabaseUrl.length < 10 || supabaseAnonKey.length < 10) {
  const errorMessage = `[CRITICAL] Supabase environment variables appear to be invalid (too short). ` +
    `Please verify they are set correctly in Vercel.`
  
  // Always throw error - do NOT allow client creation with invalid values
  throw new Error(errorMessage)
}

// Create Supabase client with validated configuration
// This code runs in the browser, so env vars are embedded at build time
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

