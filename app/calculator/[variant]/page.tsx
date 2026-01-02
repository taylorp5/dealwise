'use client'

import { useParams } from 'next/navigation'
import CalculatorPage from '@/components/CalculatorPage'

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
  const urlVariant = params?.variant
  const initialVariant = mapVariantFromUrl(urlVariant)

  return <CalculatorPage initialVariant={initialVariant} />
}

