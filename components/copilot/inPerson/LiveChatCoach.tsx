'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

const supabase = createBrowserSupabaseClient()

interface LiveChatCoachProps {
  dealState: {
    vehiclePrice?: number
    targetOTD?: number
    walkAwayOTD?: number
    dealerCurrentOTD?: number
    lastDealerOTD?: number
    stateCode?: string
    currentSituation?: string
    timelineEvents?: Array<{ ts: number; who: string; label: string; details?: string }>
    ladder?: { ask: number; agree: number; walk: number; locked: boolean }
  }
  onDealStateUpdate?: (dealerOTD: number) => void
}

interface ChatMessage {
  role: 'user' | 'coach'
  content: string
  timestamp: number
  talkTrack?: string
}

const QUICK_ACTIONS = [
  { id: 'counter', label: "They countered — what do I do?" },
  { id: 'monthly', label: "They mentioned monthly payments" },
  { id: 'addons', label: "They added add-ons" },
  { id: 'walk', label: "Should I walk?" },
]

export default function LiveChatCoach({ dealState, onDealStateUpdate }: LiveChatCoachProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleQuickAction = (actionId: string) => {
    const actionMessages: Record<string, string> = {
      counter: "They countered — what do I do?",
      monthly: "They mentioned monthly payments",
      addons: "They added add-ons",
      walk: "Should I walk?",
    }
    setInput(actionMessages[actionId] || '')
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/copilot/in-person/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMessage.content,
          dealState,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed: ${response.status}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to get response')
      }

      const coachMessage: ChatMessage = {
        role: 'coach',
        content: data.data.reply,
        timestamp: Date.now(),
        talkTrack: data.data.suggestedTalkTrack || undefined,
      }

      setMessages(prev => [...prev, coachMessage])

      // Update deal state if OTD detected
      if (data.data.updateDealState?.dealerOTD && onDealStateUpdate) {
        onDealStateUpdate(data.data.updateDealState.dealerOTD)
      }

      // If there's a next question, add it as a follow-up
      if (data.data.nextQuestion) {
        setTimeout(() => {
          setInput(data.data.nextQuestion!)
        }, 500)
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        role: 'coach',
        content: `Error: ${err.message || 'Failed to get response'}`,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Ask the Coach (Live)</h3>
      
      {/* Quick Actions */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Quick Actions</label>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action.id)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="mb-4 max-h-64 overflow-y-auto space-y-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Ask the coach a question or use a quick action above.
          </p>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-orange-100 text-gray-900'
                    : 'bg-white border border-gray-300 text-gray-900'
                }`}
              >
                <p>{msg.content}</p>
                {msg.talkTrack && (
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Say This:</p>
                    <p className="text-xs font-bold text-orange-600">{msg.talkTrack}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
        className="space-y-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the coach..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none text-sm"
          rows={2}
          disabled={loading}
        />
        <Button
          type="submit"
          disabled={!input.trim() || loading}
          size="sm"
          className="w-full"
        >
          {loading ? 'Asking...' : 'Ask Coach'}
        </Button>
      </form>
    </Card>
  )
}






