import { describe, expect, it } from 'vitest'
import { byChannel, dailyRevenue, recentSales, salesInPeriod, stockWatch, summarize, topProducts } from './dashboardUtils.js'

// Local dates, so the tests don't depend on the machine's time zone.
const at = (month, day, hour = 10) => new Date(2026, month - 1, day, hour).toISOString()
const NOW = new Date(2026, 9, 24, 15) // 24 Oct 2026, 3 PM

const sale = (id, soldAt, total, items, extra = {}) => ({ id, soldAt, total, items, status: 'completed', channel: 'walk_in', ...extra })
const item = (productId, quantity, unitPrice) => ({ productId, name: `Product ${productId}`, quantity, unitPrice, lineTotal: quantity * unitPrice })

const SALES = [
  sale(1, at(10, 24, 9), 850, [item(1, 1, 850)]),
  sale(2, at(10, 18), 1700.1, [item(2, 2, 850.05)]),
  sale(3, at(10, 10), 0.2, [item(3, 1, 0.2)], { channel: 'online' }),
  sale(4, at(10, 23), 999, [item(1, 1, 999)], { status: 'voided' }),
  sale(5, at(8, 1), 500, [item(4, 5, 100)], { channel: 'reseller' }),
]

describe('salesInPeriod', () => {
  it('keeps sales from the start of the first day of the period up to now', () => {
    expect(salesInPeriod(SALES, 7, NOW).map((s) => s.id)).toEqual([1, 2, 4])
    expect(salesInPeriod(SALES, 30, NOW).map((s) => s.id)).toEqual([1, 2, 3, 4])
  })

  it('returns every sale for "all time"', () => {
    expect(salesInPeriod(SALES, 0, NOW)).toHaveLength(SALES.length)
  })

  it('leaves out sales dated after now', () => {
    const future = [sale(9, at(10, 25), 100, [item(1, 1, 100)])]
    expect(salesInPeriod(future, 7, NOW)).toEqual([])
  })
})

describe('summarize', () => {
  it('totals revenue, sales and units without voided sales', () => {
    expect(summarize(SALES)).toEqual({ revenue: 3050.3, salesCount: 4, units: 9, averageSale: 762.58 })
  })

  it('adds peso amounts in centavos, so totals stay exact', () => {
    expect(summarize([sale(1, at(10, 1), 0.1, []), sale(2, at(10, 1), 0.2, [])]).revenue).toBe(0.3)
  })

  it('reports zeros when there are no sales', () => {
    expect(summarize([])).toEqual({ revenue: 0, salesCount: 0, units: 0, averageSale: 0 })
  })
})

describe('byChannel', () => {
  it('lists every channel in a fixed order, skipping voided sales', () => {
    expect(byChannel(SALES)).toEqual([
      { channel: 'walk_in', label: 'Walk-in', revenue: 2550.1, salesCount: 2 },
      { channel: 'online', label: 'Online (Messenger)', revenue: 0.2, salesCount: 1 },
      { channel: 'reseller', label: 'Reseller', revenue: 500, salesCount: 1 },
    ])
  })
})

describe('dailyRevenue', () => {
  it('returns one row per day, oldest first, with empty days at zero', () => {
    const days = dailyRevenue(SALES, 7, NOW)
    expect(days.map((d) => d.key)).toEqual(['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24'])
    expect(days.map((d) => d.revenue)).toEqual([1700.1, 0, 0, 0, 0, 0, 850])
    expect(days[6].salesCount).toBe(1)
  })
})

describe('topProducts', () => {
  it('ranks products by units, then revenue', () => {
    expect(topProducts(SALES, 3).map((p) => [p.productId, p.units, p.revenue])).toEqual([
      [4, 5, 500],
      [2, 2, 1700.1],
      [1, 1, 850],
    ])
  })
})

describe('recentSales', () => {
  it('returns the newest sales first, voided ones included', () => {
    expect(recentSales(SALES, 3).map((s) => s.id)).toEqual([1, 4, 2])
  })
})

describe('stockWatch', () => {
  const products = [
    { id: 1, name: 'Rose', onHand: 24 },
    { id: 2, name: 'Vanilla', onHand: 3 },
    { id: 3, name: 'Oud', onHand: 0 },
    { id: 4, name: 'Citrus', onHand: 8, reorderLevel: 10 },
  ]

  it('lists products at or below their reorder level, emptiest first', () => {
    expect(stockWatch(products).map((p) => [p.name, p.status])).toEqual([
      ['Oud', 'out'],
      ['Vanilla', 'low'],
      ['Citrus', 'low'],
    ])
  })

  it('uses a product reorder level when it has one, and the default otherwise', () => {
    expect(stockWatch(products).find((p) => p.name === 'Vanilla').reorderLevel).toBe(5)
    expect(stockWatch(products).find((p) => p.name === 'Citrus').reorderLevel).toBe(10)
  })
})
