'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { hasPack, hasAllAccess } from '@/lib/packs/entitlements'
import ResearchPage from '@/app/research/page'

export default function FirstTimeAnalyzerPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (authLoading) return
    
    const hasFirstTimePack = hasPack('first_time') || hasAllAccess()
    
    if (!hasFirstTimePack) {
      // Redirect to free analyzer if no entitlement
      router.push('/analyzer/free')
      return
    }
  }, [authLoading, router])
  
  if (authLoading) {
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
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-20 right-4 z-50 bg-yellow-100 border-2 border-yellow-400 px-3 py-1 rounded text-xs font-mono font-bold">
          Analyzer Variant: first_time
        </div>
      )}
      <ResearchPage mode="first-time" />
    </>
  )
}

