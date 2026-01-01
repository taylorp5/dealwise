'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect old /copilot route to /copilot/free
export default function CopilotRedirectPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/copilot/free')
  }, [router])
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}






