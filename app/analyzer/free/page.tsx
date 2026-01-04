'use client'

import { Suspense } from 'react'
import ResearchPageContent from '@/components/ResearchPageContent'
import { isDevUIEnabled } from '@/lib/utils/dev-ui'

function FreeAnalyzerContent() {
  return (
    <>
      {/* Debug label - dev only */}
      {isDevUIEnabled() && (
        <div className="fixed top-20 right-4 z-50 bg-yellow-100 border-2 border-yellow-400 px-3 py-1 rounded text-xs font-mono font-bold">
          Analyzer Variant: free
        </div>
      )}
      <ResearchPageContent mode="free" />
    </>
  )
}

export default function FreeAnalyzerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div><p className="text-gray-600">Loading...</p></div></div>}>
      <FreeAnalyzerContent />
    </Suspense>
  )
}

