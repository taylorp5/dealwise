'use client'

import CalculatorPage from '@/components/CalculatorPage'

export default function FirstTimeCalculatorPage() {
  // Simple route page - no localStorage, no hooks, just pass the variant
  return <CalculatorPage initialVariant="first_time" />
}

