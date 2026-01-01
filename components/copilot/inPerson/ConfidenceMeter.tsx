import Card from '@/components/ui/Card'

interface ConfidenceMeterProps {
  level: 'green' | 'yellow' | 'red'
  reason: string
  whatWouldChange: string[]
}

export default function ConfidenceMeter({ level, reason, whatWouldChange }: ConfidenceMeterProps) {
  const colorClasses = {
    green: 'bg-green-50 border-green-300 text-green-900',
    yellow: 'bg-yellow-50 border-yellow-300 text-yellow-900',
    red: 'bg-red-50 border-red-300 text-red-900',
  }

  return (
    <Card className={colorClasses[level]}>
      <h3 className="text-lg font-bold text-gray-900 mb-2">Confidence Meter</h3>
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold uppercase">Level:</span>
          <span className="text-lg font-bold">{level.toUpperCase()}</span>
        </div>
        <p className="text-sm">{reason}</p>
      </div>
      {whatWouldChange.length > 0 && (
        <div>
          <span className="text-xs font-semibold uppercase block mb-1">What Would Change This:</span>
          <ul className="space-y-1">
            {whatWouldChange.map((item, idx) => (
              <li key={idx} className="text-sm flex items-start">
                <span className="mr-2">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}






