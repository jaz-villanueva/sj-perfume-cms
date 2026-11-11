// Rules for user accounts (FR-3). The admin-users function and the database check the same
// rules again; these give feedback before saving.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const MIN_PASSWORD = 8
export const MAX_PASSWORD = 72 // Supabase Auth ignores anything longer

export function passwordError(password) {
  if (!password || password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`
  if (password.length > MAX_PASSWORD) return `Use at most ${MAX_PASSWORD} characters.`
  return ''
}

// draft = { fullName, email, password }. `withPassword` is true when adding an account.
// `others` are the existing accounts, used to catch a duplicate e-mail early.
export function validateAccount(draft, { withPassword = false, others = [] } = {}) {
  const errors = {}
  const name = draft.fullName?.trim() ?? ''
  if (!name) errors.fullName = 'Enter the person’s name.'
  else if (name.length > 100) errors.fullName = 'Use at most 100 characters.'

  const email = draft.email?.trim().toLowerCase() ?? ''
  if (!EMAIL.test(email)) errors.email = 'Enter a valid e-mail address.'
  else if (others.some((a) => a.id !== draft.id && a.email?.toLowerCase() === email)) {
    errors.email = 'Another account already uses this e-mail address.'
  }

  if (withPassword) {
    const message = passwordError(draft.password)
    if (message) errors.password = message
  }
  return errors
}

export function accountStatus(account) {
  if (account.deletedAt) return 'Deleted'
  return account.isActive ? 'Active' : 'Deactivated'
}

// Owner first, then Staff by name; deleted accounts last.
export function sortAccounts(accounts) {
  const rank = (a) => (a.deletedAt ? 2 : a.role === 'owner' ? 0 : 1)
  return [...accounts].sort((a, b) => rank(a) - rank(b) || a.fullName.localeCompare(b.fullName))
}

// A temporary password the Owner can read out to the new staff member. No look-alike
// characters (0/O, 1/l/I).
export function suggestPassword(length = 12) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)
  return Array.from(values, (v) => chars[v % chars.length]).join('')
}
