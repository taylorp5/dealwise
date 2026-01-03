'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Card from './ui/Card'
import Button from './ui/Button'
import { useEntitlements } from '@/hooks/useEntitlements'
import { packs as packConfigs } from '@/lib/packs/config'

interface PackGateProps {
  packId: string
  children: ReactNode
  fallback?: ReactNode
  showUpgrade?: boolean
}

export default function PackGate({ packId, children, fallback, showUpgrade = true }: PackGateProps) {
  const router = useRouter()
  const packConfig = packConfigs[packId]
  const { hasFirstTime, hasInPerson, hasBundle, loading } = useEntitlements()
  
  // Determine if pack is unlocked based on Supabase entitlements
  const isUnlocked = (() => {
    if (loading) return false // Don't show content while loading
    if (packId === 'first_time') return hasFirstTime
    if (packId === 'in_person') return hasInPerson
    if (packId === 'bundle' || packId === 'bundle_both') return hasBundle || (hasFirstTime && hasInPerson)
    return false
  })()

  if (isUnlocked) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <Card className="p-6 border-2 border-gray-300 bg-gray-50">
      <div className="text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {packConfig?.name || 'Premium Feature'} Locked
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {packConfig?.description || 'This feature requires a pack to unlock.'}
        </p>
        {packConfig?.features && (
          <div className="mb-4 text-left">
            <p className="text-xs font-medium text-gray-700 mb-2">This pack includes:</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
              {packConfig.features.slice(0, 3).map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </div>
        )}
        {showUpgrade && (
          <Button onClick={() => router.push('/packs')} className="w-full">
            Unlock {packConfig?.name || 'Pack'}
          </Button>
        )}
      </div>
    </Card>
  )
}






