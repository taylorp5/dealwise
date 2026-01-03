'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

type Topic = 'Bug' | 'Billing' | 'Feature request' | 'Other'

export default function SupportPage() {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState<Topic>('Bug')
  const [message, setMessage] = useState('')
  const [pageUrl, setPageUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-fill page URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPageUrl(window.location.href)
    }
  }, [])

  // Auto-fill email if user is logged in
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email)
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    // Basic client-side validation
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address')
      setSubmitting(false)
      return
    }

    if (!message.trim()) {
      setError('Please enter a message')
      setSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          topic,
          message: message.trim(),
          pageUrl: pageUrl.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      setSuccess(true)
      setEmail('')
      setTopic('Bug')
      setMessage('')
      setPageUrl('')
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Support</h1>
          <p className="text-gray-600 mb-6">
            Send us a message and we'll reply to the email you provide.
          </p>

          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800">
                Message received. We'll reply to your email.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                  Topic <span className="text-red-500">*</span>
                </label>
                <select
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value as Topic)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Bug">Bug</option>
                  <option value="Billing">Billing</option>
                  <option value="Feature request">Feature request</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your issue or question..."
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}

