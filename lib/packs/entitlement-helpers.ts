/**
 * Entitlement Helpers
 * Single source of truth for pack entitlement checking
 */

import { hasPack, hasAllAccess, getOwnedPacks } from './entitlements'

export interface PackEntitlements {
  hasFirstTimePack: boolean
  hasInPersonPack: boolean
  ownedPacks: string[]
  allAccess: boolean
}

/**
 * Get all pack entitlements for the current user
 * This is the single source of truth for pack checking
 */
export function getPackEntitlements(): PackEntitlements {
  const ownedPacks = getOwnedPacks()
  const allAccess = hasAllAccess()
  
  return {
    hasFirstTimePack: hasPack('first_time') || allAccess,
    hasInPersonPack: hasPack('in_person') || allAccess,
    ownedPacks,
    allAccess,
  }
}

/**
 * Get the correct analyzer route based on pack entitlements
 * Falls back to free if no pack is owned
 */
export function getAnalyzerRouteForPack(packId: string | null | undefined): string {
  if (!packId) return '/analyzer/free'
  
  switch (packId) {
    case 'first_time':
      return '/analyzer/first-time'
    case 'in_person':
      return '/analyzer/in-person'
    case 'free':
    default:
      return '/analyzer/free'
  }
}

/**
 * Get the analyzer route based on user's entitlements
 * Prioritizes In-Person > First-Time > Free
 */
export function getAnalyzerRouteFromEntitlements(): string {
  const entitlements = getPackEntitlements()
  
  if (entitlements.hasInPersonPack) {
    return '/analyzer/in-person'
  }
  
  if (entitlements.hasFirstTimePack) {
    return '/analyzer/first-time'
  }
  
  return '/analyzer/free'
}

/**
 * Get the correct calculator route for a given pack ID
 * Single source of truth for calculator route mapping
 */
export function getCalculatorRouteForPack(packId: string | null | undefined): string {
  if (!packId) return '/calculator/free'
  
  switch (packId) {
    case 'first_time':
      return '/calculator/first-time'
    case 'in_person':
      return '/calculator/in-person'
    case 'free':
    default:
      return '/calculator/free'
  }
}





