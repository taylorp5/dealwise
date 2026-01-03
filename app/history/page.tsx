'use client'

import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="text-center py-16">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-4">
              <svg
                className="w-10 h-10 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Deal History</h1>
            <p className="text-xl text-gray-600 mb-8">Coming Soon</p>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              We're building a feature to help you track and review your past negotiations and analyses. 
              This will help you learn from previous deals and make better decisions in the future.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => router.push('/research')}>
                Analyze a Listing
              </Button>
              <Button variant="secondary" onClick={() => router.push('/copilot/free')}>
                Try Negotiation Draft Builder
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}






