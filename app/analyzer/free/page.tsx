'use client'

import ResearchPage from '@/app/research/page'

export default function FreeAnalyzerPage() {
  return (
    <>
      {/* Debug label - dev only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-20 right-4 z-50 bg-yellow-100 border-2 border-yellow-400 px-3 py-1 rounded text-xs font-mono font-bold">
          Analyzer Variant: free
        </div>
      )}
      <ResearchPage mode="free" />
    </>
  )
}

