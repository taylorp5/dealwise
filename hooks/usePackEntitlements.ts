'use client'

import { useState, useEffect } from 'react'
import { getEntitlements, type PackEntitlements } from '@/lib/packs/entitlements'

export function usePackEntitlements() {
  const [entitlements, setEntitlements] = useState<PackEntitlements>({
    ownedPacks: [],
    allAccess: false,
  })

  useEffect(() => {
    // Load initial entitlements
    setEntitlements(getEntitlements())

    // Listen for storage changes (for cross-tab updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dealership_copilot_owned_packs') {
        setEntitlements(getEntitlements())
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Also listen for custom events (same-tab updates)
    const handleCustomStorage = () => {
      setEntitlements(getEntitlements())
    }

    window.addEventListener('packEntitlementsChanged', handleCustomStorage)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('packEntitlementsChanged', handleCustomStorage)
    }
  }, [])

  const refresh = () => {
    setEntitlements(getEntitlements())
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('packEntitlementsChanged'))
  }

  return {
    ...entitlements,
    refresh,
  }
}


