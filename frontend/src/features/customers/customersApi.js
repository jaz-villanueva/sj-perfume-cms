// Data access for customers. Uses Supabase when frontend/.env.local is filled in;
// otherwise it falls back to sample data in memory, so the screens work before the
// database tables exist (and in tests).
import { supabase } from '../../lib/supabase.js'
import { normalizeMobile } from './customerUtils.js'

const SAMPLE = [
  { id: 1, name: 'Ana Reyes', mobile: '09171234567', email: 'ana.reyes@example.com', address: 'Malate, Manila', preferredChannel: 'walk_in', consentAt: '2026-10-01T02:00:00Z' },
  { id: 2, name: 'Carlo Mendoza', mobile: '09181112222', email: '', address: 'Pasay City', preferredChannel: 'online', consentAt: '2026-10-03T05:30:00Z' },
  { id: 3, name: 'Bea Santos', mobile: '09223334444', email: 'bea.s@example.com', address: '', preferredChannel: 'online', consentAt: '2026-10-05T08:15:00Z' },
  { id: 4, name: 'Diego Ramos', mobile: '09335556666', email: '', address: 'Quezon City', preferredChannel: 'walk_in', consentAt: '2026-10-08T03:45:00Z' },
  { id: 5, name: 'Ella Cruz', mobile: '09457778888', email: 'ella.cruz@example.com', address: 'Makati City', preferredChannel: 'online', consentAt: '2026-10-10T06:00:00Z' },
]

let sample = []
let nextId = 1
export function resetSampleCustomers() {
  sample = SAMPLE.map((c) => ({ ...c }))
  nextId = sample.length + 1
}
resetSampleCustomers()

const fromRow = (r) => ({
  id: r.id,
  name: r.name,
  mobile: r.mobile,
  email: r.email ?? '',
  address: r.address ?? '',
  preferredChannel: r.preferred_channel,
  consentAt: r.consent_at,
})

const toRow = (c) => ({
  name: c.name.trim(),
  mobile: normalizeMobile(c.mobile),
  email: c.email?.trim() || null,
  address: c.address?.trim() || null,
  preferred_channel: c.preferredChannel,
})

const sampleApi = {
  isSample: true,
  async listCustomers() {
    return sample.map((c) => ({ ...c })).sort((a, b) => a.name.localeCompare(b.name))
  },
  async saveCustomer(draft) {
    const row = { ...toRow(draft), email: draft.email?.trim() ?? '', address: draft.address?.trim() ?? '' }
    if (sample.some((c) => c.id !== draft.id && c.mobile === row.mobile)) {
      throw new Error('Another customer already has this mobile number.')
    }
    if (draft.id) {
      const existing = sample.find((c) => c.id === draft.id)
      Object.assign(existing, { name: row.name, mobile: row.mobile, email: row.email, address: row.address, preferredChannel: row.preferred_channel })
      return { ...existing }
    }
    const created = { id: nextId++, name: row.name, mobile: row.mobile, email: row.email, address: row.address, preferredChannel: row.preferred_channel, consentAt: new Date().toISOString() }
    sample.push(created)
    return { ...created }
  },
}

const COLUMNS = 'id, name, mobile, email, address, preferred_channel, consent_at'

const supabaseApi = {
  isSample: false,
  async listCustomers() {
    const { data, error } = await supabase.from('customers').select(COLUMNS).is('anonymized_at', null).order('name').limit(1000)
    if (error) throw new Error(error.hint || error.message)
    return data.map(fromRow)
  },
  async saveCustomer(draft) {
    const row = toRow(draft)
    const query = draft.id
      ? supabase.from('customers').update(row).eq('id', draft.id)
      : supabase.from('customers').insert({ ...row, consent_at: new Date().toISOString() })
    const { data, error } = await query.select(COLUMNS).single()
    if (error) {
      // 23505 = unique violation on the normalised mobile number; 23514 = a check failed.
      if (error.code === '23505') throw new Error('Another customer already has this mobile number.')
      if (error.code === '23514') throw new Error('Check the name and mobile number (11 digits, starting with 09).')
      throw new Error(error.hint || error.message)
    }
    return fromRow(data)
  },
}

export const customersApi = supabase ? supabaseApi : sampleApi
