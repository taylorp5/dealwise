'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CalculatorRedirectPage() {
  const router = useRouter()
  
  // Redirect legacy /calculator route to /calculator/free
  useEffect(() => {
    router.replace('/calculator/free')
  }, [router])
  
  return null
}
