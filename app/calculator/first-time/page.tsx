'use client'

import { useEffect } from 'react'
import CalculatorPage from '../page'

export default function FirstTimeCalculatorPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected_pack_id', 'first_time')
    }
  }, [])

  return <CalculatorPage />
}

