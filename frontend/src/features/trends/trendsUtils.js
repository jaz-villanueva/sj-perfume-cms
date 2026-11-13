// Sales trends (FR-14, trends part). Every figure is built from recorded sales. Nothing here is a
// forecast: the moving average is the average of past weeks that actually happened (NFR-11).
import { fromCentavos, toCentavos } from '../sales/saleUtils.js'

export const WEEK_OPTIONS = [
  { value: 12, label: 'Last 12 weeks' },
  { value: 26, label: 'Last 26 weeks' },
  { value: 52, label: 'Last 52 weeks' },
]
export const AVERAGE_WEEKS = 4
export const MONTHS_SHOWN = 6
// Database mode reads at most this many sales (see salesApi.listSales), so older weeks can be short.
export const SALES_LIST_LIMIT = 200

const pad = (n) => String(n).padStart(2, '0')
const keyOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

// Monday of the week containing `date`, at local midnight. Weeks run Monday to Sunday.
export function startOfWeek(date) {
  const daysSinceMonday = (date.getDay() + 6) % 7
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday)
}

// Monday dates of the last `count` weeks, oldest first, ending with the current week.
export function recentWeekStarts(count, now = new Date()) {
  const thisWeek = startOfWeek(now)
  return Array.from({ length: count }, (_, i) =>
    new Date(thisWeek.getFullYear(), thisWeek.getMonth(), thisWeek.getDate() - 7 * (count - 1 - i)),
  )
}

// Voided sales stay in the records but never count toward totals.
const counted = (sales) => sales.filter((sale) => sale.status !== 'voided')
const unitsOf = (sale, productId = null) =>
  sale.items.filter((item) => productId === null || item.productId === productId).reduce((sum, item) => sum + item.quantity, 0)

// One entry per week, oldest first, including weeks with no sales. Each week also carries the
// average of itself and the AVERAGE_WEEKS - 1 weeks before it, so every week shown has a full average.
export function weeklyTotals(sales, weeks, now = new Date()) {
  const starts = recentWeekStarts(weeks + AVERAGE_WEEKS - 1, now)
  const totals = new Map(starts.map((start) => [keyOf(start), { centavos: 0, salesCount: 0, units: 0 }]))
  for (const sale of counted(sales)) {
    const bucket = totals.get(keyOf(startOfWeek(new Date(sale.soldAt))))
    if (!bucket) continue
    bucket.centavos += toCentavos(sale.total)
    bucket.salesCount += 1
    bucket.units += unitsOf(sale)
  }
  const rows = starts.map((start) => ({ start, key: keyOf(start), ...totals.get(keyOf(start)) }))
  return rows.slice(AVERAGE_WEEKS - 1).map((row, i) => {
    const span = rows.slice(i, i + AVERAGE_WEEKS)
    const centavos = span.reduce((sum, week) => sum + week.centavos, 0)
    return {
      start: row.start,
      key: row.key,
      revenue: fromCentavos(row.centavos),
      salesCount: row.salesCount,
      units: row.units,
      average: fromCentavos(Math.round(centavos / AVERAGE_WEEKS)),
    }
  })
}

// Calendar months, oldest first, ending with the current month.
export function monthlyTotals(sales, months = MONTHS_SHOWN, now = new Date()) {
  const monthKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
  const starts = Array.from({ length: months }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1))
  const totals = new Map(starts.map((start) => [monthKey(start), { centavos: 0, salesCount: 0, units: 0 }]))
  for (const sale of counted(sales)) {
    const bucket = totals.get(monthKey(new Date(sale.soldAt)))
    if (!bucket) continue
    bucket.centavos += toCentavos(sale.total)
    bucket.salesCount += 1
    bucket.units += unitsOf(sale)
  }
  return starts.map((start) => {
    const total = totals.get(monthKey(start))
    return { start, key: monthKey(start), revenue: fromCentavos(total.centavos), salesCount: total.salesCount, units: total.units }
  })
}

// Units of one product sold in each of the last `weeks` weeks (same weeks as weeklyTotals).
export function productUnitsByWeek(sales, productId, weeks, now = new Date()) {
  const starts = recentWeekStarts(weeks, now)
  const units = new Map(starts.map((start) => [keyOf(start), 0]))
  for (const sale of counted(sales)) {
    const key = keyOf(startOfWeek(new Date(sale.soldAt)))
    if (units.has(key)) units.set(key, units.get(key) + unitsOf(sale, productId))
  }
  return starts.map((start) => ({ start, key: keyOf(start), units: units.get(keyOf(start)) }))
}

// Products that sold in the period, best sellers first (by units, then name).
export function productsSold(sales, weeks, now = new Date()) {
  const from = recentWeekStarts(weeks, now)[0].getTime()
  const products = new Map()
  for (const sale of counted(sales)) {
    if (new Date(sale.soldAt).getTime() < from) continue
    for (const item of sale.items) {
      const product = products.get(item.productId) ?? { productId: item.productId, sku: item.sku, name: item.name, units: 0 }
      product.units += item.quantity
      products.set(item.productId, product)
    }
  }
  return [...products.values()].sort((a, b) => b.units - a.units || a.name.localeCompare(b.name))
}
