'use client'

import { ResponseClassification } from '@/lib/simulation/live-pressure-engine'

interface FeedbackPanelProps {
  classification: ResponseClassification
  reasons: string[]
}

export default function FeedbackPanel({ classification, reasons }: FeedbackPanelProps) {
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
  
  return (
    <div className={`mt-4 p-4 rounded-lg border-2 ${
      classification === 'strong' ? 'bg-green-50 border-green-200' :
      classification === 'weak' ? 'bg-red-50 border-red-200' :
      'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-1 text-xs font-semibold rounded border ${badgeColors[classification]}`}>
          {badgeLabels[classification]}
        </span>
      </div>
      
      <ul className="space-y-1">
        {reasons.map((reason, index) => (
          <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
            <span className="text-gray-500 mt-0.5">•</span>
            <span>{reason}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}


