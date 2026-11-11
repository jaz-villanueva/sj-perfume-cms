// Data access for user accounts (FR-3). Uses Supabase when frontend/.env.local is filled in;
// otherwise sample data in memory, so the screen works without a database (and in tests).
//
// Reads come from the profiles table (the Owner can read every profile; Staff only their own).
// The Owner's changes to other accounts go through the admin-users Edge Function, which holds
// the service-role key. Anyone can change their own name and password.
import { supabase } from '../../lib/supabase.js'

const SAMPLE = [
  { id: 'sample-owner', fullName: 'Shop Owner (sample)', email: 'owner@example.com', role: 'owner', isActive: true, deletedAt: null, createdAt: '2026-10-01T01:00:00Z' },
  { id: 'sample-staff-1', fullName: 'Liza Tan', email: 'liza.tan@example.com', role: 'staff', isActive: true, deletedAt: null, createdAt: '2026-10-05T02:00:00Z' },
  { id: 'sample-staff-2', fullName: 'Mark Dela Cruz', email: 'mark.dc@example.com', role: 'staff', isActive: true, deletedAt: null, createdAt: '2026-10-12T03:30:00Z' },
  { id: 'sample-staff-3', fullName: 'Paolo Reyes', email: 'paolo.r@example.com', role: 'staff', isActive: false, deletedAt: null, createdAt: '2026-10-02T05:00:00Z' },
]

let sample = []
let nextId = 1
export function resetSampleUsers() {
  sample = SAMPLE.map((a) => ({ ...a }))
  nextId = 1
}
resetSampleUsers()

const copy = (a) => ({ ...a })

function sampleStaff(id) {
  const account = sample.find((a) => a.id === id)
  if (!account) throw new Error('Account not found.')
  if (account.role !== 'staff') throw new Error('Only Staff accounts can be managed here.')
  if (account.deletedAt) throw new Error('This account was deleted and can no longer be changed.')
  return account
}

const sampleApi = {
  isSample: true,
  async listAccounts() {
    return sample.map(copy)
  },
  async createAccount({ fullName, email }) {
    const normalized = email.trim().toLowerCase()
    if (sample.some((a) => a.email === normalized)) throw new Error('Another account already uses this e-mail address.')
    const account = {
      id: `sample-new-${nextId++}`, fullName: fullName.trim(), email: normalized, role: 'staff',
      isActive: true, deletedAt: null, createdAt: new Date().toISOString(),
    }
    sample.push(account)
    return copy(account)
  },
  async updateAccount(id, { fullName, email }) {
    const account = sampleStaff(id)
    const normalized = email.trim().toLowerCase()
    if (sample.some((a) => a.id !== id && a.email === normalized)) throw new Error('Another account already uses this e-mail address.')
    Object.assign(account, { fullName: fullName.trim(), email: normalized })
    return copy(account)
  },
  async resetPassword(id) {
    return copy(sampleStaff(id))
  },
  async deactivate(id) {
    return copy(Object.assign(sampleStaff(id), { isActive: false }))
  },
  async reactivate(id) {
    return copy(Object.assign(sampleStaff(id), { isActive: true }))
  },
  async deleteAccount(id) {
    return copy(Object.assign(sampleStaff(id), { isActive: false, deletedAt: new Date().toISOString() }))
  },
  // In sample mode "you" are the sample Owner.
  async updateMyName(fullName) {
    const me = sample.find((a) => a.role === 'owner')
    me.fullName = fullName.trim()
    return copy(me)
  },
  async changeMyPassword() {},
}

const fromRow = (r) => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email ?? '',
  role: r.role,
  isActive: r.is_active,
  deletedAt: r.deleted_at,
  createdAt: r.created_at,
})

const fail = (error) => {
  throw new Error(error.hint || error.message)
}

// Calls the admin-users Edge Function and turns its errors into readable messages.
async function adminUsers(body) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body })
  if (error) {
    const response = error.context
    let message = ''
    if (response && typeof response.json === 'function') {
      const payload = await response.json().catch(() => null)
      message = payload?.error ?? ''
      if (!message && response.status === 404) {
        message = 'Account management is not set up yet: the admin-users function has not been deployed.'
      }
    }
    throw new Error(message || 'Could not reach the account service. Check the connection and try again.')
  }
  return fromRow(data.account)
}

const supabaseApi = {
  isSample: false,
  async listAccounts() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active, deleted_at, created_at')
      .order('full_name')
    if (error) fail(error)
    return data.map(fromRow)
  },
  createAccount: ({ fullName, email, password }) => adminUsers({ action: 'create', fullName, email, password }),
  updateAccount: (id, { fullName, email }) => adminUsers({ action: 'update', userId: id, fullName, email }),
  resetPassword: (id, password) => adminUsers({ action: 'reset_password', userId: id, password }),
  deactivate: (id) => adminUsers({ action: 'deactivate', userId: id }),
  reactivate: (id) => adminUsers({ action: 'reactivate', userId: id }),
  deleteAccount: (id) => adminUsers({ action: 'delete', userId: id }),

  async updateMyName(fullName) {
    const { data, error } = await supabase.rpc('update_my_profile', { p_full_name: fullName })
    if (error) fail(error)
    // Also stored on the sign-in; this tells the app to reload the name shown in the sidebar.
    await supabase.auth.updateUser({ data: { full_name: data.full_name } })
    return { id: data.id, fullName: data.full_name }
  },

  // Checks the current password by signing in with it, then sets the new one.
  async changeMyPassword(currentPassword, newPassword) {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) throw new Error('Please sign in again.')
    const { error: checkError } = await supabase.auth.signInWithPassword({ email: userData.user.email, password: currentPassword })
    if (checkError) throw new Error('Your current password is not correct.')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message)
  },
}

export const usersApi = supabase ? supabaseApi : sampleApi
