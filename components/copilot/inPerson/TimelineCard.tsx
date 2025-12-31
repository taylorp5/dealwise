import Card from '@/components/ui/Card'

interface TimelineEvent {
  ts: number
  who: 'you' | 'dealer' | 'coach'
  label: string
  details?: string
}

interface TimelineCardProps {
  events: TimelineEvent[]
}

export default function TimelineCard({ events }: TimelineCardProps) {
  return (
    <Card>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Deal Timeline</h3>
      
      {events.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No events yet</p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {events.map((event, idx) => (
            <div key={idx} className="flex items-start gap-3 pb-3 border-b border-gray-200 last:border-0">
              <div className="text-xs text-gray-500 min-w-[60px]">
                {new Date(event.ts).toLocaleTimeString()}
              </div>
              <div className="flex-1">
                <span
                  className={`text-xs font-semibold uppercase mr-2 ${
                    event.who === 'you'
                      ? 'text-blue-600'
                      : event.who === 'dealer'
                      ? 'text-red-600'
                      : 'text-orange-600'
                  }`}
                >
                  {event.who}:
                </span>
                <span className="text-sm text-gray-800">{event.label}</span>
                {event.details && (
                  <p className="text-xs text-gray-600 mt-1 ml-8">{event.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

