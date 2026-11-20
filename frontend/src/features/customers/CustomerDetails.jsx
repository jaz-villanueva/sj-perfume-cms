// One customer's record and sales (FR-7), with the Owner's privacy actions (NFR-5):
// export everything kept about the customer, or anonymise them.
import { useEffect, useState } from 'react'
import { useAuth } from '../../app/auth.js'
import { salesApi } from '../sales/salesApi.js'
import { channelLabel, formatDateTime, formatPeso } from '../sales/saleUtils.js'
import { customersApi } from './customersApi.js'
import { formatMobile, summarizeSales } from './customerUtils.js'
import { downloadJson } from './download.js'
import styles from '../sales/module2.module.css'

const formatDate = (iso) =>
  iso ? new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' }).format(new Date(iso)) : ''

export default function CustomerDetails({ customer, onClose, onAnonymized }) {
  const { role } = useAuth()
  const isOwner = role === 'owner'
  const [sales, setSales] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  // The page renders this with key={customer.id}, so the state starts fresh for each customer.
  useEffect(() => {
    let active = true
    salesApi
      .listSalesForCustomer(customer.id)
      .then((list) => active && setSales(list))
      .catch((e) => active && setLoadError(e.message))
    return () => {
      active = false
    }
  }, [customer.id])

  async function handleExport() {
    setActionError('')
    setNotice('')
    setBusy(true)
    try {
      const data = await customersApi.exportCustomer(customer.id)
      const saved = downloadJson(`customer-${customer.id}-data.json`, data)
      setNotice(saved
        ? `Exported ${customer.name}’s data (${data.sales.length} sales). Check your Downloads folder.`
        : `Exported ${customer.name}’s data (${data.sales.length} sales).`)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleAnonymize() {
    setActionError('')
    setBusy(true)
    try {
      const result = await customersApi.anonymizeCustomer(customer.id)
      onAnonymized(customer, result)
    } catch (e) {
      setActionError(e.message)
      setBusy(false)
    }
  }

  const summary = sales ? summarizeSales(sales) : null

  return (
    <section className={styles.panel} aria-label={`Customer ${customer.name}`}>
      <div className={styles.toolbar}>
        <h2>{customer.name}</h2>
        <button type="button" className={styles.secondary} onClick={onClose}>Close</button>
      </div>
      <p className={styles.muted}>
        {formatMobile(customer.mobile)}
        {customer.email && ` · ${customer.email}`}
        {customer.address && ` · ${customer.address}`}
        {customer.consentAt && ` · Consent given ${formatDate(customer.consentAt)}`}
      </p>

      <h3>Sales</h3>
      {loadError && <p role="alert" className={styles.error}>{loadError}</p>}
      {!sales && !loadError && <p className={styles.muted}>Loading sales…</p>}
      {summary && (
        <p>
          {summary.count} completed {summary.count === 1 ? 'sale' : 'sales'}, {formatPeso(summary.spent)} in total
          {summary.last && `, last on ${formatDate(summary.last)}`}
          {summary.voided > 0 && ` (${summary.voided} voided, not counted)`}.
        </p>
      )}
      {sales && sales.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Sale no.</th>
                <th>Date</th>
                <th>Channel</th>
                <th>Items</th>
                <th className={styles.num}>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className={s.status === 'voided' ? styles.voided : undefined}>
                  <td className={styles.nowrap}>{s.saleNo}</td>
                  <td>{formatDateTime(s.soldAt)}</td>
                  <td>{channelLabel(s.channel)}</td>
                  <td>{s.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}</td>
                  <td className={styles.num}>{formatPeso(s.total)}</td>
                  <td>{s.status === 'voided' ? 'Voided' : 'Completed'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sales && sales.length === 0 && <p className={styles.muted}>No sales linked to this customer yet.</p>}

      {isOwner && (
        <div className={styles.privacyActions}>
          <h3>Customer’s data (Owner only)</h3>
          <p className={styles.muted}>
            Use these when the customer asks to see or remove their details (Data Privacy Act of 2012).
          </p>
          {notice && <p role="status" className={styles.success}>{notice}</p>}
          {actionError && <p role="alert" className={styles.error}>{actionError}</p>}
          {!confirming ? (
            <div className={styles.actions}>
              <button type="button" className={styles.secondary} onClick={handleExport} disabled={busy}>
                Export data
              </button>
              <button type="button" className={styles.danger} onClick={() => { setNotice(''); setConfirming(true) }} disabled={busy}>
                Anonymise…
              </button>
            </div>
          ) : (
            <div className={styles.confirmBox} role="group" aria-label="Confirm anonymising">
              <p>
                This permanently erases {customer.name}’s name, mobile number, e-mail and address. Their
                {sales ? ` ${sales.length}` : ''} past sales stay, listed under “Anonymised customer #{customer.id}”, so
                sales totals don’t change. This cannot be undone.
              </p>
              <div className={styles.actions}>
                <button type="button" className={styles.danger} onClick={handleAnonymize} disabled={busy}>
                  {busy ? 'Anonymising…' : 'Yes, anonymise'}
                </button>
                <button type="button" className={styles.secondary} onClick={() => setConfirming(false)} disabled={busy}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
