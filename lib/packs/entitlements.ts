// Pack Entitlement System
// DEPRECATED: This file is kept for backward compatibility but should not be used for entitlement checks.
// Use the useEntitlements hook or fetch from Supabase directly instead.
// localStorage is now only used for UI preferences (e.g., selected pack), NOT for paid access.

const STORAGE_KEY = 'dealership_copilot_owned_packs'
const STORAGE_KEY_PREFERENCES = 'dealership_copilot_preferences'

export interface PackEntitlements {
  ownedPacks: string[]
  allAccess: boolean
}

/**
 * @deprecated Use useEntitlements hook instead. This reads from localStorage which is NOT the source of truth.
 * Get all owned packs from localStorage (UI preferences only, not entitlements)
 */
export function getOwnedPacks(): string[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const data = JSON.parse(stored)
    return Array.isArray(data.ownedPacks) ? data.ownedPacks : []
  } catch {
    return []
  }
}

/**
 * @deprecated Use useEntitlements hook instead. This checks localStorage which is NOT the source of truth.
 * Check if user owns a specific pack (from localStorage - UI preferences only)
 */
export function hasPack(packId: string): boolean {
  if (typeof window === 'undefined') return false
  const owned = getOwnedPacks()
  return owned.includes(packId) || hasAllAccess()
}

/**
 * @deprecated Use useEntitlements hook instead.
 * Check if user has all-access (premium tier) - from localStorage only
 */
export function hasAllAccess(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return false
    const data = JSON.parse(stored)
    return data.allAccess === true
  } catch {
    return false
  }
}

/**
 * Add a pack to owned packs (UI preferences only - does NOT grant access)
 * This is kept for backward compatibility but should not be used for actual entitlements.
 */
export function addPack(packId: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const owned = getOwnedPacks()
    if (!owned.includes(packId)) {
      owned.push(packId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ownedPacks: owned, allAccess: false }))
    }
  } catch (error) {
    console.error('Error adding pack to preferences:', error)
  }
}

/**
 * Remove a pack from owned packs (UI preferences only)
 */
export function removePack(packId: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const owned = getOwnedPacks()
    const filtered = owned.filter((id) => id !== packId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ownedPacks: filtered, allAccess: false }))
  } catch (error) {
    console.error('Error removing pack from preferences:', error)
  }
}

/**
 * Set all-access status (UI preferences only)
 */
export function setAllAccess(enabled: boolean): void {
  if (typeof window === 'undefined') return
  
  try {
    const owned = getOwnedPacks()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ownedPacks: owned, allAccess: enabled }))
  } catch (error) {
    console.error('Error setting all access in preferences:', error)
  }
}

/**
 * Clear all pack entitlements from localStorage (UI preferences only)
 */
export function clearEntitlements(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * @deprecated Use useEntitlements hook instead.
 * Get full entitlements object (from localStorage - UI preferences only)
 */
export function getEntitlements(): PackEntitlements {
  return {
    ownedPacks: getOwnedPacks(),
    allAccess: hasAllAccess(),
  }
}






