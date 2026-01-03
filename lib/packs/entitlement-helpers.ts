/**
 * Entitlement Helpers
 * Helper functions for pack entitlement checking
 * NOTE: For actual entitlement checks, use the useEntitlements hook which reads from Supabase
 */

export interface PackEntitlements {
  hasFirstTimePack: boolean
  hasInPersonPack: boolean
  ownedPacks: string[]
  allAccess: boolean
}

/**
 * @deprecated Use useEntitlements hook instead. This function is kept for backward compatibility.
 * Get all pack entitlements for the current user
 * This function should not be used - use useEntitlements hook which reads from Supabase
 */
export function getPackEntitlements(): PackEntitlements {
  // Return empty entitlements - this function should not be used
  // Components should use useEntitlements hook instead
  console.warn('getPackEntitlements() is deprecated. Use useEntitlements hook instead.')
  return {
    hasFirstTimePack: false,
    hasInPersonPack: false,
    ownedPacks: [],
    allAccess: false,
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
 * @param hasInPerson - Whether user has in-person pack (from useEntitlements hook)
 * @param hasFirstTime - Whether user has first-time pack (from useEntitlements hook)
 */
export function getAnalyzerRouteFromEntitlements(hasInPerson: boolean = false, hasFirstTime: boolean = false): string {
  if (hasInPerson) {
    return '/analyzer/in-person'
  }
  
  if (hasFirstTime) {
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





