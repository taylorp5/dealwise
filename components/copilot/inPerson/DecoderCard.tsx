import Card from '@/components/ui/Card'

interface DecoderCardProps {
  tactic: string
  meaning: string
  risk?: string
  bestResponse?: string
}

export default function DecoderCard({ tactic, meaning, risk, bestResponse }: DecoderCardProps) {
  return (
    <Card>
      <h3 className="text-lg font-bold text-gray-900 mb-3">What Just Happened</h3>
      <div className="space-y-3">
        <div>
          <span className="text-xs font-semibold text-gray-600 uppercase">Tactic:</span>
          <p className="text-sm font-bold text-orange-700 mt-1">{tactic}</p>
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-600 uppercase">What It Means:</span>
          <p className="text-sm text-gray-800 mt-1">{meaning}</p>
        </div>
        {risk && (
          <div>
            <span className="text-xs font-semibold text-gray-600 uppercase">Risk:</span>
            <p className="text-sm text-gray-800 mt-1">{risk}</p>
          </div>
        )}
        {bestResponse && (
          <div>
            <span className="text-xs font-semibold text-gray-600 uppercase">Best Response:</span>
            <p className="text-sm font-medium text-gray-900 mt-1">{bestResponse}</p>
          </div>
        )}
      </div>
    </Card>
  )
}


