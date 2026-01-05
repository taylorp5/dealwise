'use client'

import { ResponseClassification, UserIntent } from '@/lib/simulation/live-pressure-engine'

interface FeedbackPanelProps {
  classification: ResponseClassification
  intent?: UserIntent
  reasons: string[]
  tryInstead?: string
  dealerTranslation?: string
  costOfMistake?: string
}

export default function FeedbackPanel({ 
  classification, 
  intent, 
  reasons, 
  tryInstead, 
  dealerTranslation, 
  costOfMistake 
}: FeedbackPanelProps) {
  const badgeColors = {
    strong: 'bg-green-100 text-green-800 border-green-300',
    neutral: 'bg-gray-100 text-gray-800 border-gray-300',
    weak: 'bg-red-100 text-red-800 border-red-300',
  }
  
  const badgeLabels = {
    strong: 'Strong',
    neutral: 'Neutral',
    weak: 'Weak',
  }
  
  const intentLabels: Record<UserIntent, string> = {
    ask_breakdown: 'Asking for Breakdown',
    hold_line: 'Holding Your Line',
    concede: 'Conceding',
    ask_payment: 'Asking About Payment',
    pushback_addons: 'Pushing Back on Add-ons',
    trade_in: 'Mentioning Trade-in',
    walk_away: 'Walking Away',
    neutral: 'Neutral',
  }
  
  return (
    <div className={`mt-4 p-4 rounded-lg border-2 ${
      classification === 'strong' ? 'bg-green-50 border-green-200' :
      classification === 'weak' ? 'bg-red-50 border-red-200' :
      'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`px-2 py-1 text-xs font-semibold rounded border ${badgeColors[classification]}`}>
          {badgeLabels[classification]}
        </span>
        {intent && intent !== 'neutral' && (
          <span className="px-2 py-1 text-xs font-medium rounded border bg-blue-50 text-blue-700 border-blue-200">
            {intentLabels[intent]}
          </span>
        )}
      </div>
      
      <ul className="space-y-1 mb-3">
        {reasons.map((reason, index) => (
          <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
            <span className="text-gray-500 mt-0.5">•</span>
            <span>{reason}</span>
          </li>
        ))}
      </ul>
      
      {/* Try Instead Suggestion */}
      {tryInstead && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-blue-700 mt-0.5">💡 Try instead:</span>
            <p className="text-sm text-gray-800 flex-1 italic">{tryInstead}</p>
          </div>
        </div>
      )}
      
      {/* Dealer Translation */}
      {dealerTranslation && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-amber-700 mt-0.5">🎭 What they mean:</span>
            <p className="text-sm text-gray-800 flex-1 italic">{dealerTranslation}</p>
          </div>
        </div>
      )}
      
      {/* Cost of Mistake (only for weak responses) */}
      {costOfMistake && (
        <div className="mt-3 pt-3 border-t border-red-200">
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-red-700 mt-0.5">💰 Cost of mistake:</span>
            <p className="text-sm text-red-800 flex-1 font-medium">{costOfMistake}</p>
          </div>
        </div>
      )}
    </div>
  )
}



