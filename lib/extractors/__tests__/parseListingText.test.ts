import { parseListingText } from '../cars'

describe('parseListingText', () => {
  it('should extract dealer name, year, make, model from pasted text', () => {
    const pastedText = `
      Victory Toyota of Midtown
      123 Main Street
      Atlanta, GA 30309
      
      2026 Toyota Tundra Limited
      Price: $45,990
      Mileage: 12,500 miles
      VIN: 5TFDZ5BN1MX123456
      
      Contact us for more information
    `
    
    const result = parseListingText(pastedText)
    
    // Check dealer name
    expect(result.dealerName).toBe('Victory Toyota of Midtown')
    expect(result.raw?.dealerNameCandidates).toBeDefined()
    expect(result.raw?.dealerNameCandidates?.length).toBeGreaterThan(0)
    
    // Check year/make/model
    expect(result.year).toBe(2026)
    expect(result.make).toBe('Toyota')
    expect(result.model).toBe('Tundra')
    expect(result.trim).toBe('Limited')
    
    // Check price
    expect(result.price).toBe(45990)
    
    // Check mileage
    expect(result.mileage).toBe(12500)
    
    // Check VIN
    expect(result.vin).toBe('5TFDZ5BN1MX123456')
    
    // Check location
    expect(result.dealerCity).toBe('Atlanta')
    expect(result.dealerState).toBe('GA')
    expect(result.zip).toBe('30309')
    
    // Check title candidates
    expect(result.raw?.titleCandidates).toBeDefined()
    expect(result.raw?.vehicleTitleCandidate).toContain('2026 Toyota Tundra')
  })
  
  it('should handle dealer name with direct match pattern', () => {
    const pastedText = `
      Home Inventory Search
      Victory Toyota of Midtown
      Contact Directions Hours
      
      2025 Honda Civic Sport
      $28,500
    `
    
    const result = parseListingText(pastedText)
    
    // Direct match should win
    expect(result.dealerName).toBe('Victory Toyota of Midtown')
    expect(result.year).toBe(2025)
    expect(result.make).toBe('Honda')
    expect(result.model).toBe('Civic')
    expect(result.trim).toBe('Sport')
  })
  
  it('should extract location from address format', () => {
    const pastedText = `
      Dealer Name: ABC Motors
      Address: 456 Oak Avenue, Dallas, TX 75201
      Phone: (555) 123-4567
      
      2024 Ford F-150
      $38,900
    `
    
    const result = parseListingText(pastedText)
    
    expect(result.dealerCity).toBe('Dallas')
    expect(result.dealerState).toBe('TX')
    expect(result.zip).toBe('75201')
  })
  
  it('should show candidates when multiple matches found', () => {
    const pastedText = `
      Toyota of Atlanta
      Atlanta Toyota Dealership
      Victory Toyota of Midtown
      
      2026 Toyota Camry XLE
      $32,000
    `
    
    const result = parseListingText(pastedText)
    
    // Should have multiple dealer name candidates
    expect(result.raw?.dealerNameCandidates?.length).toBeGreaterThan(1)
    expect(result.dealerName).toBeDefined()
    
    // Should extract vehicle info
    expect(result.year).toBe(2026)
    expect(result.make).toBe('Toyota')
    expect(result.model).toBe('Camry')
  })
})






