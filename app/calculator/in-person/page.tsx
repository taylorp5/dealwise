'use client'

import CalculatorPage from '../page'

export default function InPersonCalculatorPage() {
  // Set localStorage synchronously before render so CalculatorPage can read it immediately
  if (typeof window !== 'undefined') {
    localStorage.setItem('selected_pack_id', 'in_person')
  }

  return <CalculatorPage />
}

