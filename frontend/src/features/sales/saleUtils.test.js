import { describe, expect, it } from 'vitest'
import { isValid, lineTotal, saleTotal, toRecordSalePayload, unitPriceFor, validateSale } from './saleUtils.js'

const products = [
  { id: 1, name: 'Rose Velvet', retailPrice: 850, resellerPrice: 680, onHand: 10 },
  { id: 2, name: 'Body Mist', retailPrice: 0.1, resellerPrice: 0.1, onHand: 100 },
]
const resellers = [
  { id: 1, businessName: 'Scents by Mia', status: 'active' },
  { id: 3, businessName: 'Old Shop', status: 'inactive' },
]

describe('prices and totals', () => {
  it('uses the reseller price only for reseller sales', () => {
    expect(unitPriceFor(products[0], 'reseller')).toBe(680)
    expect(unitPriceFor(products[0], 'walk_in')).toBe(850)
    expect(unitPriceFor(products[0], 'online')).toBe(850)
  })

  it('computes totals to the centavo', () => {
    expect(lineTotal(3, 680)).toBe(2040)
    expect(saleTotal([{ quantity: 1, unitPrice: 0.1 }, { quantity: 1, unitPrice: 0.2 }])).toBe(0.3)
    expect(saleTotal([{ quantity: 3, unitPrice: 850 }, { quantity: 2, unitPrice: 349.99 }])).toBe(3249.98)
  })
})

describe('validateSale', () => {
  const ok = { channel: 'walk_in', customerId: null, resellerId: null, lines: [{ productId: 1, quantity: 3 }] }

  it('accepts a valid walk-in sale without a customer', () => {
    expect(isValid(validateSale(ok, products, resellers))).toBe(true)
  })

  it('needs a channel and at least one product', () => {
    const result = validateSale({ ...ok, channel: '', lines: [] }, products, resellers)
    expect(result.form).toHaveLength(2)
  })

  it('needs an active reseller for reseller sales', () => {
    expect(validateSale({ ...ok, channel: 'reseller' }, products, resellers).form).toEqual(['Choose the reseller.'])
    expect(validateSale({ ...ok, channel: 'reseller', resellerId: 3 }, products, resellers).form[0]).toMatch(/not active/)
    expect(isValid(validateSale({ ...ok, channel: 'reseller', resellerId: 1 }, products, resellers))).toBe(true)
  })

  it('blocks a quantity above the stock on hand', () => {
    const result = validateSale({ ...ok, lines: [{ productId: 1, quantity: 11 }] }, products, resellers)
    expect(result.lines[1]).toBe('Only 10 in stock.')
  })

  it('blocks zero, negative and fractional quantities', () => {
    for (const quantity of [0, -1, 1.5]) {
      expect(validateSale({ ...ok, lines: [{ productId: 1, quantity }] }, products, resellers).lines[1]).toMatch(/whole number/)
    }
  })
})

describe('toRecordSalePayload', () => {
  it('sends ids and quantities only, never prices', () => {
    const payload = toRecordSalePayload({ channel: 'reseller', customerId: 5, resellerId: 1, lines: [{ productId: 1, quantity: 3 }] })
    expect(payload).toEqual({ channel: 'reseller', customer_id: null, reseller_id: 1, lines: [{ product_id: 1, quantity: 3 }] })
  })
})
