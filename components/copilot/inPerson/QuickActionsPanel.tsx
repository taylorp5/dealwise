'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

const QUICK_ACTIONS = [
  { id: 'monthly_payment', label: "They asked: what monthly payment do you want?" },
  { id: 'no_otd_unless_come_in', label: "They won't give OTD unless I come in" },
  { id: 'mandatory_addons', label: "They added mandatory add-ons" },
  { id: 'fees_non_negotiable', label: "They say fees are non-negotiable" },
  { id: 'manager', label: "They brought the manager" },
  { id: 'urgency', label: "They say someone else is interested / urgency" },
  { id: 'sign_today', label: "They ask me to sign today" },
  { id: 'counter_otd', label: "They offered counter OTD" },
  { id: 'trade_in_lowball', label: "Trade-in lowball" },
  { id: 'close_if_hit_otd', label: "I want to close if they hit my OTD" },
]

interface QuickActionsPanelProps {
  onSelect: (actionId: string) => void
  disabled?: boolean
}

export default function QuickActionsPanel({ onSelect, disabled = false }: QuickActionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
        disabled={disabled}
      >
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions (Optional)</h3>
        <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
      </button>
      
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-3">
            Select a situation to jump ahead. This is optional—the guided flow will help you through each step.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.id}
                variant="secondary"
                size="sm"
                onClick={() => onSelect(action.id)}
                disabled={disabled}
                className="text-left justify-start text-sm"
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}






