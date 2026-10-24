// Data for the dashboard (FR-11). Every screen of the dashboard reads one object:
//
//   { summary, byChannel, daily, topProducts, topBuyers, recentSales, stockWatch }
//
// Sample mode builds it from the Sales module's sample data, so the dashboard and the Sales
// screen always show the same sales. Database mode reads the dashboard_summary function and the
// low_stock view described in docs/api-contracts.md, so totals are computed in Postgres
// instead of over a limited list of rows.
import { supabase } from '../../lib/supabase.js'
import { channelLabel } from '../sales/saleUtils.js'
import { salesApi } from '../sales/salesApi.js'
import {
  byChannel,
  dailyRevenue,
  recentSales,
  salesInPeriod,
  stockWatch,
  summarize,
  topBuyers,
  topProducts,
} from './dashboardUtils.js'

// "All time" charts the last 90 days, so the daily columns stay readable.
export const chartDays = (days) => days || 90

const sampleApi = {
  isSample: true,
  async getDashboard({ days, now = new Date() }) {
    const [sales, products] = await Promise.all([salesApi.listSales(), salesApi.listProducts()])
    const inPeriod = salesInPeriod(sales, days, now)
    return {
      summary: summarize(inPeriod),
      byChannel: byChannel(inPeriod),
      daily: dailyRevenue(sales, chartDays(days), now),
      topProducts: topProducts(inPeriod),
      topBuyers: topBuyers(inPeriod),
      recentSales: recentSales(sales),
      stockWatch: stockWatch(products),
    }
  },
}

const fail = (error) => {
  throw new Error(error.hint || error.message)
}

// Maps the dashboard_summary result (snake_case JSON) to the shape the screens use.
export function fromSummaryRow(row, days, now = new Date()) {
  const daily = new Map((row.daily ?? []).map((d) => [d.day, d]))
  return {
    summary: {
      revenue: Number(row.summary.revenue),
      salesCount: row.summary.sales_count,
      units: row.summary.units,
      averageSale: Number(row.summary.average_sale),
    },
    byChannel: row.by_channel.map((c) => ({
      channel: c.channel,
      label: channelLabel(c.channel),
      revenue: Number(c.revenue),
      salesCount: c.sales_count,
    })),
    // Fill the days with no sales so the chart keeps one column per day.
    daily: dailyRevenue([], chartDays(days), now).map((d) => {
      const found = daily.get(d.key)
      return found ? { ...d, revenue: Number(found.revenue), salesCount: found.sales_count } : d
    }),
    topProducts: row.top_products.map((p) => ({
      productId: p.product_id,
      sku: p.sku,
      name: p.name,
      units: p.units,
      revenue: Number(p.revenue),
    })),
    topBuyers: row.top_buyers.map((b) => ({
      key: `${b.kind}:${b.id}`,
      kind: b.kind,
      id: b.id,
      name: b.name,
      salesCount: b.sales_count,
      revenue: Number(b.revenue),
    })),
  }
}

const supabaseApi = {
  isSample: false,
  async getDashboard({ days, now = new Date() }) {
    const [summary, lowStock, sales] = await Promise.all([
      supabase.rpc('dashboard_summary', { p_days: days, p_chart_days: chartDays(days) }),
      supabase.from('low_stock').select('id, sku, name, on_hand, reorder_level').order('on_hand'),
      salesApi.listSales(),
    ])
    if (summary.error) fail(summary.error)
    if (lowStock.error) fail(lowStock.error)
    return {
      ...fromSummaryRow(summary.data, days, now),
      recentSales: recentSales(sales),
      stockWatch: lowStock.data.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        onHand: p.on_hand,
        reorderLevel: p.reorder_level,
        status: p.on_hand === 0 ? 'out' : 'low',
      })),
    }
  },
}

export const dashboardApi = supabase ? supabaseApi : sampleApi
