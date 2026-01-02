'use client'

import CalculatorPage from '../page'

export default function FirstTimeCalculatorPage() {
  // Set localStorage synchronously before render so CalculatorPage can read it immediately
  if (typeof window !== 'undefined') {
    localStorage.setItem('selected_pack_id', 'first_time')
  }

  return <CalculatorPage />
}

