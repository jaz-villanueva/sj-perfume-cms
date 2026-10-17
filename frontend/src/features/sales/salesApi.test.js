// Tests the sample backend, which follows the same rules the record_sale and void_sale
// database functions must follow (FR-11, NFR-5).
import { beforeEach, describe, expect, it } from 'vitest'
import { resetSampleSales, salesApi } from './salesApi.js'

const stockOf = async (id) => (await salesApi.listProducts()).find((p) => p.id === id).onHand

beforeEach(() => {
  resetSampleSales()
})

describe('sample sales backend', () => {
  it('deducts stock and issues a sale number', async () => {
    const before = await stockOf(1)
    const sale = await salesApi.recordSale({ channel: 'walk_in', lines: [{ productId: 1, quantity: 3 }] })
    expect(sale.saleNo).toMatch(/^S-\d{4}-\d{6}$/)
    expect(sale.total).toBe(2550)
    expect(await stockOf(1)).toBe(before - 3)
  })

  it('charges the reseller price on reseller sales', async () => {
    const sale = await salesApi.recordSale({ channel: 'reseller', resellerId: 1, lines: [{ productId: 1, quantity: 3 }] })
    expect(sale.total).toBe(2040)
    expect(sale.resellerName).toBe('Scents by Mia')
  })

  it('refuses a sale above the stock on hand and saves nothing', async () => {
    const salesBefore = (await salesApi.listSales()).length
    const stockBefore = await stockOf(2)
    await expect(
      salesApi.recordSale({ channel: 'walk_in', lines: [{ productId: 2, quantity: 1 }, { productId: 3, quantity: 99 }] }),
    ).rejects.toThrow(/Insufficient stock/)
    expect((await salesApi.listSales()).length).toBe(salesBefore)
    expect(await stockOf(2)).toBe(stockBefore)
  })

  it('refuses an inactive reseller', async () => {
    await expect(
      salesApi.recordSale({ channel: 'reseller', resellerId: 3, lines: [{ productId: 1, quantity: 1 }] }),
    ).rejects.toThrow(/active reseller/)
  })

  it('voids a sale, returns its stock and keeps the record', async () => {
    const sale = await salesApi.recordSale({ channel: 'online', lines: [{ productId: 4, quantity: 5 }] })
    const afterSale = await stockOf(4)
    await salesApi.voidSale(sale.id, 'Customer cancelled')
    expect(await stockOf(4)).toBe(afterSale + 5)
    const kept = (await salesApi.listSales()).find((s) => s.id === sale.id)
    expect(kept.status).toBe('voided')
    expect(kept.voidReason).toBe('Customer cancelled')
  })

  it('will not void twice or without a reason', async () => {
    await expect(salesApi.voidSale(1, ' ')).rejects.toThrow(/reason/)
    await salesApi.voidSale(1, 'Wrong item')
    await expect(salesApi.voidSale(1, 'Again')).rejects.toThrow(/already voided/)
  })
})
