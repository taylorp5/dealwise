import Card from '@/components/ui/Card'

interface LadderCardProps {
  ask: string | number
  agree: string | number
  walk: string | number
  locked: boolean
  onLockToggle: () => void
  onUpdate: (field: 'ask' | 'agree' | 'walk', value: string) => void
}

export default function LadderCard({
  ask,
  agree,
  walk,
  locked,
  onLockToggle,
  onUpdate,
}: LadderCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Negotiation Ladder</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={locked}
            onChange={onLockToggle}
            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
          />
          <span className="text-sm font-medium text-gray-700">Locked</span>
        </label>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            ASK
          </label>
          {locked ? (
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium text-gray-900">
              {typeof ask === 'number' ? `$${ask.toLocaleString()}` : ask || '—'}
            </div>
          ) : (
            <input
              type="text"
              value={typeof ask === 'number' ? ask.toString() : ask}
              onChange={(e) => onUpdate('ask', e.target.value)}
              placeholder="Opening ask"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            AGREE
          </label>
          {locked ? (
            <div className="px-3 py-2 bg-green-50 border border-green-300 rounded-lg text-sm font-medium text-green-900">
              {typeof agree === 'number' ? `$${agree.toLocaleString()}` : agree || '—'}
            </div>
          ) : (
            <input
              type="text"
              value={typeof agree === 'number' ? agree.toString() : agree}
              onChange={(e) => onUpdate('agree', e.target.value)}
              placeholder="Target OTD"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            WALK
          </label>
          {locked ? (
            <div className="px-3 py-2 bg-red-50 border border-red-300 rounded-lg text-sm font-medium text-red-900">
              {typeof walk === 'number' ? `$${walk.toLocaleString()}` : walk || '—'}
            </div>
          ) : (
            <input
              type="text"
              value={typeof walk === 'number' ? walk.toString() : walk}
              onChange={(e) => onUpdate('walk', e.target.value)}
              placeholder="Walk-away ceiling"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          )}
        </div>
      </div>
    </Card>
  )
}

