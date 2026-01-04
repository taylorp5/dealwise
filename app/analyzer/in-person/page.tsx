'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useEntitlements } from '@/hooks/useEntitlements'
import ResearchPageContent from '@/components/ResearchPageContent'
import { isDevUIEnabled } from '@/lib/utils/dev-ui'

export default function InPersonAnalyzerPage() {
  const { user, loading: authLoading } = useAuth()
  const { hasInPerson, loading: entitlementsLoading } = useEntitlements()
  const router = useRouter()
  
  useEffect(() => {
    if (authLoading || entitlementsLoading) return
    
    if (!hasInPerson) {
      // Redirect to free analyzer if no entitlement
      router.push('/analyzer/free')
      return
    }
  }, [authLoading, entitlementsLoading, hasInPerson, router])
  
  if (authLoading || entitlementsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  
  return (
    <>
      {/* Debug label - dev only */}
      {isDevUIEnabled() && (
        <div className="fixed top-20 right-4 z-50 bg-yellow-100 border-2 border-yellow-400 px-3 py-1 rounded text-xs font-mono font-bold">
          Analyzer Variant: in_person
        </div>
      )}
      <ResearchPageContent mode="in-person" />
    </>
  )
}

