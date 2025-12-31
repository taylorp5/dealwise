import Card from '@/components/ui/Card'

interface DealStatusCardProps {
  dealerOTD: number | null
  targetOTD: number
  walkAwayOTD: number
  lastDealerOTD: number | null
  lastUpdated: Date | null
  onDealerOTDChange: (value: number | null) => void
}

export default function DealStatusCard({
  dealerOTD,
  targetOTD,
  walkAwayOTD,
  lastDealerOTD,
  lastUpdated,
  onDealerOTDChange,
}: DealStatusCardProps) {
  const gap = dealerOTD ? dealerOTD - targetOTD : null
  const gapPercent = gap && targetOTD > 0 ? ((gap / targetOTD) * 100).toFixed(1) : null

  // Determine trend
  let trend: 'improving' | 'worsening' | 'stalled' | null = null
  if (dealerOTD && lastDealerOTD) {
    if (dealerOTD < lastDealerOTD) {
      trend = 'improving'
    } else if (dealerOTD > lastDealerOTD) {
      trend = 'worsening'
    } else {
      trend = 'stalled'
    }
  }

  return (
    <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900">Deal Status</h3>
        {lastUpdated && (
          <span className="text-xs text-gray-600">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Dealer Current OTD */}
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">
            Dealer Current OTD
          </label>
          <input
            type="number"
            value={dealerOTD || ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : parseFloat(e.target.value)
              onDealerOTDChange(isNaN(val as number) ? null : val)
            }}
            placeholder="Enter OTD"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg font-bold text-gray-900"
          />
        </div>

        {/* Your Target OTD */}
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">
            Your Target OTD
          </label>
          <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-lg font-bold text-gray-900">
            ${targetOTD.toLocaleString()}
          </div>
        </div>

        {/* Gap */}
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">
            Gap
          </label>
          <div
            className={`px-3 py-2 bg-white border rounded-lg text-lg font-bold ${
              gap === null
                ? 'text-gray-400 border-gray-300'
                : gap <= 0
                ? 'text-green-600 border-green-300'
                : gap <= 500
                ? 'text-yellow-600 border-yellow-300'
                : 'text-red-600 border-red-300'
            }`}
          >
            {gap === null ? '—' : gap >= 0 ? `+$${Math.abs(gap).toLocaleString()}` : `-$${Math.abs(gap).toLocaleString()}`}
            {gapPercent && gap !== null && gap > 0 && (
              <span className="text-sm ml-1">({gapPercent}%)</span>
            )}
          </div>
        </div>

        {/* Trend */}
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase mb-1 block">
            Trend
          </label>
          <div
            className={`px-3 py-2 bg-white border rounded-lg text-sm font-bold ${
              trend === 'improving'
                ? 'text-green-600 border-green-300'
                : trend === 'worsening'
                ? 'text-red-600 border-red-300'
                : trend === 'stalled'
                ? 'text-yellow-600 border-yellow-300'
                : 'text-gray-400 border-gray-300'
            }`}
          >
            {trend === 'improving' && '↗ Improving'}
            {trend === 'worsening' && '↘ Worsening'}
            {trend === 'stalled' && '→ Stalled'}
            {!trend && '—'}
          </div>
        </div>
      </div>
    </Card>
  )
}


