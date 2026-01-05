'use client'

import { LeverageState } from '@/lib/simulation/live-pressure-engine'

interface LeverageMeterProps {
  leverage: LeverageState
}

export default function LeverageMeter({ leverage }: LeverageMeterProps) {
  // Convert leverage (-2 to +2) to percentage (0% to 100%)
  // -2 = 0%, -1 = 25%, 0 = 50%, +1 = 75%, +2 = 100%
  const percentage = ((leverage + 2) / 4) * 100
  
  // Determine which side is dominant
  const isDealerControl = leverage <= -1
  const isBuyerControl = leverage >= 1
  const isNeutral = leverage === 0
  
  // Color based on leverage
  let barColor = 'bg-gray-400' // Neutral
  if (isDealerControl) {
    barColor = 'bg-red-500'
  } else if (isBuyerControl) {
    barColor = 'bg-green-500'
  }
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-semibold ${isDealerControl ? 'text-red-600' : 'text-gray-600'}`}>
          Dealer Control
        </span>
        <span className={`text-sm font-semibold ${isBuyerControl ? 'text-green-600' : 'text-gray-600'}`}>
          Buyer Control
        </span>
      </div>
      
      <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-100 via-gray-100 to-green-100" />
        
        {/* Leverage bar */}
        <div
          className={`absolute left-0 top-0 h-full ${barColor} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
        
        {/* Center marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-800 transform -translate-x-1/2" />
        
        {/* Current position indicator */}
        <div
          className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-800 rounded-full shadow-lg transition-all duration-500 ease-out"
          style={{ left: `${percentage}%` }}
        />
      </div>
      
      <div className="mt-2 text-center">
        <span className={`text-xs font-medium ${
          isDealerControl ? 'text-red-600' : 
          isBuyerControl ? 'text-green-600' : 
          'text-gray-600'
        }`}>
          {isNeutral ? 'Neutral' : isDealerControl ? 'Dealer Advantage' : 'Buyer Advantage'}
        </span>
      </div>
    </div>
  )
}


