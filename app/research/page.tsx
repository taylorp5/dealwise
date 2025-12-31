'use client'

import { Suspense } from 'react'
import ResearchPageContent from '@/components/ResearchPageContent'

// Next.js page component - must accept no props to satisfy PageProps constraint
// This route defaults to free mode (no pack enhancements)
function ResearchPageContentWrapper() {
  return <ResearchPageContent />
}

export default function ResearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div><p className="text-gray-600">Loading...</p></div></div>}>
      <ResearchPageContentWrapper />
    </Suspense>
  )
}
