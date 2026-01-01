'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import type { User } from '@supabase/supabase-js'

const supabase = createBrowserSupabaseClient()

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  if (typeof window === 'undefined') {
    // Server-side: check process.env directly
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    return !!(url && key && url !== '' && key !== '' && !url.includes('placeholder'))
  } else {
    // Client-side: environment variables are embedded at build time
    // Check if we have valid-looking values
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    return !!(url && key && url.length > 10 && key.length > 10 && !url.includes('placeholder'))
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if Supabase is configured - fail fast if not
    const configured = isSupabaseConfigured()
    if (!configured) {
      console.warn('Supabase not configured. Running in unauthenticated mode.')
      setUser(null)
      setLoading(false)
      return
    }

    let mounted = true
    let subscription: any = null

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('[AuthContext] Error getting initial session:', error)
          setUser(null)
        } else {
          console.log('[AuthContext] Initial session:', session ? `User: ${session.user.email}` : 'No session')
          setUser(session?.user ?? null)
        }
        setLoading(false)
      } catch (error) {
        if (!mounted) return
        console.error('[AuthContext] Error initializing auth:', error)
        setUser(null)
        setLoading(false)
      }
    }

    // Initialize auth state
    initializeAuth()

    // Listen for auth changes (this will catch OAuth callbacks, sign in/out, etc.)
    const {
      data: { subscription: sub },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      console.log('[AuthContext] Auth state changed:', event, session ? `User: ${session.user.email}` : 'No session')
      
      setUser(session?.user ?? null)
      setLoading(false)
    })
    
    subscription = sub

    return () => {
      mounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const signOut = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut()
    }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

