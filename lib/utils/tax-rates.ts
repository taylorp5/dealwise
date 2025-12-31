// State tax rate mapping (major states)
// These are approximate - users should verify

export const stateTaxRates: Record<string, number> = {
  'AL': 2.0, // Alabama
  'AK': 0.0, // Alaska (varies by locality)
  'AZ': 5.6, // Arizona
  'AR': 6.5, // Arkansas
  'CA': 7.25, // California (varies by county)
  'CO': 2.9, // Colorado
  'CT': 6.35, // Connecticut
  'DE': 0.0, // Delaware
  'FL': 6.0, // Florida
  'GA': 4.0, // Georgia
  'HI': 4.17, // Hawaii
  'ID': 6.0, // Idaho
  'IL': 6.25, // Illinois
  'IN': 7.0, // Indiana
  'IA': 6.0, // Iowa
  'KS': 6.5, // Kansas
  'KY': 6.0, // Kentucky
  'LA': 4.45, // Louisiana
  'ME': 5.5, // Maine
  'MD': 6.0, // Maryland
  'MA': 6.25, // Massachusetts
  'MI': 6.0, // Michigan
  'MN': 6.875, // Minnesota
  'MS': 5.0, // Mississippi
  'MO': 4.225, // Missouri
  'MT': 0.0, // Montana
  'NE': 5.5, // Nebraska
  'NV': 6.85, // Nevada
  'NH': 0.0, // New Hampshire
  'NJ': 6.625, // New Jersey
  'NM': 5.125, // New Mexico
  'NY': 4.0, // New York (varies)
  'NC': 4.75, // North Carolina
  'ND': 5.0, // North Dakota
  'OH': 5.75, // Ohio
  'OK': 4.5, // Oklahoma
  'OR': 0.0, // Oregon
  'PA': 6.0, // Pennsylvania
  'RI': 7.0, // Rhode Island
  'SC': 6.0, // South Carolina
  'SD': 4.5, // South Dakota
  'TN': 7.0, // Tennessee
  'TX': 6.25, // Texas
  'UT': 4.85, // Utah
  'VT': 6.0, // Vermont
  'VA': 4.3, // Virginia
  'WA': 6.5, // Washington
  'WV': 6.0, // West Virginia
  'WI': 5.0, // Wisconsin
  'WY': 4.0, // Wyoming
  'DC': 6.0, // District of Columbia
}

export function getTaxRateForState(state: string): number | null {
  const upperState = state.toUpperCase().trim()
  return stateTaxRates[upperState] ?? null
}

export function formatStateName(state: string): string {
  const stateNames: Record<string, string> = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia',
  }
  return stateNames[state.toUpperCase()] || state
}


