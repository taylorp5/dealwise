import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface CoachOutputCardsProps {
  sayThis: string | null
  ifPushback: string | null
  ifManager: string | null
  stopSignal: string | null
  closingLine: string | null
  whatJustHappened: string | null
  nextBestMove: string | null
  redFlags: string[]
  doNotSay: string[]
  onCopy: (text: string) => void
}

export default function CoachOutputCards({
  sayThis,
  ifPushback,
  ifManager,
  stopSignal,
  closingLine,
  whatJustHappened,
  nextBestMove,
  redFlags,
  doNotSay,
  onCopy,
}: CoachOutputCardsProps) {
  return (
    <div className="space-y-4">
      {/* SAY THIS (biggest) */}
      <Card className="bg-orange-50 border-2 border-orange-300">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-2xl font-bold text-gray-900">SAY THIS</h3>
          {sayThis && (
            <Button size="sm" variant="secondary" onClick={() => onCopy(sayThis)}>
              📋 Copy
            </Button>
          )}
        </div>
        <p className="text-lg font-bold text-gray-900 whitespace-pre-wrap">
          {sayThis || 'Generate talk tracks to see coaching'}
        </p>
      </Card>

      {/* IF THEY PUSH BACK */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          IF THEY PUSH BACK → SAY THIS
        </h3>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">
          {ifPushback || '—'}
        </p>
      </Card>

      {/* IF MANAGER JOINS */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          IF MANAGER JOINS → SAY THIS
        </h3>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">
          {ifManager || '—'}
        </p>
      </Card>

      {/* STOP SIGNAL */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">STOP SIGNAL</h3>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">
          {stopSignal || '—'}
        </p>
      </Card>

      {/* OTD CLOSING LINE */}
      <Card className="bg-green-50 border-2 border-green-300">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">OTD CLOSING LINE</h3>
        <p className="text-sm font-bold text-gray-900 whitespace-pre-wrap">
          {closingLine || '—'}
        </p>
      </Card>

      {/* WHAT JUST HAPPENED */}
      {whatJustHappened && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">WHAT JUST HAPPENED</h3>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{whatJustHappened}</p>
        </Card>
      )}

      {/* NEXT BEST MOVE */}
      {nextBestMove && (
        <Card className="bg-indigo-50 border border-indigo-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">NEXT BEST MOVE</h3>
          <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap">
            {nextBestMove}
          </p>
        </Card>
      )}

      {/* RED FLAGS */}
      {redFlags.length > 0 && (
        <Card className="bg-red-50 border border-red-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">RED FLAGS</h3>
          <ul className="space-y-1">
            {redFlags.map((flag, idx) => (
              <li key={idx} className="flex items-start text-sm text-gray-800">
                <span className="text-red-600 mr-2 font-bold">⚠</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* DO NOT SAY */}
      {doNotSay.length > 0 && (
        <Card className="bg-gray-50 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">DO NOT SAY</h3>
          <ul className="space-y-1">
            {doNotSay.map((mistake, idx) => (
              <li key={idx} className="flex items-start text-sm text-gray-800">
                <span className="text-red-600 mr-2 font-bold">❌</span>
                <span>{mistake}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}






