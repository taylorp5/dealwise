'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { NegotiationSession, SessionMessage, CopilotResponse } from '@/lib/types/copilot'

export default function CopilotSessionPage(props: { params: { sessionId: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [session, setSession] = useState<NegotiationSession | null>(null)
  const [messages, setMessages] = useState<SessionMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [messageType, setMessageType] = useState<'user' | 'dealer'>('dealer')
  const [error, setError] = useState<string | null>(null)
  
  const sessionId = props.params.sessionId

  useEffect(() => {
    if (user && sessionId) {
      fetchSession()
    }
  }, [user, sessionId])

  const fetchSession = async () => {
    if (!sessionId) return
    try {
      const response = await fetch(`/api/copilot/sessions/${sessionId}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load session')
      }

      setSession(data.session)
      setMessages(data.messages || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load session')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitMessage = async () => {
    if (!newMessage.trim()) return

    setSubmitting(true)
    setError(null)

    if (!sessionId) return
    try {
      const response = await fetch(`/api/copilot/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: messageType,
          content: newMessage,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to send message')
      }

      // Refresh messages
      await fetchSession()
      setNewMessage('')
    } catch (err: any) {
      setError(err.message || 'Failed to send message')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
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
          <a href="/login" className="text-blue-600 hover:text-blue-700">
            Sign In
          </a>
        </div>
      </div>
    )
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="bg-red-50 border-red-200">
          <p className="text-red-700">{error}</p>
          <Button onClick={() => router.push('/copilot/new')} className="mt-4">
            Start New Session
          </Button>
        </Card>
      </div>
    )
  }

  const lastCopilotMessage = [...messages].reverse().find((m) => m.role === 'copilot')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header */}
        <div className="mb-6">
          <Button variant="secondary" onClick={() => router.push('/copilot/new')} className="mb-4">
            ← New Session
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {session?.car_make && session?.car_model
              ? `${session.car_make} ${session.car_model}`
              : 'Negotiation Session'}
          </h1>
          {session && (
            <p className="text-gray-600">
              {session.pack_type} • {session.communication_method} • {session.current_stage}
            </p>
          )}
        </div>

        {error && (
          <Card className="bg-red-50 border-red-200 mb-6">
            <p className="text-red-700">{error}</p>
          </Card>
        )}

        {/* Initial Strategy */}
        {session?.initial_strategy && messages.length === 0 && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Strategy</h2>
            <div className="space-y-4">
              {session.initial_strategy.summary && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Overview</h3>
                  <p className="text-sm text-gray-700">{session.initial_strategy.summary}</p>
                </div>
              )}
              {session.initial_strategy.key_points && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Key Points</h3>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {session.initial_strategy.key_points.map((point: string, i: number) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {session.initial_script && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Your Initial Message</h3>
                  <div className="bg-white border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {session.initial_script}
                    </p>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        navigator.clipboard.writeText(session.initial_script || '')
                        alert('Copied to clipboard!')
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Message History */}
        <div className="space-y-4 mb-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card
                className={`max-w-3xl ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.role === 'dealer'
                    ? 'bg-gray-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-medium opacity-75">
                    {message.role === 'user'
                      ? 'You'
                      : message.role === 'dealer'
                      ? 'Dealer'
                      : 'Co-Pilot'}
                  </span>
                  <span className="text-xs opacity-75">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* Copilot-specific info */}
                {message.role === 'copilot' && (
                  <div className="mt-4 space-y-3 pt-4 border-t border-green-300">
                    {message.tactic_explanation && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-900 mb-1">
                          What the dealer is doing:
                        </h4>
                        <p className="text-xs text-gray-700">{message.tactic_explanation}</p>
                      </div>
                    )}

                    {message.recommended_response && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-900 mb-1">
                          Recommended Response:
                        </h4>
                        <div className="bg-white border border-green-200 rounded p-2">
                          <p className="text-xs text-gray-700 whitespace-pre-wrap">
                            {message.recommended_response}
                          </p>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="mt-2"
                            onClick={() => {
                              navigator.clipboard.writeText(message.recommended_response || '')
                              alert('Copied to clipboard!')
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    )}

                    {message.suggested_counter_range && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-900 mb-1">
                          Suggested Counter Range:
                        </h4>
                        <p className="text-xs text-gray-700">
                          ${message.suggested_counter_range.min.toLocaleString()} - $
                          {message.suggested_counter_range.max.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 italic">
                          {message.suggested_counter_range.rationale}
                        </p>
                      </div>
                    )}

                    {message.next_questions && message.next_questions.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-900 mb-1">
                          Next Questions to Ask:
                        </h4>
                        <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                          {message.next_questions.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {message.checklist_items && message.checklist_items.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-900 mb-1">Checklist:</h4>
                        <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                          {message.checklist_items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>

        {/* Next Step Section */}
        {lastCopilotMessage && (
          <Card className="mb-6 bg-yellow-50 border-yellow-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Next Step</h2>
            {lastCopilotMessage.recommended_response && (
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-2">Your recommended response:</p>
                <div className="bg-white border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {lastCopilotMessage.recommended_response}
                  </p>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Input Form */}
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What happened? (Paste dealer message or describe in-person interaction)
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setMessageType('dealer')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    messageType === 'dealer'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Dealer Message
                </button>
                <button
                  onClick={() => setMessageType('user')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    messageType === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  What I Said
                </button>
              </div>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={
                  messageType === 'dealer'
                    ? 'Paste the dealer\'s message here...'
                    : 'Describe what you said or what happened...'
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <Button
              onClick={handleSubmitMessage}
              disabled={!newMessage.trim() || submitting}
              className="w-full"
            >
              {submitting ? 'Processing...' : 'Get Co-Pilot Response'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

