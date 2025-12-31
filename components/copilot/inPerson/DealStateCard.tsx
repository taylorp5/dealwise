import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface DealStateCardProps {
  dealerOTD: number | null
  targetOTD: number
  walkAwayOTD: number
  onDealerOTDChange: (value: number | null) => void
  onUpdate: () => void
  disabled?: boolean
}

export default function DealStateCard({
  dealerOTD,
  targetOTD,
  walkAwayOTD,
  onDealerOTDChange,
  onUpdate,
  disabled = false,
}: DealStateCardProps) {
  const gap = dealerOTD ? dealerOTD - targetOTD : null
  const gapPercent = gap && targetOTD > 0 ? ((gap / targetOTD) * 100).toFixed(1) : null

  return (
    <Card className="mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Update Deal State</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dealer Current OTD
          </label>
          <input
            type="number"
            value={dealerOTD || ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : parseFloat(e.target.value)
              onDealerOTDChange(isNaN(val as number) ? null : val)
            }}
            placeholder="Enter dealer's current OTD"
            disabled={disabled}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
              Your Target OTD
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold text-gray-900">
              ${targetOTD.toLocaleString()}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
              Gap
            </label>
            <div
              className={`px-3 py-2 border rounded-lg text-sm font-bold ${
                gap === null
                  ? 'text-gray-400 border-gray-300 bg-gray-50'
                  : gap <= 0
                  ? 'text-green-600 border-green-300 bg-green-50'
                  : gap <= 500
                  ? 'text-yellow-600 border-yellow-300 bg-yellow-50'
                  : 'text-red-600 border-red-300 bg-red-50'
              }`}
            >
              {gap === null ? '—' : gap >= 0 ? `+$${Math.abs(gap).toLocaleString()}` : `-$${Math.abs(gap).toLocaleString()}`}
              {gapPercent && gap !== null && gap > 0 && (
                <span className="text-xs ml-1">({gapPercent}%)</span>
              )}
            </div>
          </div>
        </div>

        <Button
          onClick={onUpdate}
          disabled={disabled || dealerOTD === null}
          className="w-full"
        >
          Update Deal State
        </Button>
      </div>
    </Card>
  )
}

