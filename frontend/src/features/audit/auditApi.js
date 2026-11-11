// Data access for the audit log (FR-17). Uses Supabase when frontend/.env.local is filled in;
// otherwise sample entries in memory. Only the Owner can read the log (the database returns
// nothing to anyone else).
import { supabase } from '../../lib/supabase.js'
import { ACTION_GROUPS, endOfDayPht, matchesFilters, startOfDayPht } from './auditUtils.js'

export const PAGE_SIZE = 100

const OWNER = 'sample-owner'
const STAFF = 'sample-staff-1'

const SAMPLE_ACTORS = [
  { id: OWNER, fullName: 'Shop Owner (sample)' },
  { id: STAFF, fullName: 'Liza Tan' },
]

const SAMPLE = [
  { id: 1, createdAt: '2026-10-14T03:20:00Z', actorId: STAFF, actorRole: 'staff', action: 'insert', tableName: 'sales', recordId: '1', recordLabel: 'S-2026-000001', oldData: null,
    newData: { sale_no: 'S-2026-000001', channel: 'walk_in', status: 'completed', total: 850, items: [{ sku: 'SJ-000101', name: 'Rose Velvet Eau de Parfum', quantity: 1, unit_price: 850 }] } },
  { id: 2, createdAt: '2026-10-15T01:00:00Z', actorId: OWNER, actorRole: 'owner', action: 'update', tableName: 'products', recordId: '2', recordLabel: 'SJ-000102 Ocean Breeze Eau de Toilette',
    oldData: { retail_price: 1150 }, newData: { retail_price: 1200 } },
  { id: 3, createdAt: '2026-10-15T02:10:00Z', actorId: STAFF, actorRole: 'staff', action: 'insert', tableName: 'stock_movements', recordId: '31', recordLabel: 'SJ-000104 Citrus Bloom Body Mist', oldData: null,
    newData: { kind: 'stock_in', quantity: 24, reference: 'DR-1043', reason: null } },
  { id: 4, createdAt: '2026-10-16T09:41:00Z', actorId: STAFF, actorRole: 'staff', action: 'insert', tableName: 'customers', recordId: '5', recordLabel: 'Customer #5', oldData: null,
    newData: { name: '[personal data]', mobile: '[personal data]', email: '[personal data]', preferred_channel: 'online' } },
  { id: 5, createdAt: '2026-10-17T05:00:00Z', actorId: OWNER, actorRole: 'owner', action: 'void', tableName: 'sales', recordId: '3', recordLabel: 'S-2026-000003',
    oldData: { status: 'completed', void_reason: null }, newData: { status: 'voided', void_reason: 'Customer cancelled the order' } },
  { id: 6, createdAt: '2026-10-20T06:30:00Z', actorId: OWNER, actorRole: 'owner', action: 'deactivate', tableName: 'profiles', recordId: 'sample-staff-3', recordLabel: 'Paolo Reyes',
    oldData: { is_active: true }, newData: { is_active: false } },
  { id: 7, createdAt: '2026-10-22T02:15:00Z', actorId: OWNER, actorRole: 'owner', action: 'export', tableName: 'customers', recordId: '2', recordLabel: 'Customer #2', oldData: null,
    newData: { sales_count: 1 } },
]

const sampleApi = {
  isSample: true,
  async listActors() {
    return SAMPLE_ACTORS.map((a) => ({ ...a }))
  },
  // Newest first; `beforeId` continues after the last entry of the previous page.
  async listEntries(filters = {}, beforeId = null) {
    return SAMPLE
      .filter((e) => matchesFilters(e, filters) && (beforeId === null || e.id < beforeId))
      .sort((a, b) => b.id - a.id)
      .slice(0, PAGE_SIZE)
      .map((e) => structuredClone(e))
  },
}

const fromRow = (r) => ({
  id: r.id,
  createdAt: r.created_at,
  actorId: r.actor_id,
  actorRole: r.actor_role,
  action: r.action,
  tableName: r.table_name,
  recordId: r.record_id,
  recordLabel: r.record_label,
  oldData: r.old_data,
  newData: r.new_data,
})

const supabaseApi = {
  isSample: false,
  async listActors() {
    const { data, error } = await supabase.from('profiles').select('id, full_name').order('full_name')
    if (error) throw new Error(error.hint || error.message)
    return data.map((p) => ({ id: p.id, fullName: p.full_name }))
  },
  async listEntries(filters = {}, beforeId = null) {
    let query = supabase.from('audit_log').select('*').order('id', { ascending: false }).limit(PAGE_SIZE)
    if (filters.area) query = query.eq('table_name', filters.area)
    const group = ACTION_GROUPS.find((g) => g.value === filters.actionGroup)
    if (group) query = query.in('action', group.actions)
    if (filters.actorId) query = query.eq('actor_id', filters.actorId)
    if (filters.from) query = query.gte('created_at', startOfDayPht(filters.from))
    if (filters.to) query = query.lt('created_at', endOfDayPht(filters.to))
    if (beforeId !== null) query = query.lt('id', beforeId)
    const { data, error } = await query
    if (error) throw new Error(error.hint || error.message)
    return data.map(fromRow)
  },
}

export const auditApi = supabase ? supabaseApi : sampleApi
