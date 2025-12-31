/**
 * Get the correct copilot route for a given pack ID
 * Single source of truth for copilot route mapping
 */
export function getCopilotRouteForPack(packId: string | null | undefined): string {
  if (!packId) return '/copilot/free'
  
  switch (packId) {
    case 'first_time':
      return '/copilot/first-time'
    case 'in_person':
      return '/copilot/in-person'
    case 'free':
    default:
      return '/copilot/free'
  }
}

/**
 * Get copilot route based on pack context (for listing analyzer)
 * Uses the active pack context, not just ownership
 */
export function getCopilotRouteFromContext(
  activePackId: string | null | undefined,
  hasInPersonPack: boolean,
  hasFirstTimePack: boolean
): string {
  // If there's an active pack context, use it
  if (activePackId) {
    return getCopilotRouteForPack(activePackId)
  }
  
  // Otherwise, default to free
  return '/copilot/free'
}


