import Card from '@/components/ui/Card'

interface AlertsCardProps {
  alerts: string[]
}

export default function AlertsCard({ alerts }: AlertsCardProps) {
  return (
    <Card className="bg-yellow-50 border-2 border-yellow-300">
      <h3 className="text-lg font-bold text-gray-900 mb-3">Watch-Outs</h3>
      
      {alerts.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No alerts</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-800">
              <span className="text-yellow-600 font-bold mt-0.5">⚠</span>
              <span>{alert}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}






