// Data access for sales. Uses Supabase when frontend/.env.local is filled in; otherwise
// it uses sample data in memory, so the screens work before the database tables exist
// (and in tests). The sample backend follows the same rules as record_sale and void_sale.
import { supabase } from '../../lib/supabase.js'
import { lineTotal, saleTotal, toRecordSalePayload, unitPriceFor } from './saleUtils.js'

// Products and resellers belong to Module 1. These samples stand in until those tables exist.
const SAMPLE_PRODUCTS = [
  { id: 1, sku: 'SJ-000101', name: 'Rose Velvet Eau de Parfum', brand: 'SJ Signature', sizeMl: 50, retailPrice: 850, resellerPrice: 680, onHand: 24 },
  { id: 2, sku: 'SJ-000102', name: 'Ocean Breeze Eau de Toilette', brand: 'SJ Signature', sizeMl: 100, retailPrice: 1200, resellerPrice: 960, onHand: 15 },
  { id: 3, sku: 'SJ-000103', name: 'Vanilla Musk Eau de Parfum', brand: 'SJ Signature', sizeMl: 30, retailPrice: 550, resellerPrice: 440, onHand: 3 },
  { id: 4, sku: 'SJ-000104', name: 'Citrus Bloom Body Mist', brand: 'SJ Daily', sizeMl: 250, retailPrice: 350, resellerPrice: 280, onHand: 40 },
  { id: 5, sku: 'SJ-000105', name: 'Oud Noir Extrait', brand: 'SJ Signature', sizeMl: 50, retailPrice: 1850, resellerPrice: 1480, onHand: 0 },
]
const SAMPLE_RESELLERS = [
  { id: 1, businessName: 'Scents by Mia', status: 'active' },
  { id: 2, businessName: 'Aroma Corner QC', status: 'active' },
  { id: 3, businessName: 'Fragrance Hub (old)', status: 'inactive' },
]
const SAMPLE_SALES = [
  { id: 1, saleNo: 'S-2026-000001', soldAt: '2026-10-14T03:20:00Z', channel: 'walk_in', customerId: 1, customerName: 'Ana Reyes', resellerId: null, resellerName: null, status: 'completed',
    items: [{ productId: 1, sku: 'SJ-000101', name: 'Rose Velvet Eau de Parfum', quantity: 1, unitPrice: 850, lineTotal: 850 }] },
  { id: 2, saleNo: 'S-2026-000002', soldAt: '2026-10-15T07:05:00Z', channel: 'reseller', customerId: null, customerName: null, resellerId: 1, resellerName: 'Scents by Mia', status: 'completed',
    items: [{ productId: 2, sku: 'SJ-000102', name: 'Ocean Breeze Eau de Toilette', quantity: 5, unitPrice: 960, lineTotal: 4800 },
            { productId: 4, sku: 'SJ-000104', name: 'Citrus Bloom Body Mist', quantity: 10, unitPrice: 280, lineTotal: 2800 }] },
  { id: 3, saleNo: 'S-2026-000003', soldAt: '2026-10-16T09:40:00Z', channel: 'online', customerId: 2, customerName: 'Carlo Mendoza', resellerId: null, resellerName: null, status: 'completed',
    items: [{ productId: 4, sku: 'SJ-000104', name: 'Citrus Bloom Body Mist', quantity: 2, unitPrice: 350, lineTotal: 700 }] },
]

let products, resellers, sales, nextSaleId
export function resetSampleSales() {
  products = SAMPLE_PRODUCTS.map((p) => ({ ...p }))
  resellers = SAMPLE_RESELLERS.map((r) => ({ ...r }))
  sales = SAMPLE_SALES.map((s) => ({ ...s, total: saleTotal(s.items), items: s.items.map((i) => ({ ...i })) }))
  nextSaleId = sales.length + 1
}
resetSampleSales()

const copy = (x) => structuredClone(x)
const newest = (a, b) => b.soldAt.localeCompare(a.soldAt)

