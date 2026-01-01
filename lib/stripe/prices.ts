/**
 * Stripe Prices Configuration
 * Single source of truth for Stripe Price IDs, display amounts, and labels
 */

export interface StripePriceConfig {
  priceId: string
  amount: number
  label: string
  packIds: string[] // Which packs this price unlocks
}

export const STRIPE_PRICES: Record<string, StripePriceConfig> = {
  FIRST_TIME: {
    // Use NEXT_PUBLIC_ prefix so Price IDs are available on client-side
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FIRST_TIME || process.env.STRIPE_PRICE_FIRST_TIME || '',
    amount: 12,
    label: 'First-Time Buyer Pack',
    packIds: ['first_time'],
  },
  IN_PERSON: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_IN_PERSON || process.env.STRIPE_PRICE_IN_PERSON || '',
    amount: 15,
    label: 'In-Person Negotiation Pack',
    packIds: ['in_person'],
  },
  BUNDLE: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUNDLE || process.env.STRIPE_PRICE_BUNDLE || '',
    amount: 22,
    label: 'Bundle (Both Packs)',
    packIds: ['first_time', 'in_person'],
  },
}

/**
 * Get price config by price ID
 */
export function getPriceConfigByPriceId(priceId: string): StripePriceConfig | null {
  for (const config of Object.values(STRIPE_PRICES)) {
    if (config.priceId === priceId) {
      return config
    }
  }
  return null
}

/**
 * Get price config by pack ID
 */
export function getPriceConfigByPackId(packId: string): StripePriceConfig | null {
  for (const config of Object.values(STRIPE_PRICES)) {
    if (config.packIds.includes(packId)) {
      return config
    }
  }
  return null
}

/**
 * Format price for display
 */
export function formatPrice(amount: number): string {
  return `$${amount}`
}

/**
 * Get bundle savings amount
 */
export function getBundleSavings(): number {
  const firstTimePrice = STRIPE_PRICES.FIRST_TIME.amount
  const inPersonPrice = STRIPE_PRICES.IN_PERSON.amount
  const bundlePrice = STRIPE_PRICES.BUNDLE.amount
  return (firstTimePrice + inPersonPrice) - bundlePrice
}

