'use client'

import CalculatorPage from '@/components/CalculatorPage'

export default function FreeCalculatorPage() {
  // Simple route page - no localStorage, no hooks, just pass the variant
  return <CalculatorPage initialVariant="free" />
}

