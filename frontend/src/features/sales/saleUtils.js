// Rules for recording a sale (FR-11). The database function record_sale checks the same
// rules again; these give the user feedback before saving.

export const CHANNELS = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'online', label: 'Online (Messenger)' },
  { value: 'reseller', label: 'Reseller' },
]

export const channelLabel = (value) => CHANNELS.find((c) => c.value === value)?.label ?? value

// Money is handled in centavos (whole numbers) so that totals never pick up
// floating-point errors such as 0.1 + 0.2 = 0.30000000000000004.
export const toCentavos = (pesos) => Math.round(Number(pesos) * 100)
export const fromCentavos = (centavos) => centavos / 100

// Resellers pay the reseller price; walk-in and online customers pay the retail price.
export const unitPriceFor = (product, channel) =>
  channel === 'reseller' ? product.resellerPrice : product.retailPrice

export const lineTotal = (quantity, unitPrice) => fromCentavos(quantity * toCentavos(unitPrice))

export const saleTotal = (lines) =>
  fromCentavos(lines.reduce((sum, l) => sum + l.quantity * toCentavos(l.unitPrice), 0))

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
export const formatPeso = (amount) => peso.format(amount)

const dateTime = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })
export const formatDateTime = (iso) => dateTime.format(new Date(iso))

// draft = { channel, customerId, resellerId, lines: [{ productId, quantity }] }
// products and resellers are the lists shown on the form.
// Returns { form: [messages], lines: { [productId]: message } }; both empty when the sale can be saved.
export function validateSale(draft, products, resellers) {
  const form = []
  const lines = {}
  if (!CHANNELS.some((c) => c.value === draft.channel)) form.push('Choose where the sale came from.')
  if (draft.channel === 'reseller') {
    const reseller = resellers.find((r) => r.id === draft.resellerId)
    if (!reseller) form.push('Choose the reseller.')
    else if (reseller.status !== 'active') form.push(`${reseller.businessName} is not active.`)
  }
  if (draft.lines.length === 0) form.push('Add at least one product.')
  for (const line of draft.lines) {
    const product = products.find((p) => p.id === line.productId)
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      lines[line.productId] = 'Quantity must be a whole number, 1 or more.'
    } else if (product && line.quantity > product.onHand) {
      lines[line.productId] = `Only ${product.onHand} in stock.`
    }
  }
  return { form, lines }
}

export const isValid = (result) => result.form.length === 0 && Object.keys(result.lines).length === 0

// The shape sent to the record_sale database function. Prices are not sent:
// the function looks them up, so the price cannot be changed from the browser.
export function toRecordSalePayload(draft) {
  return {
    channel: draft.channel,
    customer_id: draft.channel === 'reseller' ? null : draft.customerId ?? null,
    reseller_id: draft.channel === 'reseller' ? draft.resellerId : null,
    lines: draft.lines.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
  }
}
