'use client'

import CalculatorPage from '../page'

export default function FreeCalculatorPage() {
  // Set localStorage synchronously before render so CalculatorPage can read it immediately
  if (typeof window !== 'undefined') {
    localStorage.setItem('selected_pack_id', 'free')
  }

  return <CalculatorPage />
}

