import type { PackConfig } from '@/lib/types/packs'

export const packs: Record<string, PackConfig> = {
  first_time: {
    id: 'first_time',
    name: 'First-Time Buyer Pack',
    description: 'Guidance for first-time buyers: financing basics, affordability, clarity.',
    features: [
      'Budget & credit band questions',
      'APR & term definitions',
      'OTD vs monthly education',
      'First-time friendly scripts',
    ],
    education: [
      'OTD includes taxes, fees, and registration—focus on OTD, not monthly.',
      'APR is the annualized cost of borrowing—compare against pre-approval if you have one.',
      'Longer terms lower monthly payment but increase total interest paid.',
    ],
    questions: [
      { id: 'budget', label: 'Max OTD budget', type: 'number', required: true, placeholder: 'e.g., 25000' },
      { id: 'credit_band', label: 'Credit range (approx)', type: 'select', required: false, options: [
        { value: 'excellent', label: 'Excellent (760+)' },
        { value: 'good', label: 'Good (700-759)' },
        { value: 'fair', label: 'Fair (640-699)' },
        { value: 'new', label: 'Limited/First-time' },
      ]},
      { id: 'down_payment_est', label: 'Down payment estimate', type: 'number', required: false, placeholder: 'e.g., 4000' },
      { id: 'driving_needs', label: 'Primary driving needs', type: 'text', required: false, placeholder: 'e.g., commute 40 miles daily' },
    ],
  },
  cash: {
    id: 'cash',
    name: 'Cash Buyer Pack',
    description: 'Cash-specific tactics and proof-of-funds handling.',
    features: [
      'Cash disclosure timing',
      'Proof-of-funds guidance',
      'OTD and fees focus',
      'No monthly payment talk',
    ],
    education: [
      'Delay disclosing cash until you have negotiated price.',
      'Have proof of funds ready, but share only when it helps close at your price.',
      'Cash can justify lower price: simpler deal, no financing reserve for dealer.',
    ],
    questions: [
      { id: 'proof_of_funds', label: 'Do you have proof of funds?', type: 'boolean', required: false },
      { id: 'disclose_cash', label: 'When do you want to disclose cash?', type: 'select', required: false, options: [
        { value: 'late', label: 'Only after price is agreed' },
        { value: 'mid', label: 'After initial counter' },
        { value: 'early', label: 'I prefer to disclose early' },
      ]},
      { id: 'open_to_finance', label: 'Open to financing if it reduces price?', type: 'boolean', required: false },
    ],
    comingSoon: true,
  },
  financing: {
    id: 'financing',
    name: 'Financing Buyer Pack',
    description: 'Financing coaching: APR, term, pre-approval leverage.',
    features: [
      'Max monthly & OTD focus',
      'Pre-approval leverage',
      'APR/term questions',
      'Payment anchoring avoidance',
    ],
    education: [
      'Negotiate OTD first, financing second - do not anchor on monthly payment.',
      'Compare dealer APR against your pre-approval; ask if low APR is contingent on add-ons.',
      'Shorter terms cost more monthly but less interest overall.',
    ],
    questions: [
      { id: 'target_monthly', label: 'Target monthly (optional)', type: 'number', required: false, placeholder: 'e.g., 400' },
      { id: 'max_otd', label: 'Max OTD', type: 'number', required: true, placeholder: 'e.g., 25000' },
      { id: 'preferred_term', label: 'Preferred term', type: 'select', required: false, options: [
        { value: '36', label: '36 mo' },
        { value: '48', label: '48 mo' },
        { value: '60', label: '60 mo' },
        { value: '72', label: '72 mo' },
      ]},
      { id: 'pre_approved', label: 'Do you have pre-approval?', type: 'boolean', required: false },
      { id: 'pre_approval_rate', label: 'Pre-approval APR', type: 'number', required: false, placeholder: 'e.g., 5.5' },
    ],
    comingSoon: true,
  },
  in_person: {
    id: 'in_person',
    name: 'In-Person Negotiation Pack',
    description: 'Dealership talk tracks and pressure handling.',
    features: [
      'Short talk tracks',
      'Manager/pressure tactics',
      'If they say X → say Y',
      'Closing script for OTD',
    ],
    education: [
      'Practice your talk track—don’t rely on recording; use written notes instead.',
      'If “manager” pressure starts, slow down: ask for written OTD before deciding.',
      'Have 2-3 calm phrases ready for add-on upsells.',
    ],
    questions: [
      { id: 'comfort_firm', label: 'Comfort being firm?', type: 'select', required: false, options: [
        { value: 'low', label: 'Prefer soft approach' },
        { value: 'medium', label: 'Comfortable pushing back politely' },
        { value: 'high', label: 'Very firm when needed' },
      ]},
      { id: 'expected_objections', label: 'Objections you expect', type: 'textarea', required: false, placeholder: 'e.g., “Price is already low”, “Manager approval needed”.' },
      { id: 'has_trade_in', label: 'Trade-in?', type: 'boolean', required: false },
    ],
  },
}

export function getPackConfig(packType: string): PackConfig {
  return packs[packType] || packs.first_time
}

