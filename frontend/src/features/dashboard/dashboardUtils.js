// Calculations behind the dashboard (FR-11). They work on the sale objects returned by
// salesApi.listSales(), so the same code serves the sample data now and Supabase later.
import { fromCentavos, toCentavos } from '../sales/saleUtils.js'

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
