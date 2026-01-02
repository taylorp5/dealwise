'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * First-Time Buyer Negotiation Draft Builder has been removed.
 * Redirect to the First-Time Buyer Listing Analyzer (Deal Readiness Assessment).
 */
export default function FirstTimeCopilotRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/analyzer/first-time')
  }, [router])
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Redirecting to Deal Readiness Assessment...</p>
      </div>
    </div>
  )
}

