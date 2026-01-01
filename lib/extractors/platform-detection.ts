/**
 * Platform detection for dealer websites
 * Identifies common dealer platforms to use platform-specific extraction strategies
 */

export type DealerPlatform = 
  | 'dealeron' 
  | 'dealerinspire' 
  | 'cdk' 
  | 'dealercom' 
  | 'vauto' 
  | 'autotrader_cms' 
  | 'car_gurus_embed' 
  | 'unknown'

/**
 * Detect dealer platform from HTML/JS signatures
 */
export function detectPlatform(html: string): DealerPlatform {
  const htmlLower = html.toLowerCase()
  
  // DealerInspire: Nuxt.js based
  if (
    htmlLower.includes('dealerinspire') ||
    htmlLower.includes('window.__nuxt__') ||
    htmlLower.includes('data-nuxt') ||
    htmlLower.includes('nuxt-dealer')
  ) {
    return 'dealerinspire'
  }
  
  // DealerOn
  if (
    htmlLower.includes('dealeron') ||
    htmlLower.includes('inventorysearch') ||
    htmlLower.includes('ds-vehicle') ||
    htmlLower.includes('dealeron.com')
  ) {
    return 'dealeron'
  }
  
  // CDK Global
  if (
    htmlLower.includes('cdkglobal') ||
    htmlLower.includes('oneclick') ||
    htmlLower.includes('digitalretail') ||
    htmlLower.includes('cdk.com')
  ) {
    return 'cdk'
  }
  
  // dealer.com / DealerTrack
  if (
    htmlLower.includes('dealer.com') ||
    htmlLower.includes('dealertrack') ||
    htmlLower.includes('dealercore') ||
    htmlLower.includes('dealer.com/')
  ) {
    return 'dealercom'
  }
  
  // vAuto
  if (
    htmlLower.includes('vauto') ||
    htmlLower.includes('vauto.com') ||
    htmlLower.includes('vin-solutions')
  ) {
    return 'vauto'
  }
  
  // AutoTrader CMS
  if (
    htmlLower.includes('autotrader.com') &&
    (htmlLower.includes('atcms') || htmlLower.includes('at-inventory'))
  ) {
    return 'autotrader_cms'
  }
  
  // CarGurus embed
  if (
    htmlLower.includes('cargurus.com') &&
    (htmlLower.includes('cg-embed') || htmlLower.includes('cargurus-embed'))
  ) {
    return 'car_gurus_embed'
  }
  
  return 'unknown'
}

/**
 * Get platform-specific JSON paths for vehicle data
 */
export function getPlatformPaths(platform: DealerPlatform): {
  price?: string[]
  mileage?: string[]
  vin?: string[]
  condition?: string[]
  year?: string[]
  make?: string[]
  makeModel?: string[]
  model?: string[]
  trim?: string[]
} {
  switch (platform) {
    case 'dealerinspire':
      return {
        price: ['vehicle', 'internetPrice', 'salePrice', 'price'],
        mileage: ['vehicle', 'odometer', 'mileage'],
        vin: ['vehicle', 'vin'],
        condition: ['vehicle', 'condition', 'isNew', 'certified'],
        year: ['vehicle', 'year'],
        make: ['vehicle', 'make'],
        model: ['vehicle', 'model'],
        trim: ['vehicle', 'trim'],
      }
    
    case 'dealeron':
      return {
        price: ['internetPrice', 'salePrice', 'price', 'listPrice'],
        mileage: ['odometer', 'mileage'],
        vin: ['vin'],
        condition: ['condition', 'isNew'],
        year: ['year'],
        make: ['make'],
        model: ['model'],
        trim: ['trim'],
      }
    
    case 'cdk':
      return {
        price: ['pricing', 'internetPrice', 'salePrice', 'price'],
        mileage: ['specifications', 'odometer', 'mileage'],
        vin: ['vin'],
        condition: ['condition', 'new'],
        year: ['year'],
        make: ['make'],
        model: ['model'],
        trim: ['trim'],
      }
    
    default:
      return {}
  }
}






