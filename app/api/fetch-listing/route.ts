import { NextRequest, NextResponse } from 'next/server'
import type { FetchResult } from '@/lib/types/listing'

type FetchListingResult =
  | { 
      success: true
      html: string
      finalUrl: string
      fetchStatus: number
      contentType?: string
      contentLength?: number
      pageTitle?: string | null
      blocked: false
    }
  | { 
      success: false
      html?: string
      finalUrl: string
      fetchStatus: number
      blocked: boolean
      blockReason?: string
      errorType: string
      errorMessage: string
      pageTitle?: string | null
      contentType?: string
      contentLength?: number
    }

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const url = searchParams.get('url')
    
    if (!url) {
      const result: FetchListingResult = {
        success: false,
        finalUrl: '',
        fetchStatus: 400,
        blocked: false,
        errorType: 'invalid_request',
        errorMessage: 'Missing url parameter',
        pageTitle: null,
      }
      return NextResponse.json(result)
    }
    
    // Validate URL
    let targetUrl: URL
    try {
      targetUrl = new URL(url)
    } catch (e) {
      const result: FetchListingResult = {
        success: false,
        finalUrl: url,
        fetchStatus: 400,
        blocked: false,
        errorType: 'invalid_request',
        errorMessage: 'Invalid URL',
        pageTitle: null,
      }
      return NextResponse.json(result)
    }
    
    // Allow any dealership domain (removed restriction for universal extraction)
    // Note: In production, you may want to add rate limiting or domain validation
    const hostname = targetUrl.hostname.toLowerCase()
    
    // Block obviously non-dealership domains for security
    const blockedDomains = ['google.com', 'facebook.com', 'twitter.com', 'youtube.com']
    if (blockedDomains.some(domain => hostname.includes(domain))) {
      const result: FetchListingResult = {
        success: false,
        finalUrl: url,
        fetchStatus: 400,
        blocked: false,
        errorType: 'invalid_request',
        errorMessage: 'Domain not allowed',
        pageTitle: null,
      }
      return NextResponse.json(result)
    }
    
    // Fetch HTML with realistic headers and timeout
    let response: Response | null = null
    let finalUrl = url
    let fetchStatus: number = -1 // NEVER 0 - will be set to actual status if we get a response, or -1 for errors
    let errorType: string = 'unknown'
    let errorMessage: string = 'Unknown error'
    
    try {
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000) // 12 second timeout
      
      response = await fetch(targetUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.google.com/',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        redirect: 'follow',
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      finalUrl = response.url
      fetchStatus = response.status // Set to actual HTTP status
      
    } catch (fetchError: any) {
      // Handle fetch errors (DNS, TLS, timeout, etc.)
      // fetchStatus is already -1
      
      const errorStr = String(fetchError?.message || fetchError || 'Unknown error').toLowerCase()
      const errorCode = String(fetchError?.code || '').toUpperCase()
      
      // Determine error type based on error message/code
      if (fetchError?.name === 'AbortError' || errorStr.includes('aborted') || errorStr.includes('timeout')) {
        errorType = 'timeout'
        errorMessage = 'Request timed out after 12 seconds'
      } else if (errorCode.includes('ENOTFOUND') || errorCode.includes('EAI_AGAIN') || errorStr.includes('dns') || errorStr.includes('not found')) {
        errorType = 'dns'
        errorMessage = 'DNS lookup failed - domain not found'
      } else if (errorCode.includes('ECONNREFUSED') || errorStr.includes('connection refused') || errorStr.includes('conn_refused')) {
        errorType = 'conn_refused'
        errorMessage = 'Connection refused by server'
      } else if (errorCode.includes('ETIMEDOUT') || errorStr.includes('timed out')) {
        errorType = 'timeout'
        errorMessage = 'Connection timed out'
      } else if (errorCode.includes('CERT') || errorCode.includes('TLS') || errorStr.includes('certificate') || errorStr.includes('tls') || errorStr.includes('ssl')) {
        errorType = 'tls'
        errorMessage = 'TLS/SSL certificate error'
      } else if (errorStr.includes('aborted')) {
        errorType = 'aborted'
        errorMessage = 'Request was aborted'
      } else {
        errorType = 'unknown'
        errorMessage = fetchError?.message || String(fetchError) || 'Network error'
      }
      
      const result: FetchListingResult = {
        success: false,
        finalUrl, // Use input URL since we never got a response
        fetchStatus: -1, // Explicitly set to -1 for thrown errors
        blocked: true,
        errorType,
        errorMessage,
        pageTitle: null,
        blockReason: 'network_error',
      }
      return NextResponse.json(result, { status: 200 }) // Return 200 so analyze-listing can read the error details
    }
    
    const contentType = response.headers.get('content-type') || ''
    const contentLength = response.headers.get('content-length')
    
    // Handle HTTP error statuses
    if (!response.ok) {
      let blockReason: string | undefined = undefined
      let blocked = false
      
      if (fetchStatus === 403 || fetchStatus === 429) {
        blocked = true
        blockReason = fetchStatus === 429 ? 'rate_limited' : 'access_denied'
      }
      
      // Try to read response body to detect block type
      let html = ''
      let pageTitle: string | null = null
      try {
        html = await response.text()
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
        pageTitle = titleMatch ? titleMatch[1].substring(0, 200) : null
        
        // Detect specific block types
        const htmlLower = html.toLowerCase()
        if (htmlLower.includes('cloudflare')) {
          blockReason = 'cloudflare'
          blocked = true
        } else if (htmlLower.includes('captcha') || htmlLower.includes('challenge')) {
          blockReason = 'captcha'
          blocked = true
        } else if (htmlLower.includes('cookie') && htmlLower.includes('enable')) {
          blockReason = 'cookie_required'
          blocked = true
        }
      } catch (e) {
        // Couldn't read body
      }
      
      return NextResponse.json({
        success: false,
        blocked,
        fetchStatus,
        finalUrl,
        pageTitle,
        errorMessage: `HTTP ${fetchStatus}`,
        contentType,
        contentLength: contentLength ? parseInt(contentLength) : undefined,
        blockReason: blockReason || 'unknown',
      } as FetchResult)
    }
    
    // Success - read HTML
    const html = await response.text()
    
    // Detect blocked pages via strong signals
    const htmlLower = html.toLowerCase()
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
    const pageTitle = titleMatch ? titleMatch[1].substring(0, 200) : null
    const titleLower = pageTitle?.toLowerCase() || ''
    
    const blockedIndicators = [
      'access denied',
      'attention required',
      'robot',
      'captcha',
      'pardon our interruption',
      'verify you are human',
      'enable cookies',
    ]
    
    const bodyBlockedIndicators = [
      'cloudflare',
      'captcha',
      'enable cookies',
      'verify you are human',
      'challenge',
    ]
    
    let isBlocked = false
    let blockReason: string | undefined = undefined
    
    if (blockedIndicators.some(indicator => titleLower.includes(indicator)) ||
        bodyBlockedIndicators.some(indicator => htmlLower.includes(indicator))) {
      isBlocked = true
      
      // Determine specific block reason
      if (htmlLower.includes('cloudflare')) {
        blockReason = 'cloudflare'
      } else if (htmlLower.includes('captcha') || htmlLower.includes('challenge')) {
        blockReason = 'captcha'
      } else if (htmlLower.includes('cookie') && htmlLower.includes('enable')) {
        blockReason = 'cookie_required'
      } else {
        blockReason = 'unknown'
      }
    }
    
    return NextResponse.json({
      success: !isBlocked,
      html: isBlocked ? undefined : html, // Don't return HTML if blocked
      finalUrl,
      fetchStatus,
      contentType,
      contentLength: contentLength ? parseInt(contentLength) : undefined,
      blocked: isBlocked,
      pageTitle,
      pagePreview: html.substring(0, 200), // First 200 chars of body
      blockReason,
      // Legacy field for backward compatibility
      status: fetchStatus,
    } as FetchResult)
    
  } catch (error: any) {
    console.error('Fetch listing error:', error)
    return NextResponse.json({
      success: false,
      blocked: true,
      fetchStatus: -1,
      finalUrl: url || '',
      pageTitle: null,
      errorMessage: error.message || 'Failed to fetch listing',
      errorType: 'unknown',
      blockReason: 'unknown',
    } as FetchResult)
  }
}

