'use client'

const IN_PERSON_SITUATIONS = [
  "They asked: what monthly payment do you want?",
  "They won't give OTD unless I come in",
  "They added mandatory add-ons",
  "They say fees are non-negotiable",
  "They brought the manager",
  "They say someone else is interested / urgency",
  "They ask me to sign today",
  "They offered counter OTD",
  "Trade-in lowball",
  "I want to close if they hit my OTD"
]

interface SituationChipsProps {
  selected: string
  onSelect: (situation: string) => void
}

export default function SituationChips({ selected, onSelect }: SituationChipsProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        What's Happening
      </label>
      <div className="flex flex-wrap gap-2">
        {IN_PERSON_SITUATIONS.map((situation) => (
          <button
            key={situation}
            type="button"
            onClick={() => onSelect(situation)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selected === situation
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {situation}
          </button>
        ))}
      </div>
    </div>
  )
}






