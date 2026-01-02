'use client'

import CalculatorPage from '@/components/CalculatorPage'

export default function InPersonCalculatorPage() {
  // Simple route page - no localStorage, no hooks, just pass the variant
  return <CalculatorPage initialVariant="in_person" />
}

