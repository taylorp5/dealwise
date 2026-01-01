'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ScriptWizard from '@/components/ScriptWizard'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

const supabase = createBrowserSupabaseClient()

export default function ScriptPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [prefilledDealId, setPrefilledDealId] = useState<string | null>(null)
  const [prefilledCarContext, setPrefilledCarContext] = useState<string | null>(null)
  const [activePackId, setActivePackId] = useState<string | null>(null)
  const [unlockedPackIds, setUnlockedPackIds] = useState<string[]>([])
  const [packsLoading, setPacksLoading] = useState<boolean>(false)
  const [packsError, setPacksError] = useState<string | null>(null)

  // Check for pre-filled data from analyzer page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedContext = localStorage.getItem('scriptCarContext')
      const savedDealId = localStorage.getItem('scriptDealId')

      if (savedContext) {
        setPrefilledCarContext(savedContext)
        localStorage.removeItem('scriptCarContext')
      }
      if (savedDealId) {
        setPrefilledDealId(savedDealId)
        localStorage.removeItem('scriptDealId')
      }
    }
  }, [])

  // Fetch packs status
  useEffect(() => {
    const fetchPacks = async () => {
      setPacksLoading(true)
      setPacksError(null)
      try {
        const res = await fetch('/api/packs')
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Failed to load packs')
        setActivePackId(data.selectedPackId || null)
        const unlocked = (data.userPacks || [])
          .filter((p: any) => p.isUnlocked)
          .map((p: any) => p.packId || p.pack_id)
        setUnlockedPackIds(unlocked)
      } catch (err: any) {
        setPacksError(err.message || 'Failed to load packs')
      } finally {
        setPacksLoading(false)
      }
    }
    fetchPacks()
  }, [])

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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to use this feature</p>
          <a href="/login" className="text-blue-600 hover:text-blue-700">
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="mb-8">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/')}
            className="mb-4"
          >
            ← Back to Home
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Negotiation Script Generator</h1>
          <p className="text-gray-600">Generate personalized negotiation scripts tailored to your situation</p>
        </div>

        {prefilledCarContext && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Car details pre-filled from your analysis
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  The wizard will use this information to personalize your script.
                </p>
              </div>
            </div>
          </div>
        )}

        {packsError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {packsError}
          </div>
        )}

        <ScriptWizard
          user={user}
          initialCarContext={prefilledCarContext}
          prefilledDealId={prefilledDealId}
          onCancel={() => router.push('/')}
          activePackId={activePackId}
          unlockedPackIds={unlockedPackIds}
        />
      </div>
    </div>
  )
}
