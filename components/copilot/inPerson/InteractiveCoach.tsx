'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { parseDealerOTDFromText, detectTacticsFromText } from '@/lib/copilot/in_person/stateEngine'

interface InteractiveCoachProps {
  onQuickAction: (action: string) => void
  onStructuredInput: (message: string, detectedOTD: number | null) => void
  loading?: boolean
}

export default function InteractiveCoach({
  onQuickAction,
  onStructuredInput,
  loading = false,
}: InteractiveCoachProps) {
  const [coachInput, setCoachInput] = useState('')

  const quickActions = [
    { id: 'counter', label: "They countered — what do I do?" },
    { id: 'monthly', label: "They mentioned monthly payments" },
    { id: 'addons', label: "They added add-ons" },
    { id: 'walk', label: "Should I walk?" },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!coachInput.trim() || loading) return

    const message = coachInput.trim()
    // Parse for dollar amounts - extract the most likely OTD
    const detectedOTD = parseDealerOTDFromText(message)
    
    // Also detect tactics from the message
    const tactics = detectTacticsFromText(message)
    
    setCoachInput('')
    // Pass both the message and detected OTD
    onStructuredInput(message, detectedOTD)
  }

  return (
    <Card>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Ask the Coach</h3>
      
      {/* Quick Buttons */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Quick Actions
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant="secondary"
              size="sm"
              onClick={() => onQuickAction(action.id)}
              disabled={loading}
              className="text-left justify-start"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Structured Input */}
      <form onSubmit={handleSubmit}>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Describe what happened
        </label>
        <textarea
          value={coachInput}
          onChange={(e) => setCoachInput(e.target.value)}
          placeholder="Paste what they said or describe the situation..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
          rows={3}
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-1 mb-2">
          Tip: Include dollar amounts to auto-update dealer OTD
        </p>
        <Button
          type="submit"
          disabled={!coachInput.trim() || loading}
          className="w-full sm:w-auto"
        >
          {loading ? 'Processing...' : 'Get Coach Guidance'}
        </Button>
      </form>
    </Card>
  )
}

