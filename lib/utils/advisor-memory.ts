/**
 * Advisor Session Memory Utilities
 * Stores user answers per listing for continuity
 */

import type { AdvisorSessionMemory, AdvisorModuleAnswers, AdvisorModule } from '@/lib/types/financing-advisor'

const MEMORY_PREFIX = 'advisor_memory_'

/**
 * Get memory key for a listing
 */
function getMemoryKey(listingUrl: string): string {
  return `${MEMORY_PREFIX}${listingUrl}`
}

/**
 * Save answers for a module to localStorage
 */
export function saveAdvisorAnswers(
  listingUrl: string,
  module: AdvisorModule,
  answers: Partial<AdvisorModuleAnswers>
): void {
  try {
    const key = getMemoryKey(listingUrl)
    const existing = localStorage.getItem(key)
    const memory: AdvisorSessionMemory = existing 
      ? JSON.parse(existing)
      : {
          listingUrl,
          lastUpdated: new Date().toISOString(),
        }

    // Update the specific module's answers
    switch (module) {
      case 'financing':
        memory.financingAnswers = answers as Partial<typeof memory.financingAnswers>
        break
      case 'good_deal':
        memory.goodDealAnswers = answers as Partial<typeof memory.goodDealAnswers>
        break
      case 'new_vs_used':
        memory.newVsUsedAnswers = answers as Partial<typeof memory.newVsUsedAnswers>
        break
      case 'payment_safe':
        memory.paymentSafeAnswers = answers as Partial<typeof memory.paymentSafeAnswers>
        break
      case 'go_in':
        memory.goInAnswers = answers as Partial<typeof memory.goInAnswers>
        break
      case 'fees_walk':
        memory.feesWalkAnswers = answers as Partial<typeof memory.feesWalkAnswers>
        break
      case 'down_payment':
        memory.downPaymentAnswers = answers as Partial<typeof memory.downPaymentAnswers>
        break
    }

    memory.lastUpdated = new Date().toISOString()
    localStorage.setItem(key, JSON.stringify(memory))
  } catch (error) {
    console.warn('Failed to save advisor answers to localStorage:', error)
  }
}

/**
 * Get saved answers for a module
 */
export function getAdvisorAnswers(
  listingUrl: string,
  module: AdvisorModule
): Partial<AdvisorModuleAnswers> | null {
  try {
    const key = getMemoryKey(listingUrl)
    const stored = localStorage.getItem(key)
    if (!stored) return null

    const memory: AdvisorSessionMemory = JSON.parse(stored)
    
    switch (module) {
      case 'financing':
        return memory.financingAnswers || null
      case 'good_deal':
        return memory.goodDealAnswers || null
      case 'new_vs_used':
        return memory.newVsUsedAnswers || null
      case 'payment_safe':
        return memory.paymentSafeAnswers || null
      case 'go_in':
        return memory.goInAnswers || null
      case 'fees_walk':
        return memory.feesWalkAnswers || null
      case 'down_payment':
        return memory.downPaymentAnswers || null
      default:
        return null
    }
  } catch (error) {
    console.warn('Failed to get advisor answers from localStorage:', error)
    return null
  }
}

/**
 * Get all saved memory for a listing
 */
export function getAdvisorMemory(listingUrl: string): AdvisorSessionMemory | null {
  try {
    const key = getMemoryKey(listingUrl)
    const stored = localStorage.getItem(key)
    if (!stored) return null
    return JSON.parse(stored) as AdvisorSessionMemory
  } catch (error) {
    console.warn('Failed to get advisor memory from localStorage:', error)
    return null
  }
}

/**
 * Clear memory for a listing
 */
export function clearAdvisorMemory(listingUrl: string): void {
  try {
    const key = getMemoryKey(listingUrl)
    localStorage.removeItem(key)
  } catch (error) {
    console.warn('Failed to clear advisor memory from localStorage:', error)
  }
}






