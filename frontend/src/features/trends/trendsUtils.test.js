import { describe, expect, it } from 'vitest'
import { monthlyTotals, productUnitsByWeek, productsSold, startOfWeek, weeklyTotals } from './trendsUtils.js'

// Local dates, so the tests don't depend on the machine's time zone.
const at = (month, day, hour = 10) => new Date(2026, month - 1, day, hour).toISOString()
const NOW = new Date(2026, 9, 24, 15) // Saturday 24 Oct 2026, 3 PM; the week runs Mon 19 to Sun 25 Oct

const sale = (id, soldAt, total, items, extra = {}) => ({ id, soldAt, total, items, status: 'completed', channel: 'walk_in', ...extra })
const item = (productId, quantity, unitPrice) => ({ productId, name: `Product ${productId}`, quantity, unitPrice, lineTotal: quantity * unitPrice })

const SALES = [
  sale(1, at(10, 24, 9), 850, [item(1, 1, 850)]), // this week
  sale(2, at(10, 18), 1700.1, [item(2, 2, 850.05)]), // Sunday, week of 12 Oct
  sale(3, at(10, 10), 0.2, [item(3, 1, 0.2)], { channel: 'online' }), // week of 5 Oct
  sale(4, at(10, 23), 999, [item(1, 1, 999)], { status: 'voided' }), // this week, but voided
  sale(5, at(8, 1), 500, [item(4, 5, 100)], { channel: 'reseller' }), // August, outside the windows below
]

describe('startOfWeek', () => {
  it('returns the Monday of the week, Sunday included', () => {
    expect(startOfWeek(NOW)).toEqual(new Date(2026, 9, 19))
    expect(startOfWeek(new Date(2026, 9, 18, 12))).toEqual(new Date(2026, 9, 12))
  })
})

describe('weeklyTotals', () => {
  it('gives one entry per week, oldest first, including weeks with no sales', () => {
    const weeks = weeklyTotals(SALES, 4, NOW)
    expect(weeks.map((w) => w.key)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19'])
    expect(weeks.map((w) => w.revenue)).toEqual([0, 0.2, 1700.1, 850])
    expect(weeks.map((w) => w.salesCount)).toEqual([0, 1, 1, 1])
  })

  it('leaves voided sales out of the week they were made in', () => {
    const thisWeek = weeklyTotals(SALES, 4, NOW).at(-1)
    expect(thisWeek.salesCount).toBe(1)
    expect(thisWeek.units).toBe(1)
  })

  it('averages each week with the three weeks before it, using actual sales only', () => {
    const thisWeek = weeklyTotals(SALES, 4, NOW).at(-1)
    // (0 + 0.2 + 1700.1 + 850) / 4 = 637.575, rounded to the centavo
    expect(thisWeek.average).toBe(637.58)
  })
})

describe('monthlyTotals', () => {
  it('totals each calendar month, including empty ones', () => {
    const months = monthlyTotals(SALES, 3, NOW)
    expect(months.map((m) => m.key)).toEqual(['2026-08', '2026-09', '2026-10'])
    expect(months.map((m) => m.revenue)).toEqual([500, 0, 2550.3])
    expect(months.map((m) => m.salesCount)).toEqual([1, 0, 3])
    expect(months.map((m) => m.units)).toEqual([5, 0, 4])
  })
})

describe('productUnitsByWeek', () => {
  it('counts one product per week, without voided sales', () => {
    expect(productUnitsByWeek(SALES, 1, 3, NOW).map((w) => w.units)).toEqual([0, 0, 1])
    expect(productUnitsByWeek(SALES, 2, 3, NOW).map((w) => w.units)).toEqual([0, 2, 0])
  })
})

describe('productsSold', () => {
  it('lists products that sold in the period, best sellers first', () => {
    const products = productsSold(SALES, 4, NOW)
    expect(products.map((p) => p.productId)).toEqual([2, 1, 3])
    expect(products.map((p) => p.units)).toEqual([2, 1, 1])
  })
})
