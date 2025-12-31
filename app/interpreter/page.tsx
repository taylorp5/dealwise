'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

function InterpreterContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Check for pre-filled message from URL params
    const urlMessage = searchParams?.get('message')
    if (urlMessage) {
      setMessage(urlMessage)
    }
  }, [searchParams])

  useEffect(() => {
    // Auto-redirect to Copilot with message pre-filled
    if (user && !authLoading) {
      if (message) {
        // Store message in localStorage for Copilot to pick up
        localStorage.setItem('copilot_prefilled_message', message)
      }
      router.replace('/copilot/free')
    }
  }, [user, authLoading, message, router])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Redirecting to Negotiation Draft Builder...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to use this feature</p>
          <a href="/login" className="text-blue-600 hover:text-blue-700">Sign In</a>
        </div>
      </div>
    )
  }

  // Show a simple message while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="p-8 max-w-md text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Redirecting to Negotiation Draft Builder</h2>
        <p className="text-gray-600 mb-4">
          The Message Interpreter has been integrated into the Negotiation Draft Builder.
        </p>
        <Button onClick={() => router.push('/copilot/free')}>
          Go to Negotiation Draft Builder
        </Button>
      </Card>
    </div>
  )
}

export default function InterpreterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div><p className="text-gray-600">Loading...</p></div></div>}>
      <InterpreterContent />
    </Suspense>
  )
}
