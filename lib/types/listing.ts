// Types for vehicle listing data extraction

export type VehicleCondition = 'new' | 'used' | 'cpo' | 'unknown'

export interface ListingData {
  sourceUrl: string
  sourceSite: 'cars.com' | 'autotrader.com' | 'cargurus.com' | 'other'
  title?: string
  year?: number
  make?: string
  model?: string
  trim?: string
  price?: number
  vehicleCondition?: VehicleCondition
  mileage?: number
  vin?: string
  stockNumber?: string
  dealerName?: string
  dealerCity?: string
  dealerState?: string
  zip?: string
  drivetrain?: string
  transmission?: string
  fuelType?: string
  imageUrl?: string
  raw?: any // store raw parsed blobs for debugging
  confidence: number // 0-1
  issues: string[]
  blocked?: boolean // true if fetch was blocked
}

export interface FetchResult {
  success?: boolean
  html?: string
  finalUrl?: string
  fetchStatus?: number // Real HTTP status, or -1 for network errors
  contentType?: string
  contentLength?: number
  blocked?: boolean
  error?: string
  errorMessage?: string
  errorType?: 'dns' | 'tls' | 'timeout' | 'unknown'
  pageTitle?: string | null
  pagePreview?: string
  blockReason?: 'cloudflare' | 'captcha' | 'rate_limited' | 'cookie_required' | 'access_denied' | 'network_error' | 'unknown'
  // Legacy field for backward compatibility
  status?: number
}

