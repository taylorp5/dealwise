'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

const supabase = createBrowserSupabaseClient()

export interface Entitlements {
  first_time: boolean
  in_person: boolean
  bundle: boolean
}

export function useEntitlements() {
  const [loading, setLoading] = useState(true)
  const [entitlements, setEntitlements] = useState<Entitlements>({
    first_time: false,
    in_person: false,
    bundle: false,
  })

  const fetchEntitlements = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setEntitlements({
          first_time: false,
          in_person: false,
          bundle: false,
        })
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('user_entitlements')
        .select('first_time, in_person, bundle')
        .eq('user_id', user.id)
        .single()

      if (error) {
        // If no row exists, user has no entitlements
        if (error.code === 'PGRST116') {
          setEntitlements({
            first_time: false,
            in_person: false,
            bundle: false,
          })
        } else {
          console.error('[useEntitlements] Error fetching entitlements:', error)
        }
      } else {
        setEntitlements({
          first_time: data?.first_time || false,
          in_person: data?.in_person || false,
          bundle: data?.bundle || false,
        })
      }
    } catch (err) {
      console.error('[useEntitlements] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntitlements()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchEntitlements()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchEntitlements])

  const hasFirstTime = entitlements.first_time || entitlements.bundle
  const hasInPerson = entitlements.in_person || entitlements.bundle
  const hasBundle = entitlements.bundle

  return {
    loading,
    entitlements,
    hasFirstTime,
    hasInPerson,
    hasBundle,
    refreshEntitlements: fetchEntitlements,
  }
}

