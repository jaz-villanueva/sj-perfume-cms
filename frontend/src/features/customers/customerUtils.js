// Rules for customer records (FR-9, NFR-6, NFR-14).

export const PREFERRED_CHANNELS = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'online', label: 'Online (Messenger)' },
]

// Philippine mobile numbers are stored in one format, 09XXXXXXXXX, so that
// "0917 123 4567", "+63 917 123 4567" and "639171234567" count as the same number.
export function normalizeMobile(input) {
  if (!input) return null
  let digits = String(input).replace(/[\s\-().]/g, '')
  if (digits.startsWith('+63')) digits = '0' + digits.slice(3)
  else if (digits.startsWith('63') && digits.length === 12) digits = '0' + digits.slice(2)
  else if (digits.startsWith('9') && digits.length === 10) digits = '0' + digits
  return /^09\d{9}$/.test(digits) ? digits : null
}

// Shows 09171234567 as 0917 123 4567.
export function formatMobile(mobile) {
  if (!mobile || mobile.length !== 11) return mobile ?? ''
  return `${mobile.slice(0, 4)} ${mobile.slice(4, 7)} ${mobile.slice(7)}`
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Returns an object of field errors. An empty object means the customer can be saved.
// `others` is the list of existing customers, used to reject a duplicate mobile number.
export function validateCustomer(draft, others = []) {
  const errors = {}
  if (!draft.name?.trim()) errors.name = 'Enter the customer’s name.'

  const mobile = normalizeMobile(draft.mobile)
  if (!draft.mobile?.trim()) {
    errors.mobile = 'Enter a mobile number.'
  } else if (!mobile) {
    errors.mobile = 'Use an 11-digit mobile number, for example 0917 123 4567.'
  } else if (others.some((c) => c.id !== draft.id && c.mobile === mobile)) {
    errors.mobile = 'Another customer already has this mobile number.'
  }

  if (draft.email?.trim() && !EMAIL.test(draft.email.trim())) {
    errors.email = 'Enter a valid e-mail address, or leave it blank.'
  }
  if (!draft.consent) {
    errors.consent = 'The customer must agree to the privacy notice before their details are saved.'
  }
  return errors
}

// Case-insensitive match on name, or on the digits of the mobile number.
export function matchesSearch(customer, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const digits = q.replace(/\D/g, '')
  return (
    customer.name.toLowerCase().includes(q) ||
    (digits.length >= 3 && customer.mobile.includes(digits.replace(/^63/, '0')))
  )
}
