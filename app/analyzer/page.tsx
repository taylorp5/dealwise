'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ResearchPage from '@/app/research/page'

export default function AnalyzerPage() {
  const router = useRouter()
  
  // Redirect legacy /analyzer route to /analyzer/free
  useEffect(() => {
    router.replace('/analyzer/free')
  }, [router])
  
  return null
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [listingUrl, setListingUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalyzeListingResponse['data'] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!listingUrl.trim()) return

    setLoading(true)
    setError(null)

    try {
      // Pass auth token so the API can read the user
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/analyze-listing', {
        method: 'POST',
        headers,
        body: JSON.stringify({ listingUrl }),
      })

      const data: AnalyzeListingResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze listing')
      }

      setResult(data.data)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze listing')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateScript = () => {
    if (result && typeof window !== 'undefined') {
      localStorage.setItem('scriptCarContext', JSON.stringify(result))
      router.push('/script')
    }
  }

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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to use this feature</p>
          <a href="/login" className="text-blue-600 hover:text-blue-700">Sign In</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Listing Analyzer</h1>
          <p className="text-gray-600">Analyze car listings and get AI-powered insights</p>
        </div>

        <Card className="p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Listing URL
              </label>
              <input
                type="url"
                id="url"
                value={listingUrl}
                onChange={(e) => setListingUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Analyzing...' : 'Analyze Listing'}
            </Button>
          </form>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Analysis Results</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.summary}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Price Analysis</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.priceAnalysis}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Market Comparison</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.marketComparison}</p>
                  </div>

                  {result.redFlags && result.redFlags.length > 0 && (
                    <div>
                      <h3 className="font-medium text-red-900 mb-2">⚠️ Red Flags</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                        {result.redFlags.map((flag, i) => (
                          <li key={i}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.greenFlags && result.greenFlags.length > 0 && (
                    <div>
                      <h3 className="font-medium text-green-900 mb-2">✅ Green Flags</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
                        {result.greenFlags.map((flag, i) => (
                          <li key={i}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.recommendations && result.recommendations.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Recommendations</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {result.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.keyPoints && result.keyPoints.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Key Points</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {result.keyPoints.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleGenerateScript}>Generate Negotiation Script</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

