'use client'

import { useEffect } from 'react'
import CalculatorPage from '../page'

export default function FreeCalculatorPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected_pack_id', 'free')
    }
  }, [])

  return <CalculatorPage />
}

