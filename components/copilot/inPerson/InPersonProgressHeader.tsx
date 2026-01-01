'use client'

interface InPersonProgressHeaderProps {
  currentStep: 0 | 1 | 2 | 3 | 4
  onStepClick?: (step: 0 | 1 | 2 | 3 | 4) => void
  onReset?: () => void
}

const STEP_LABELS = [
  'Set Your Numbers',
  'Get Itemized OTD',
  'Handle Tactic',
  'Counter / Close / Walk',
  'Update & Repeat',
]

export default function InPersonProgressHeader({
  currentStep,
  onStepClick,
  onReset,
}: InPersonProgressHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 mb-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Guided Negotiation Coach</h1>
          {onReset && (
            <button
              onClick={onReset}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Reset negotiation
            </button>
          )}
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {STEP_LABELS.map((label, index) => {
            const step = index as 0 | 1 | 2 | 3 | 4
            const isActive = currentStep === step
            const isCompleted = currentStep > step
            const isClickable = onStepClick && (isCompleted || isActive)
            
            return (
              <div key={step} className="flex items-center flex-shrink-0">
                <button
                  onClick={isClickable ? () => onStepClick!(step) : undefined}
                  disabled={!isClickable}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-orange-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }
                    ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                  `}
                >
                  <span className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${isActive 
                      ? 'bg-white text-orange-600' 
                      : isCompleted 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-300 text-gray-600'
                    }
                  `}>
                    {isCompleted ? '✓' : step + 1}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
                {index < STEP_LABELS.length - 1 && (
                  <div className={`
                    w-8 h-0.5 mx-1
                    ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}
                  `} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}






