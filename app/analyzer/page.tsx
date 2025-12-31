'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AnalyzerPage() {
  const router = useRouter()
  
  // Redirect legacy /analyzer route to /analyzer/free
  useEffect(() => {
    router.replace('/analyzer/free')
  }, [router])
  
  return null
}

