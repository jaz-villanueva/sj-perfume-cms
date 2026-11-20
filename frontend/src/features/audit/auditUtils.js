// How audit entries (FR-17) are described on screen. Entries come from the audit_log table:
// { id, createdAt, actorId, actorRole, action, tableName, recordId, recordLabel, oldData, newData }.

export const AREAS = [
  { value: 'sales', label: 'Sales' },
  { value: 'customers', label: 'Customers' },
  { value: 'resellers', label: 'Resellers' },
  { value: 'products', label: 'Products' },
  { value: 'product_costs', label: 'Cost prices' },
  { value: 'stock_movements', label: 'Stock' },
  { value: 'profiles', label: 'User accounts' },
]

export const areaLabel = (table) => AREAS.find((a) => a.value === table)?.label ?? table

// Filter choices; each covers one or more stored action names.
export const ACTION_GROUPS = [
  { value: 'added', label: 'Added or recorded', actions: ['insert'] },
  { value: 'changed', label: 'Changed', actions: ['update'] },
  { value: 'removed', label: 'Voided, deleted or anonymised', actions: ['void', 'delete', 'delete_account', 'anonymize'] },
  { value: 'access', label: 'Account access', actions: ['deactivate', 'reactivate', 'password_reset'] },
  { value: 'export', label: 'Data exports', actions: ['export'] },
]

export function actionLabel(action, table) {
  switch (action) {
    case 'insert':
      return table === 'sales' || table === 'stock_movements' ? 'Recorded' : 'Added'
    case 'update': return 'Changed'
    case 'delete': return 'Deleted'
    case 'void': return 'Voided'
    case 'anonymize': return 'Anonymised'
    case 'export': return 'Exported data'
    case 'password_reset': return 'Reset password'
    case 'deactivate': return 'Deactivated'
    case 'reactivate': return 'Reactivated'
    case 'delete_account': return 'Deleted account'
    default: return action
  }
}

// What the record is, in words: "Sale S-2026-000012", "Product SJ-000101 Rose Velvet".
export function recordLabel(entry) {
  const label = entry.recordLabel || (entry.recordId ? `#${entry.recordId}` : '')
  switch (entry.tableName) {
    case 'sales': return `Sale ${label}`
    case 'products': return `Product ${label}`
    case 'product_costs': return `Cost price of ${label}`
    case 'stock_movements': return `Stock of ${label}`
    case 'resellers': return `Reseller ${label}`
    case 'profiles': return `Account of ${label}`
    default: return label // customers are already "Customer #12"
  }
}

const FIELD_NAMES = {
  sku: 'SKU', size_ml: 'Size (mL)', retail_price: 'Retail price', reseller_price: 'Reseller price',
  cost_price: 'Cost price', reorder_level: 'Reorder level', lead_time_days: 'Lead time (days)',
  is_active: 'Active', show_in_catalog: 'Shown in catalog', full_name: 'Name', email: 'E-mail',
  mobile: 'Mobile', preferred_channel: 'Usually orders', consent_at: 'Consent date', anonymized_at: 'Anonymised on',
  business_name: 'Business name', contact_person: 'Contact person', price_tier: 'Price tier',
  void_reason: 'Void reason', voided_at: 'Voided on', voided_by: 'Voided by', deleted_at: 'Deleted on',
  sales_count: 'Sales exported',
}

export function fieldLabel(key) {
  if (FIELD_NAMES[key]) return FIELD_NAMES[key]
  const words = key.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const dateTime = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })
export const formatWhen = (iso) => dateTime.format(new Date(iso))

const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

const WORDS = {
  channel: { walk_in: 'Walk-in', online: 'Online (Messenger)', reseller: 'Reseller' },
  preferred_channel: { walk_in: 'Walk-in', online: 'Online (Messenger)' },
  kind: { stock_in: 'Stock-in', return: 'Return', adjustment: 'Adjustment', sale: 'Sale', void: 'Void' },
  status: { completed: 'Completed', voided: 'Voided', active: 'Active', inactive: 'Inactive' },
  role: { owner: 'Owner', staff: 'Staff' },
}
const MONEY = new Set(['total', 'retail_price', 'reseller_price', 'cost_price', 'unit_price', 'line_total'])
const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

// `key` is the column the value came from, so codes and amounts can be shown in words.
export function formatValue(value, key) {
  if (value === null || value === undefined || value === '') return '—'
  if (key && WORDS[key]?.[value]) return WORDS[key][value]
  if (key && MONEY.has(key) && !Number.isNaN(Number(value))) return peso.format(Number(value))
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  if (typeof value === 'string' && ISO_TIME.test(value)) return formatWhen(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// Internal columns that say nothing to a reader.
const HIDDEN = new Set(['id', 'created_at', 'updated_at', 'created_by', 'product_id', 'sale_id', 'customer_id', 'reseller_id', 'items'])

// The before/after pairs of an edit, or the main values of a new record.
export function describeChanges(entry) {
  const oldData = entry.oldData ?? {}
  const newData = entry.newData ?? {}
  if (entry.action === 'insert' && entry.tableName === 'sales') {
    const items = newData.items ?? []
    return [
      { field: 'Channel', to: formatValue(newData.channel, 'channel') },
      { field: 'Items', to: items.map((i) => `${i.name ?? i.sku} × ${i.quantity}`).join(', ') || '—' },
      { field: 'Total', to: formatValue(newData.total, 'total') },
    ]
  }
  const keys = [...new Set([...Object.keys(oldData), ...Object.keys(newData)])].filter((k) => !HIDDEN.has(k))
  return keys.map((k) => ({
    field: fieldLabel(k),
    ...(k in oldData ? { from: formatValue(oldData[k], k) } : {}),
    ...(k in newData ? { to: formatValue(newData[k], k) } : {}),
  }))
}

// "2026-11-10" in the Philippines → the matching instant, for date filters.
export const startOfDayPht = (day) => (day ? new Date(`${day}T00:00:00+08:00`).toISOString() : null)
export const endOfDayPht = (day) =>
  day ? new Date(new Date(`${day}T00:00:00+08:00`).getTime() + 24 * 60 * 60 * 1000).toISOString() : null

// Same filters as the database query, for sample data and tests.
export function matchesFilters(entry, filters) {
  if (filters.area && entry.tableName !== filters.area) return false
  if (filters.actionGroup) {
    const group = ACTION_GROUPS.find((g) => g.value === filters.actionGroup)
    if (group && !group.actions.includes(entry.action)) return false
  }
  if (filters.actorId && entry.actorId !== filters.actorId) return false
  const when = new Date(entry.createdAt).getTime()
  const from = startOfDayPht(filters.from)
  const to = endOfDayPht(filters.to)
  if (from && when < new Date(from).getTime()) return false
  if (to && when >= new Date(to).getTime()) return false
  return true
}
