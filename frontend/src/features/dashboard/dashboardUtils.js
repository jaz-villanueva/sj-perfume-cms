// Calculations behind the dashboard (FR-11). They work on the sale objects returned by
// salesApi.listSales(), so the same code serves the sample data now and Supabase later.
import { CHANNELS, fromCentavos, toCentavos } from '../sales/saleUtils.js'

const DAY_MS = 24 * 60 * 60 * 1000

export const PERIODS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 0, label: 'All time' },
]

export const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

// Voided sales stay in the records but never count toward totals.
export const countedSales = (sales) => sales.filter((sale) => sale.status !== 'voided')

// Sales from the start of the day `days - 1` days ago up to now. 0 days means all time.
export function salesInPeriod(sales, days, now = new Date()) {
  if (!days) return sales
  const start = startOfDay(now).getTime() - (days - 1) * DAY_MS
  return sales.filter((sale) => {
    const soldAt = new Date(sale.soldAt).getTime()
    return soldAt >= start && soldAt <= now.getTime()
  })
}

const unitsIn = (sale) => sale.items.reduce((sum, item) => sum + item.quantity, 0)

export function summarize(sales) {
  const counted = countedSales(sales)
  const revenue = counted.reduce((sum, sale) => sum + toCentavos(sale.total), 0)
  return {
    revenue: fromCentavos(revenue),
    salesCount: counted.length,
    units: counted.reduce((sum, sale) => sum + unitsIn(sale), 0),
    averageSale: counted.length ? fromCentavos(Math.round(revenue / counted.length)) : 0,
  }
}

// Every channel appears, even with no sales, so the breakdown keeps the same rows.
export function byChannel(sales) {
  const counted = countedSales(sales)
  return CHANNELS.map(({ value, label }) => {
    const inChannel = counted.filter((sale) => sale.channel === value)
    return {
      channel: value,
      label,
      revenue: fromCentavos(inChannel.reduce((sum, sale) => sum + toCentavos(sale.total), 0)),
      salesCount: inChannel.length,
    }
  })
}

const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

// One entry per calendar day (local time), oldest first, including days without sales.
export function dailyRevenue(sales, days, now = new Date()) {
  const totals = new Map()
  for (const sale of countedSales(sales)) {
    const key = dayKey(new Date(sale.soldAt))
    const day = totals.get(key) ?? { revenue: 0, salesCount: 0 }
    totals.set(key, { revenue: day.revenue + toCentavos(sale.total), salesCount: day.salesCount + 1 })
  }
  const today = startOfDay(now)
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1 - i))
    const day = totals.get(dayKey(date)) ?? { revenue: 0, salesCount: 0 }
    return { date, key: dayKey(date), revenue: fromCentavos(day.revenue), salesCount: day.salesCount }
  })
}

// Best sellers by units, then revenue.
export function topProducts(sales, limit = 5) {
  const products = new Map()
  for (const sale of countedSales(sales)) {
    for (const item of sale.items) {
      const product = products.get(item.productId) ?? { productId: item.productId, sku: item.sku, name: item.name, units: 0, revenue: 0 }
      product.units += item.quantity
      product.revenue += toCentavos(item.lineTotal)
      products.set(item.productId, product)
    }
  }
  return [...products.values()]
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, limit)
    .map((product) => ({ ...product, revenue: fromCentavos(product.revenue) }))
}

export const recentSales = (sales, limit = 5) =>
  [...sales].sort((a, b) => b.soldAt.localeCompare(a.soldAt)).slice(0, limit)

// Products need a reorder level from Inventory (FR-6). Until that module shares one, the
// dashboard uses the same default the Products screen starts new products with.
export const DEFAULT_REORDER_LEVEL = 5

export function stockWatch(products, defaultReorderLevel = DEFAULT_REORDER_LEVEL) {
  return products
    .map((product) => ({ ...product, reorderLevel: product.reorderLevel ?? defaultReorderLevel }))
    .filter((product) => product.onHand <= product.reorderLevel)
    .map((product) => ({ ...product, status: product.onHand === 0 ? 'out' : 'low' }))
    .sort((a, b) => a.onHand - b.onHand || a.name.localeCompare(b.name))
}
