/**
 * Determines if dev-only UI elements should be rendered
 * 
 * Returns true if:
 * - NODE_ENV is not 'production' (local development)
 * - OR NEXT_PUBLIC_ENABLE_DEV_UI is explicitly set to 'true'
 * 
 * Default: false in production
 */
export function isDevUIEnabled(): boolean {
  // Check explicit flag first (allows enabling in production if needed)
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_UI === 'true') {
    return true
  }
  
  // Otherwise, only enable in non-production environments
  return process.env.NODE_ENV !== 'production'
}

