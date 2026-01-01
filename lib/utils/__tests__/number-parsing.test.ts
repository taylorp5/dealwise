/**
 * Unit tests for number parsing utilities
 */

import { parseMoney, parsePercentToDecimal, calculateOTD, calculateOTDRange } from '../number-parsing'

describe('parseMoney', () => {
  test('parses dollar strings with commas', () => {
    expect(parseMoney('$23,450')).toBe(23450)
    expect(parseMoney('23,450')).toBe(23450)
    expect(parseMoney('$1,234.56')).toBe(1234.56)
  })

  test('parses numbers', () => {
    expect(parseMoney(23450)).toBe(23450)
    expect(parseMoney(1234.56)).toBe(1234.56)
  })

  test('handles invalid input', () => {
    expect(parseMoney('invalid')).toBe(0)
    expect(parseMoney(NaN)).toBe(0)
    expect(parseMoney(null)).toBe(0)
    expect(parseMoney(undefined)).toBe(0)
  })

  test('handles negative numbers (returns absolute)', () => {
    expect(parseMoney(-23450)).toBe(23450)
    expect(parseMoney('-$23,450')).toBe(23450)
  })
})

describe('parsePercentToDecimal', () => {
  test('parses percentage strings', () => {
    expect(parsePercentToDecimal('7.25%')).toBeCloseTo(0.0725, 4)
    expect(parsePercentToDecimal('6.5%')).toBeCloseTo(0.065, 4)
  })

  test('parses percentage numbers (> 1)', () => {
    expect(parsePercentToDecimal(7.25)).toBeCloseTo(0.0725, 4)
    expect(parsePercentToDecimal(6.5)).toBeCloseTo(0.065, 4)
  })

  test('parses decimal numbers (<= 1)', () => {
    expect(parsePercentToDecimal(0.0725)).toBeCloseTo(0.0725, 4)
    expect(parsePercentToDecimal(0.065)).toBeCloseTo(0.065, 4)
  })

  test('parses decimal strings (<= 1)', () => {
    expect(parsePercentToDecimal('0.0725')).toBeCloseTo(0.0725, 4)
    expect(parsePercentToDecimal('0.065')).toBeCloseTo(0.065, 4)
  })

  test('clamps to max percent', () => {
    expect(parsePercentToDecimal(25)).toBeCloseTo(0.15, 4) // Clamped to 15%
    expect(parsePercentToDecimal(20, { maxPercent: 20 })).toBeCloseTo(0.20, 4)
  })

  test('clamps to min percent', () => {
    expect(parsePercentToDecimal(-5)).toBeCloseTo(0, 4) // Clamped to 0%
  })

  test('handles invalid input', () => {
    expect(parsePercentToDecimal('invalid')).toBe(0)
    expect(parsePercentToDecimal(NaN)).toBe(0)
    expect(parsePercentToDecimal(null)).toBe(0)
    expect(parsePercentToDecimal(undefined)).toBe(0)
  })
})

describe('calculateOTD', () => {
  test('calculates OTD correctly for typical case', () => {
    const result = calculateOTD({
      vehiclePrice: 23450,
      taxRateDecimal: 0.0725, // 7.25%
      docFee: 499,
      registrationFee: 250,
      titleFee: 50,
      otherFees: 0,
      addOns: 0,
    })

    // Expected: 23450 + (23450 * 0.0725) + 499 + 250 + 50
    // = 23450 + 1700.125 + 799
    // = 25949.125
    expect(result.otd).toBeCloseTo(25949.13, 2)
    expect(result.taxAmount).toBeCloseTo(1700.13, 2)
    expect(result.fees).toBe(799)
    expect(result.issues.length).toBe(0)
  })

  test('detects OTD > 1.5x vehicle price', () => {
    const result = calculateOTD({
      vehiclePrice: 20000,
      taxRateDecimal: 0.5, // 50% (unrealistic)
      docFee: 10000,
      registrationFee: 5000,
      titleFee: 0,
      otherFees: 0,
      addOns: 0,
    })

    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues.some(i => i.includes('50% above'))).toBe(true)
  })

  test('detects OTD < vehicle price', () => {
    const result = calculateOTD({
      vehiclePrice: 20000,
      taxRateDecimal: -0.1, // Negative (invalid)
      docFee: -1000,
      registrationFee: 0,
      titleFee: 0,
      otherFees: 0,
      addOns: 0,
    })

    expect(result.issues.length).toBeGreaterThan(0)
  })

  test('validates tax rate range', () => {
    const result = calculateOTD({
      vehiclePrice: 20000,
      taxRateDecimal: 0.25, // 25% (too high)
      docFee: 500,
      registrationFee: 200,
      titleFee: 0,
      otherFees: 0,
      addOns: 0,
    })

    expect(result.issues.some(i => i.includes('outside normal range'))).toBe(true)
  })
})

describe('calculateOTDRange', () => {
  test('calculates OTD range correctly', () => {
    const result = calculateOTDRange({
      vehiclePrice: 23450,
      taxRateDecimal: 0.0725, // 7.25%
      docFee: { low: 299, high: 699 },
      registrationFee: { low: 200, high: 600 },
      titleFee: { low: 20, high: 100 },
      otherFees: 0,
      addOns: 0,
    })

    // Low: 23450 + tax + 299 + 200 + 20
    // Expected: 23450 + tax + (299+699)/2 + (200+600)/2 + (20+100)/2
    // High: 23450 + tax + 699 + 600 + 100

    expect(result.low).toBeLessThan(result.expected)
    expect(result.expected).toBeLessThan(result.high)
    expect(result.issues.length).toBe(0)
  })

  test('validates range consistency', () => {
    const result = calculateOTDRange({
      vehiclePrice: 23450,
      taxRateDecimal: 0.0725,
      docFee: { low: 1000, high: 500 }, // Invalid: low > high
      registrationFee: { low: 200, high: 600 },
      titleFee: { low: 20, high: 100 },
      otherFees: 0,
      addOns: 0,
    })

    // Should still calculate but flag issues
    expect(result.issues.length).toBeGreaterThan(0)
  })
})






