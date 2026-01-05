'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useEntitlements } from '@/hooks/useEntitlements'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Sparkles, Lock } from 'lucide-react'

export default function InPersonCopilotModePicker() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { loading: entitlementsLoading, hasInPerson } = useEntitlements()
  
  // Entitlement guard - wait for entitlements to load before checking
  useEffect(() => {
    if (!authLoading && !entitlementsLoading && !hasInPerson) {
      router.push('/copilot/free')
    }
  }, [authLoading, entitlementsLoading, hasInPerson, router])

  if (authLoading || entitlementsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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

  if (!hasInPerson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">In-Person Negotiation Pack required</p>
          <a href="/packs" className="text-blue-600 hover:text-blue-700">View Packs</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">In-Person Negotiation Pack</h1>
          <p className="text-lg text-gray-600">Choose your path</p>
        </div>

        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Prepare Mode */}
          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Prepare Me</h2>
              <p className="text-gray-600">Before the dealership</p>
            </div>
            
            <p className="text-sm text-gray-700 mb-6 text-center max-w-md mx-auto">
              Get ready before you walk in. Set your numbers, learn what to say, and build a clear negotiation plan.
            </p>

            <div className="flex justify-center">
              <Button
                onClick={() => router.push('/copilot/in-person/prepare')}
                className="w-full max-w-xs"
              >
                Start Preparing
              </Button>
            </div>
          </Card>

          {/* Live Pressure Mode - V2 Feature */}
          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Live Pressure Mode</h2>
              <p className="text-gray-600">Practice handling dealer pressure</p>
            </div>
            
            <p className="text-sm text-gray-700 mb-6 text-center max-w-md mx-auto">
              Interactive simulation where you respond to dealer pressure tactics. Get real-time feedback on your responses and see how they affect negotiation leverage.
            </p>

            <ul className="space-y-2 mb-6 text-sm text-gray-700 max-w-md mx-auto">
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-0.5">•</span>
                <span>Practice responding to scarcity, authority, and urgency tactics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-0.5">•</span>
                <span>See real-time leverage meter updates</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-0.5">•</span>
                <span>Get instant feedback on strong vs. weak responses</span>
              </li>
            </ul>

            <div className="flex justify-center">
              <Button
                onClick={() => router.push('/copilot/in-person/live-pressure')}
                className="w-full max-w-xs"
              >
                Start Practice
              </Button>
            </div>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Best used before you walk in and between rounds. Not designed for live typing mid-conversation.
          </p>
        </div>
      </div>
    </div>
  )
}
