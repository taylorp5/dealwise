// Pack Entitlement System
// Uses localStorage for now; will be replaced with payment system later

const STORAGE_KEY = 'dealership_copilot_owned_packs'

export interface PackEntitlements {
  ownedPacks: string[]
  allAccess: boolean
}

/**
 * Get all owned packs from localStorage
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
 * Check if user owns a specific pack
 */
export function hasPack(packId: string): boolean {
  if (typeof window === 'undefined') return false
  const owned = getOwnedPacks()
  return owned.includes(packId) || hasAllAccess()
}

/**
 * Check if user has all-access (premium tier)
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
 * Add a pack to owned packs
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
    console.error('Error adding pack:', error)
  }
}

/**
 * Remove a pack from owned packs
 */
export function removePack(packId: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const owned = getOwnedPacks()
    const filtered = owned.filter((id) => id !== packId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ownedPacks: filtered, allAccess: false }))
  } catch (error) {
    console.error('Error removing pack:', error)
  }
}

/**
 * Set all-access status
 */
export function setAllAccess(enabled: boolean): void {
  if (typeof window === 'undefined') return
  
  try {
    const owned = getOwnedPacks()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ownedPacks: owned, allAccess: enabled }))
  } catch (error) {
    console.error('Error setting all access:', error)
  }
}

/**
 * Clear all pack entitlements (for testing/logout)
 */
export function clearEntitlements(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Get full entitlements object
 */
export function getEntitlements(): PackEntitlements {
  return {
    ownedPacks: getOwnedPacks(),
    allAccess: hasAllAccess(),
  }
}


