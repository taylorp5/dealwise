'use client'

interface SituationDropdownProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const SITUATIONS = [
  { value: '', label: 'Select situation...' },
  { value: 'initial_ask', label: 'Initial ask for OTD' },
  { value: 'got_otd_worksheet', label: 'Got OTD worksheet' },
  { value: 'refused_otd', label: "They refused to give written OTD" },
  { value: 'monthly_payment_push', label: 'They asked about monthly payment' },
  { value: 'mandatory_addons', label: 'They added mandatory add-ons' },
  { value: 'fees_non_negotiable', label: "They say fees are non-negotiable" },
  { value: 'manager_joined', label: 'Manager joined the conversation' },
  { value: 'urgency_tactic', label: "They say someone else is interested" },
  { value: 'counter_offer', label: 'They gave a counter offer' },
  { value: 'pressure_to_sign', label: 'Pressure to sign today' },
  { value: 'trade_in_lowball', label: 'Trade-in offer seems low' },
]

export default function SituationDropdown({ value, onChange, disabled = false }: SituationDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
    >
      {SITUATIONS.map((situation) => (
        <option key={situation.value} value={situation.value}>
          {situation.label}
        </option>
      ))}
    </select>
  )
}






