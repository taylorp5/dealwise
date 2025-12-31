import Card from '@/components/ui/Card'

interface WalkAwayPlanCardProps {
  probabilityCallback: 'low' | 'medium' | 'high'
  steps: string[]
  whatNotToDo: string[]
}

export default function WalkAwayPlanCard({
  probabilityCallback,
  steps,
  whatNotToDo,
}: WalkAwayPlanCardProps) {
  const probabilityLabels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  }

  const probabilityColors = {
    low: 'text-yellow-600',
    medium: 'text-orange-600',
    high: 'text-red-600',
  }

  return (
    <Card className="bg-gray-50 border-2 border-gray-300">
      <h3 className="text-lg font-bold text-gray-900 mb-3">If I Walk Now</h3>
      <div className="mb-3">
        <span className="text-xs font-semibold text-gray-600 uppercase">Probability of Callback:</span>
        <span className={`text-sm font-bold ml-2 ${probabilityColors[probabilityCallback]}`}>
          {probabilityLabels[probabilityCallback]}
        </span>
      </div>
      {steps.length > 0 && (
        <div className="mb-3">
          <span className="text-xs font-semibold text-gray-600 uppercase block mb-2">Steps:</span>
          <ol className="space-y-1 list-decimal list-inside">
            {steps.map((step, idx) => (
              <li key={idx} className="text-sm text-gray-800">
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
      {whatNotToDo.length > 0 && (
        <div>
          <span className="text-xs font-semibold text-gray-600 uppercase block mb-2">What Not To Do:</span>
          <ul className="space-y-1">
            {whatNotToDo.map((item, idx) => (
              <li key={idx} className="text-sm text-gray-800 flex items-start">
                <span className="text-red-600 mr-2 font-bold">❌</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}


