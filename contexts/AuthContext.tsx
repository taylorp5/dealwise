'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

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
    let loadingComplete = false

    // Timeout fallback to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted && !loadingComplete) {
        console.warn('Auth loading timeout. Proceeding without authentication.')
        loadingComplete = true
        setUser(null)
        setLoading(false)
      }
    }, 5000) // 5 second timeout

    // Get initial session with error handling
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted || loadingComplete) return
        clearTimeout(timeoutId)
        loadingComplete = true
        if (error) {
          console.error('Error getting session:', error)
          setUser(null)
        } else {
          setUser(session?.user ?? null)
        }
        setLoading(false)
      })
      .catch((error) => {
        if (!mounted || loadingComplete) return
        clearTimeout(timeoutId)
        loadingComplete = true
        console.error('Error getting session:', error)
        setUser(null)
        setLoading(false)
      })

    // Listen for auth changes
    try {
      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return
        if (!loadingComplete) {
          clearTimeout(timeoutId)
          loadingComplete = true
        }
        setUser(session?.user ?? null)
        setLoading(false)
      })
      subscription = sub
    } catch (error) {
      if (!loadingComplete) {
        clearTimeout(timeoutId)
        loadingComplete = true
      }
      console.error('Error setting up auth listener:', error)
      setLoading(false)
    }

    return () => {
      mounted = false
      clearTimeout(timeoutId)
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

