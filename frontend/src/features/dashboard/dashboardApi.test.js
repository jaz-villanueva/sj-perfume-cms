import { describe, expect, it } from 'vitest'
import { dashboardApi, fromSummaryRow } from './dashboardApi.js'

const NOW = new Date(2026, 9, 24, 15)

describe('dashboardApi in sample mode', () => {
  it('builds every dashboard section from the Sales sample data', async () => {
    const data = await dashboardApi.getDashboard({ days: 0, now: NOW })
    expect(dashboardApi.isSample).toBe(true)
    expect(data.summary).toEqual({ revenue: 9150, salesCount: 3, units: 18, averageSale: 3050 })
    expect(data.byChannel.map((c) => c.revenue)).toEqual([850, 700, 7600])
    expect(data.daily).toHaveLength(90)
    expect(data.topBuyers[0]).toMatchObject({ kind: 'reseller', name: 'Scents by Mia', revenue: 7600 })
    expect(data.stockWatch.map((p) => p.status)).toEqual(['out', 'low'])
    expect(data.recentSales[0].saleNo).toBe('S-2026-000003')
  })
})

describe('fromSummaryRow', () => {
  it('maps the database result and fills days without sales', () => {
    const row = {
      summary: { revenue: '1500.50', sales_count: 2, units: 3, average_sale: '750.25' },
      by_channel: [{ channel: 'walk_in', revenue: '1500.50', sales_count: 2 }],
      daily: [{ day: '2026-10-24', revenue: '1500.50', sales_count: 2 }],
      top_products: [{ product_id: 1, sku: 'SJ-000101', name: 'Rose', units: 3, revenue: '1500.50' }],
      top_buyers: [{ kind: 'customer', id: 7, name: 'Ana Reyes', sales_count: 2, revenue: '1500.50' }],
    }
    const data = fromSummaryRow(row, 7, NOW)
    expect(data.summary).toEqual({ revenue: 1500.5, salesCount: 2, units: 3, averageSale: 750.25 })
    expect(data.byChannel[0]).toEqual({ channel: 'walk_in', label: 'Walk-in', revenue: 1500.5, salesCount: 2 })
    expect(data.daily).toHaveLength(7)
    expect(data.daily[6]).toMatchObject({ key: '2026-10-24', revenue: 1500.5, salesCount: 2 })
    expect(data.daily[0]).toMatchObject({ revenue: 0, salesCount: 0 })
    expect(data.topBuyers[0].key).toBe('customer:7')
  })
})