const sampleApi = {
  isSample: true,
  async listProducts() {
    return copy(products)
  },
  async listResellers() {
    return copy(resellers)
  },
  async listSales() {
    return copy(sales).sort(newest)
  },
  // Same rules as the record_sale function: everything is checked first, so a refused
  // sale saves nothing.
  async recordSale(draft, customers = []) {
    const payload = toRecordSalePayload(draft)
    const reseller = resellers.find((r) => r.id === payload.reseller_id)
    if (payload.channel === 'reseller' && reseller?.status !== 'active') throw new Error('Choose an active reseller.')
    if (payload.lines.length === 0) throw new Error('Add at least one product.')
    const items = payload.lines.map((line) => {
      const product = products.find((p) => p.id === line.product_id)
      if (!product) throw new Error('Product not found.')
      if (line.quantity > product.onHand) throw new Error(`Insufficient stock: only ${product.onHand} ${product.name} available.`)
      const unitPrice = unitPriceFor(product, payload.channel)
      return { productId: product.id, sku: product.sku, name: product.name, quantity: line.quantity, unitPrice, lineTotal: lineTotal(line.quantity, unitPrice) }
    })
    for (const item of items) products.find((p) => p.id === item.productId).onHand -= item.quantity
    const id = nextSaleId++
    const sale = {
      id,
      saleNo: `S-${new Date().getFullYear()}-${String(id).padStart(6, '0')}`,
      soldAt: new Date().toISOString(),
      channel: payload.channel,
      customerId: payload.customer_id,
      customerName: customers.find((c) => c.id === payload.customer_id)?.name ?? null,
      resellerId: payload.reseller_id,
      resellerName: reseller?.businessName ?? null,
      status: 'completed',
      items,
      total: saleTotal(items),
    }
    sales.push(sale)
    return copy(sale)
  },
  // A voided sale is kept; its stock goes back (compensating movements in the database).
  async voidSale(saleId, reason) {
    const sale = sales.find((s) => s.id === saleId)
    if (!sale) throw new Error('Sale not found.')
    if (sale.status === 'voided') throw new Error('This sale is already voided.')
    if (!reason?.trim()) throw new Error('Enter a reason for voiding the sale.')
    for (const item of sale.items) {
      const product = products.find((p) => p.id === item.productId)
      if (product) product.onHand += item.quantity
    }
    Object.assign(sale, { status: 'voided', voidReason: reason.trim(), voidedAt: new Date().toISOString() })
    return copy(sale)
  },
}

const fail = (error) => {
  throw new Error(error.hint || error.message)
}

const supabaseApi = {
  isSample: false,
  async listProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('id, sku, name, brand, size_ml, retail_price, reseller_price, product_stock(on_hand)')
      .eq('is_active', true)
      .order('name')
    if (error) fail(error)
    return data.map((p) => ({
      id: p.id, sku: p.sku, name: p.name, brand: p.brand, sizeMl: p.size_ml,
      retailPrice: Number(p.retail_price), resellerPrice: Number(p.reseller_price), onHand: p.product_stock?.on_hand ?? 0,
    }))
  },
  async listResellers() {
    const { data, error } = await supabase.from('resellers').select('id, business_name, status').order('business_name')
    if (error) fail(error)
    return data.map((r) => ({ id: r.id, businessName: r.business_name, status: r.status }))
  },
  async listSales() {
    const { data, error } = await supabase
      .from('sales')
      .select('id, sale_no, sold_at, channel, customer_id, reseller_id, total, status, void_reason, customers(name), resellers(business_name), sale_items(product_id, quantity, unit_price, line_total, products(sku, name))')
      .order('sold_at', { ascending: false })
      .limit(200)
    if (error) fail(error)
    return data.map((s) => ({
      id: s.id, saleNo: s.sale_no, soldAt: s.sold_at, channel: s.channel, status: s.status, voidReason: s.void_reason,
      customerId: s.customer_id, customerName: s.customers?.name ?? null,
      resellerId: s.reseller_id, resellerName: s.resellers?.business_name ?? null,
      total: Number(s.total),
      items: s.sale_items.map((i) => ({
        productId: i.product_id, sku: i.products?.sku, name: i.products?.name, quantity: i.quantity,
        unitPrice: Number(i.unit_price), lineTotal: Number(i.line_total),
      })),
    }))
  },
  async recordSale(draft) {
    const { data, error } = await supabase.rpc('record_sale', { payload: toRecordSalePayload(draft) })
    if (error) fail(error)
    return { id: data.sale_id, saleNo: data.sale_no, total: Number(data.total) }
  },
  async voidSale(saleId, reason) {
    const { error } = await supabase.rpc('void_sale', { sale_id: saleId, reason })
    if (error) fail(error)
  },
}

export const salesApi = supabase ? supabaseApi : sampleApi
