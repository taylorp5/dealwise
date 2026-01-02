'use client'

import { useEffect } from 'react'
import CalculatorPage from '../page'

export default function InPersonCalculatorPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected_pack_id', 'in_person')
    }
  }, [])

  return <CalculatorPage />
}

