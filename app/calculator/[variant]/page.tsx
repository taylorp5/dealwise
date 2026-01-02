'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CalculatorPage from '@/components/CalculatorPage'
import { hasPack, hasAllAccess } from '@/lib/packs/entitlements'

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

  // Route guarding: Check entitlements for paid routes
  useEffect(() => {
    if (initialVariant === 'first_time') {
      const hasFirstTimeEntitlement = hasPack('first_time') || hasAllAccess()
      if (!hasFirstTimeEntitlement) {
        // Redirect to packs page if no entitlement
        router.replace('/packs')
      }
    } else if (initialVariant === 'in_person') {
      const hasInPersonEntitlement = hasPack('in_person') || hasAllAccess()
      if (!hasInPersonEntitlement) {
        // Redirect to packs page if no entitlement
        router.replace('/packs')
      }
    }
    // Free variant is always accessible, no check needed
  }, [initialVariant, router])

  return <CalculatorPage initialVariant={initialVariant} />
}

