import { useEffect, useMemo, useState } from 'react'
import { customersApi } from './customersApi.js'
import { PREFERRED_CHANNELS, formatMobile, matchesSearch, validateCustomer } from './customerUtils.js'
import styles from '../sales/module2.module.css'

const EMPTY = { name: '', mobile: '', email: '', address: '', preferredChannel: 'walk_in', consent: false }
const channelLabel = (value) => PREFERRED_CHANNELS.find((c) => c.value === value)?.label ?? value
const formatDate = (iso) =>
  iso ? new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' }).format(new Date(iso)) : ''

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null) // null = form closed
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    customersApi
      .listCustomers()
      .then((list) => active && setCustomers(list))
      .catch((e) => active && setLoadError(e.message))
    return () => {
      active = false
    }
  }, [])

  const shown = useMemo(() => customers.filter((c) => matchesSearch(c, query)), [customers, query])

  function handleSaved(saved) {
    setCustomers((list) => {
      const rest = list.filter((c) => c.id !== saved.id)
      return [...rest, saved].sort((a, b) => a.name.localeCompare(b.name))
    })
    setNotice(`Saved ${saved.name}.`)
    setEditing(null)
  }

  return (
    <section className={styles.page}>
      <h1>Customers</h1>
      {customersApi.isSample && (
        <p className={styles.sampleNote}>Showing sample data. The database is not connected yet.</p>
      )}
      {loadError && <p role="alert" className={styles.error}>{loadError}</p>}
      {notice && <p role="status" className={styles.success}>{notice}</p>}

      <div className={styles.toolbar}>
        <label className={styles.inline}>
          Search by name or mobile number
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <button type="button" onClick={() => { setNotice(''); setEditing({ ...EMPTY }) }}>
          Add customer
        </button>
      </div>

      {editing && (
        <CustomerForm
          initial={editing}
          others={customers}
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Mobile</th>
            <th>E-mail</th>
            <th>Prefers</th>
            <th>Consent given</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {shown.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{formatMobile(c.mobile)}</td>
              <td>{c.email}</td>
              <td>{channelLabel(c.preferredChannel)}</td>
              <td>{formatDate(c.consentAt)}</td>
              <td>
                <button type="button" className={styles.link} onClick={() => { setNotice(''); setEditing({ ...c, mobile: formatMobile(c.mobile), consent: true }) }}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
          {shown.length === 0 && (
            <tr>
              <td colSpan={6} className={styles.muted}>No customers found.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </section>
  )
}

function CustomerForm({ initial, others, onSaved, onCancel }) {
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(initial.id)
  const set = (field) => (e) =>
    setDraft((d) => ({ ...d, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validateCustomer(draft, others)
    setErrors(found)
    setSaveError('')
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      onSaved(await customersApi.saveCustomer(draft))
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.panel} onSubmit={handleSubmit} noValidate aria-label={isEdit ? 'Edit customer' : 'Add customer'}>
      <h2>{isEdit ? 'Edit customer' : 'Add customer'}</h2>
      <div className={styles.grid}>
        <Field label="Name" error={errors.name}>
          <input value={draft.name} onChange={set('name')} autoComplete="off" />
        </Field>
        <Field label="Mobile number" error={errors.mobile}>
          <input value={draft.mobile} onChange={set('mobile')} inputMode="tel" placeholder="0917 123 4567" />
        </Field>
        <Field label="E-mail (optional)" error={errors.email}>
          <input value={draft.email} onChange={set('email')} type="email" />
        </Field>
        <Field label="Address (optional)">
          <input value={draft.address} onChange={set('address')} />
        </Field>
        <Field label="Usually orders">
          <select value={draft.preferredChannel} onChange={set('preferredChannel')}>
            {PREFERRED_CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>
      </div>

      {!isEdit && (
        <>
          <p className={styles.privacy}>
            <strong>Privacy notice.</strong> SJ Perfume Trading keeps the customer’s name and contact details only to
            record and follow up their orders. They are not shared with anyone else. The customer can ask the owner to
            see, correct or remove their details at any time (Data Privacy Act of 2012, RA 10173).
          </p>
          <Field error={errors.consent}>
            <label className={styles.checkbox}>
              <input type="checkbox" checked={draft.consent} onChange={set('consent')} />
              The customer agreed to the privacy notice
            </label>
          </Field>
        </>
      )}

      {saveError && <p role="alert" className={styles.error}>{saveError}</p>}
      <div className={styles.actions}>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save customer'}</button>
        <button type="button" className={styles.secondary} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function Field({ label, error, children }) {
  return (
    <div className={styles.field}>
      {label ? (
        <label>
          {label}
          {children}
        </label>
      ) : (
        children
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
