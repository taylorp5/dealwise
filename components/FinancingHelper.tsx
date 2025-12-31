import React from 'react'
import Card from './ui/Card'

interface FinancingHelperProps {
  title?: string
  className?: string
}

export default function FinancingHelper({ title = "Financing & Terms Helper", className = '' }: FinancingHelperProps) {
  return (
    <Card className={`bg-blue-50/50 border border-blue-200 ${className}`}>
      <div className="p-5 lg:p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">{title}</h3>
        <p className="text-sm text-gray-700 mb-4">
          Understanding financing terms is crucial. Here's some educational guidance:
        </p>
        <ul className="space-y-3 text-sm text-gray-700">
          <li>
            <span className="font-medium text-gray-900">APR (Annual Percentage Rate):</span> The annual cost of borrowing money, including interest and other fees. A lower APR means lower monthly payments and less total interest paid.
          </li>
          <li>
            <span className="font-medium text-gray-900">Term Length:</span> The duration of the loan (e.g., 36, 48, 60, 72 months). Longer terms mean lower monthly payments but more total interest paid over time.
          </li>
          <li>
            <span className="font-medium text-gray-900">Dealer Financing vs. Credit Union/Bank:</span> Dealers often offer financing, but it's wise to get pre-approved from your bank or credit union first to compare rates and leverage.
          </li>
          <li>
            <span className="font-medium text-gray-900">Contingencies:</span> Sometimes a low APR is contingent on purchasing additional products (e.g., extended warranty, GAP insurance). Always clarify this.
          </li>
        </ul>
        <p className="mt-4 text-sm text-gray-700 font-medium">
          Questions to ask:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li>"Is this rate contingent on any dealer add-ons or products?"</li>
          <li>"What is the exact APR and term length for this loan?"</li>
          <li>"Can I see a breakdown of all fees included in the financing?"</li>
        </ul>
      </div>
    </Card>
  )
}


