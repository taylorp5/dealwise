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

          {/* Dealer Simulation - Coming Soon */}
          <Card className="p-8 bg-gradient-to-br from-slate-50 to-slate-100/50 border-2 border-slate-200 relative overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full blur-2xl opacity-50"></div>
            
            <div className="relative">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-slate-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-gray-900">Dealer Simulation (Coming Soon)</h2>
                    <span className="px-2 py-0.5 text-xs font-semibold text-slate-700 bg-slate-200 border border-slate-300 rounded-md">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Practice negotiating with a realistic dealer before you step into the showroom.
                  </p>
                </div>
              </div>

              <ul className="space-y-2 mb-4 ml-16">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-slate-500 mt-0.5">•</span>
                  <span>Simulate real dealer responses to your offers</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-slate-500 mt-0.5">•</span>
                  <span>Practice handling add-ons, manager pressure, and urgency tactics</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-slate-500 mt-0.5">•</span>
                  <span>Get feedback on how to strengthen your responses</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-slate-500 mt-0.5">•</span>
                  <span>Build confidence before negotiating in person</span>
                </li>
              </ul>

              <div className="ml-16 pt-4 border-t border-slate-200">
                <p className="text-xs text-gray-600 italic">
                  Included with this pack when released. No additional purchase required.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  This feature is designed for preparation — not live dealership use.
                </p>
              </div>
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
