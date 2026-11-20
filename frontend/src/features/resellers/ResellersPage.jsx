
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../app/auth.js'
import { resellersApi } from './resellersApi.js'
import ResellerSalesHistory from './ResellerSalesHistory.jsx'
import './resellers.css'

const emptyForm = {
  businessName: '',
  contactPerson: '',
  mobile: '',
  email: '',
  address: '',
  priceTier: 'standard',
  status: 'active',
  consentAt: null,
}

function hasContactDetails(form) {
  return [
    form.contactPerson,
    form.mobile,
    form.email,
    form.address,
  ].some((value) => Boolean(value?.trim()))
}

export default function ResellersPage() {
  const { role } = useAuth()
  const canManage = role === 'owner'

  const [resellers, setResellers] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [consentConfirmed, setConsentConfirmed] = useState(false)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedReseller, setSelectedReseller] = useState(null)

  async function loadResellers() {
    const data = await resellersApi.listResellers()
    setResellers(data)
  }

  useEffect(() => {
    let active = true

    resellersApi.listResellers()
      .then((data) => {
        if (active) setResellers(data)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const filteredResellers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return resellers.filter((reseller) => {
      const matchesSearch = [
        reseller.businessName,
        reseller.contactPerson,
        reseller.mobile,
        reseller.email,
      ].some((value) =>
        String(value ?? '').toLowerCase().includes(query)
      )

      const matchesStatus =
        statusFilter === 'all' ||
        reseller.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [resellers, search, statusFilter])

  const activeCount = resellers.filter(
    (reseller) => reseller.status === 'active'
  ).length

  function openAddForm() {
    setEditingId(null)
    setForm({ ...emptyForm })
    setConsentConfirmed(false)
    setFormError('')
    setFormOpen(true)
  }

  function openEditForm(reseller) {
    setEditingId(reseller.id)
    setForm({
      businessName: reseller.businessName,
      contactPerson: reseller.contactPerson,
      mobile: reseller.mobile,
      email: reseller.email,
      address: reseller.address,
      priceTier: reseller.priceTier,
      status: reseller.status,
      consentAt: reseller.consentAt,
    })
    setConsentConfirmed(false)
    setFormError('')
    setFormOpen(true)
  }

  function closeForm() {
    if (saving) return
    setFormOpen(false)
    setEditingId(null)
    setFormError('')
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  async function handleSave(event) {
    event.preventDefault()
    if (!canManage || saving) return

    setFormError('')

    const businessName = form.businessName.trim()
    const contactDetailsPresent = hasContactDetails(form)

    if (!businessName) {
      setFormError('Business name is required.')
      return
    }

    if (form.email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError('Enter a valid email address.')
      return
    }

    if (form.mobile.trim() &&
        !/^[0-9+\s()-]{7,20}$/.test(form.mobile.trim())) {
      setFormError('Enter a valid mobile number.')
      return
    }

    if (contactDetailsPresent &&
        !form.consentAt &&
        !consentConfirmed) {
      setFormError(
        'Confirm that consent was obtained before saving contact details.'
      )
      return
    }

    const payload = {
      ...form,
      businessName,
      priceTier: 'standard',
      consentAt: contactDetailsPresent
        ? (form.consentAt ||
            (consentConfirmed ? new Date().toISOString() : null))
        : form.consentAt,
    }

    setSaving(true)

    try {
      if (editingId === null) {
        await resellersApi.createReseller(payload)
      } else {
        await resellersApi.updateReseller(editingId, payload)
      }

      await loadResellers()
      setFormOpen(false)
      setEditingId(null)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="resellers-page">
      <div className="resellers-header">
        <div>
          <p className="resellers-eyebrow">SJ PERFUME TRADING</p>
          <h1>Reseller Management</h1>
          <p className="resellers-description">
            Manage reseller information, account status,
            and business relationships.
          </p>
        </div>

        {canManage && !formOpen && (
          <button
            type="button"
            className="resellers-primary-button"
            onClick={openAddForm}
          >
            + Add Reseller
          </button>
        )}
      </div>

      <div className="resellers-stats">
        <div className="resellers-stat">
          <span>Total Resellers</span>
          <strong>{resellers.length}</strong>
        </div>
        <div className="resellers-stat">
          <span>Active Resellers</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="resellers-stat">
          <span>Inactive Resellers</span>
          <strong>{resellers.length - activeCount}</strong>
        </div>
      </div>

      {formOpen && canManage && (
        <form className="resellers-form-panel" onSubmit={handleSave}>
          <div className="resellers-form-heading">
            <h2>{editingId === null ? 'Add Reseller' : 'Edit Reseller'}</h2>
            <button type="button" onClick={closeForm} disabled={saving}>
              Cancel
            </button>
          </div>

          <div className="resellers-form-grid">
            <label>
              Business Name *
              <input
                name="businessName"
                value={form.businessName}
                onChange={handleChange}
                required
                maxLength={150}
              />
            </label>

            <label>
              Contact Person
              <input
                name="contactPerson"
                value={form.contactPerson}
                onChange={handleChange}
                maxLength={150}
              />
            </label>

            <label>
              Mobile Number
              <input
                name="mobile"
                type="tel"
                value={form.mobile}
                onChange={handleChange}
                maxLength={20}
              />
            </label>

            <label>
              Email Address
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                maxLength={254}
              />
            </label>

            <label>
              Price Tier
              <input value="Standard" disabled />
            </label>

            <label>
              Status
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <label className="resellers-form-full">
              Address
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={3}
                maxLength={500}
              />
            </label>
          </div>

          <div className="resellers-consent">
            <p>
              Contact details are collected for internal reseller
              management and sales coordination. Confirm that the
              reseller has been informed about this purpose and
              that the required consent has been obtained.
            </p>

            <label>
              <input
                type="checkbox"
                checked={consentConfirmed}
                onChange={(event) =>
                  setConsentConfirmed(event.target.checked)
                }
              />
              I confirm that the required consent has been obtained.
            </label>

            {form.consentAt && (
              <p className="resellers-consent-recorded">
                Previously recorded consent:
                {' '}
                {new Date(form.consentAt).toLocaleString()}
              </p>
            )}
          </div>

          {formError && (
            <p className="resellers-error" role="alert">
              {formError}
            </p>
          )}

          <div className="resellers-form-actions">
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="resellers-primary-button"
              disabled={saving}
            >
              {saving ? 'Saving...' :
                editingId === null ? 'Save Reseller' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {selectedReseller && (
        <ResellerSalesHistory
          key={selectedReseller.id}
          reseller={selectedReseller}
          onClose={() => setSelectedReseller(null)}
        />
      )}

      <div className="resellers-panel">
        <div className="resellers-toolbar">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search resellers..."
            aria-label="Search resellers"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {loading ? (
          <p className="resellers-message">
            Loading reseller records...
          </p>
        ) : error ? (
          <p className="resellers-message resellers-error" role="alert">
            {error}
          </p>
        ) : filteredResellers.length === 0 ? (
          <p className="resellers-message">
            {resellers.length === 0
              ? 'No reseller records found.'
              : 'No resellers match your search or filters.'}
          </p>
        ) : (
          <div className="resellers-table-wrap">
            <table className="resellers-table">
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>Contact Person</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Price Tier</th>
                  <th>Status</th>
                  <th>Consent</th>
                  <th>Sales History</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {filteredResellers.map((reseller) => (
                  <tr key={reseller.id}>
                    <td><strong>{reseller.businessName}</strong></td>
                    <td>{reseller.contactPerson || '—'}</td>
                    <td>{reseller.mobile || '—'}</td>
                    <td>{reseller.email || '—'}</td>
                    <td>{reseller.priceTier}</td>
                    <td>
                      <span
                        className={`resellers-status ${
                          reseller.status === 'active'
                            ? 'is-active'
                            : 'is-inactive'
                        }`}
                      >
                        {reseller.status === 'active'
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {reseller.consentAt ? 'Recorded' : 'Not recorded'}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="resellers-history-button"
                        onClick={() => setSelectedReseller(reseller)}
                      >
                        View Sales
                      </button>
                    </td>
                    
                    {canManage && (
                      <td>
                        <button
                          type="button"
                          className="resellers-edit-button"
                          onClick={() => openEditForm(reseller)}
                          disabled={saving}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <p className="resellers-count">
            Showing {filteredResellers.length} of {resellers.length} resellers
          </p>
        )}
      </div>
    </section>
  )
}
