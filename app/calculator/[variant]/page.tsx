'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CalculatorPage from '@/components/CalculatorPage'
import { useEntitlements } from '@/hooks/useEntitlements'

// Map URL variant to internal variant format
function mapVariantFromUrl(urlVariant: string | string[] | undefined): 'free' | 'first_time' | 'in_person' {
  const variant = Array.isArray(urlVariant) ? urlVariant[0] : urlVariant
  
  switch (variant) {
    case 'first-time':
      return 'first_time'
    case 'in-person':
      return 'in_person'
    case 'free':
    default:
      return 'free'
  }
}

export default function VariantCalculatorPage() {
  const params = useParams()
  const router = useRouter()
  const urlVariant = params?.variant
  const initialVariant = mapVariantFromUrl(urlVariant)
  const { hasFirstTime, hasInPerson, loading } = useEntitlements()

  // Route guarding: Check entitlements for paid routes
  useEffect(() => {
    if (loading) return // Wait for entitlements to load
    
    if (initialVariant === 'first_time') {
      if (!hasFirstTime) {
        // Redirect to packs page if no entitlement
        router.replace('/packs')
      }
    } else if (initialVariant === 'in_person') {
      if (!hasInPerson) {
        // Redirect to packs page if no entitlement
        router.replace('/packs')
      }
    }
    // Free variant is always accessible, no check needed
  }, [initialVariant, router, hasFirstTime, hasInPerson, loading])

  return <CalculatorPage initialVariant={initialVariant} />
}

