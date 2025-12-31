'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2 } from 'lucide-react'
import Card from './ui/Card'
import Button from './ui/Button'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface AdvisorChatProps {
  listingUrl: string
  context: {
    state?: string
    vehiclePrice?: number
    estimatedFairPrice?: number
    vehicleType?: string
    hasOTD?: boolean
    dealerName?: string
    dealerState?: string
    trim?: string
  }
}

const SUGGESTED_QUESTIONS = [
  'What does APR actually mean?',
  'What\'s included in OTD?',
  'Can dealers remove add-ons?',
  'Is this a good deal for me?',
  'Should I finance or pay cash?',
  'Which fees are negotiable?',
]

const STORAGE_KEY_PREFIX = 'advisor_chat_'

export default function AdvisorChat({ listingUrl, context }: AdvisorChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Load chat history from localStorage
  useEffect(() => {
    const storageKey = `${STORAGE_KEY_PREFIX}${listingUrl}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setMessages(parsed)
      } catch (e) {
        console.error('Failed to load chat history', e)
      }
    }
  }, [listingUrl])

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      const storageKey = `${STORAGE_KEY_PREFIX}${listingUrl}`
      localStorage.setItem(storageKey, JSON.stringify(messages))
    }
  }, [messages, listingUrl])

  // Auto-scroll to bottom when new messages arrive (only within chat container)
  useEffect(() => {
    if (chatContainerRef.current) {
      // Scroll within the chat container, not the whole page
      const scrollToBottom = () => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
      }
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        setTimeout(scrollToBottom, 50)
      })
    }
  }, [messages])

  const handleSend = async (question?: string) => {
    const userMessage = question || input.trim()
    if (!userMessage || loading) return

    // Add user message
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, newUserMessage])
    setInput('')
    setError(null)
    setLoading(true)

    // Scroll to keep chat visible after adding user message
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      }
    }, 50)

    // Add placeholder assistant message for streaming
    const assistantMessageId = Date.now()
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '', timestamp: assistantMessageId },
    ])

    try {
      const response = await fetch('/api/advisor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, newUserMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context,
          mode: 'first_time_listing',
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed: ${response.status}`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let assistantContent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim() === '') continue
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              continue
            }
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                assistantContent += parsed.content
                // Update the assistant message in real-time
                setMessages((prev) => {
                  const updated = [...prev]
                  const lastIndex = updated.length - 1
                  if (updated[lastIndex]?.role === 'assistant') {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      content: assistantContent,
                    }
                  }
                  return updated
                })
                // Scroll within chat container as content streams
                if (chatContainerRef.current) {
                  chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
                }
              }
            } catch (e) {
              // Skip invalid JSON - might be partial chunk
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const data = buffer.replace('data: ', '').trim()
        if (data && data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              assistantContent += parsed.content
            }
          } catch (e) {
            // Ignore parse errors for trailing data
          }
        }
      }

      // Final update to ensure complete message
      setMessages((prev) => {
        const updated = [...prev]
        const lastIndex = updated.length - 1
        if (updated[lastIndex]?.role === 'assistant') {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: assistantContent,
          }
        }
        return updated
      })
    } catch (err: any) {
      setError(err.message || 'Failed to get response')
      // Remove the placeholder assistant message on error
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
    handleSend(question)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        First-Time Buyer Advisor
      </h3>
      <p className="text-sm text-gray-700 mb-4">
        Ask me anything about this car deal.<br />
        I'll explain fees, financing, and dealer tactics — including the things salespeople usually don't say out loud.
      </p>

      {/* Suggested Questions - Always Visible */}
      <div className="mb-4">
        <p className="text-xs text-gray-600 mb-2 font-medium">Popular questions to get started:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleSuggestedQuestion(q)}
              disabled={loading}
              className="px-3 py-1.5 text-xs bg-white border border-gray-300 hover:bg-gray-50 hover:border-primary rounded-full text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div
        ref={chatContainerRef}
        className="bg-white rounded-lg border border-gray-200 p-4 mb-4 h-96 overflow-y-auto scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-gray-500 mb-4">Start a conversation by asking a question or clicking one above</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              // Always show user messages, skip only empty assistant placeholder messages
              if (message.role === 'user' && message.content) {
                // User message - always show
                return (
                  <div
                    key={`${message.timestamp}-${index}`}
                    className="flex justify-end"
                  >
                    <div className="max-w-[80%] rounded-lg p-3 text-white" style={{ backgroundColor: '#2563EB' }}>
                      <p className="text-sm whitespace-pre-wrap text-white">{message.content}</p>
                    </div>
                  </div>
                )
              }
              
              // Assistant message
              if (message.role === 'assistant') {
                // Skip empty placeholder messages
                if (!message.content) {
                  return null
                }
                return (
                  <div
                    key={`${message.timestamp}-${index}`}
                    className="flex justify-start"
                  >
                    <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-900">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                )
              }
              
              return null
            })}
            {loading && messages.length > 0 && messages[messages.length - 1]?.content === '' && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
          rows={2}
          disabled={loading}
        />
        <Button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="px-6"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </Card>
  )
}

