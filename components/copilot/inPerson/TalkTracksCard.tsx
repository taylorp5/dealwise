import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface TalkTracksCardProps {
  sayThis: string | null
  ifPushback: string | null
  ifManager: string | null
  stopSignal: string | null
  closingLine: string | null
  redFlags: string[]
  doNotSay: string[]
  onCopy: (text: string) => void
  nextMove?: string | null
  ladderSummary?: string | null
}

export default function TalkTracksCard({
  sayThis,
  ifPushback,
  ifManager,
  stopSignal,
  closingLine,
  redFlags,
  doNotSay,
  onCopy,
  nextMove,
  ladderSummary,
}: TalkTracksCardProps) {
  return (
    <Card className="mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Talk Tracks</h3>
      
      <div className="space-y-4">
        {/* SAY THIS */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-base font-semibold text-gray-900">SAY THIS</h4>
            {sayThis && (
              <Button size="sm" variant="secondary" onClick={() => onCopy(sayThis)}>
                📋 Copy
              </Button>
            )}
          </div>
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
            <p className="text-base font-bold text-gray-900 whitespace-pre-wrap">
              {sayThis || '—'}
            </p>
          </div>
        </div>

        {/* IF PUSHBACK */}
        {ifPushback && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">IF THEY PUSH BACK → SAY THIS</h4>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{ifPushback}</p>
            </div>
          </div>
        )}

        {/* IF MANAGER */}
        {ifManager && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">IF MANAGER JOINS → SAY THIS</h4>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{ifManager}</p>
            </div>
          </div>
        )}

        {/* STOP SIGNAL */}
        {stopSignal && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">STOP SIGNAL</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{stopSignal}</p>
            </div>
          </div>
        )}

        {/* CLOSING LINE */}
        {closingLine && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">OTD CLOSING LINE</h4>
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
              <p className="text-sm font-bold text-gray-900 whitespace-pre-wrap">{closingLine}</p>
            </div>
          </div>
        )}

        {/* RED FLAGS */}
        {redFlags.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">RED FLAGS</h4>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <ul className="space-y-1">
                {redFlags.map((flag, idx) => (
                  <li key={idx} className="flex items-start text-sm text-gray-800">
                    <span className="text-red-600 mr-2 font-bold">⚠</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* DO NOT SAY */}
        {doNotSay.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">DO NOT SAY</h4>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <ul className="space-y-1">
                {doNotSay.map((mistake, idx) => (
                  <li key={idx} className="flex items-start text-sm text-gray-800">
                    <span className="text-red-600 mr-2 font-bold">❌</span>
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* NEXT MOVE */}
        {nextMove && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">NEXT MOVE</h4>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900">{nextMove}</p>
            </div>
          </div>
        )}

        {/* YOUR LADDER - Only show once, not repeated */}
        {/* Removed duplicate ladder display - shown separately in LadderCard */}
      </div>
    </Card>
  )
}

