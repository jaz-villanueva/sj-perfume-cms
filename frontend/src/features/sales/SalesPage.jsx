import { useCallback, useEffect, useMemo, useState } from 'react'
import { salesApi } from './salesApi.js'
import { customersApi } from '../customers/customersApi.js'
import {
  CHANNELS, channelLabel, formatDateTime, formatPeso, isValid, lineTotal, saleTotal, unitPriceFor, validateSale,
} from './saleUtils.js'
import styles from './module2.module.css'

async function loadAll() {
  const [sales, products, resellers, customers] = await Promise.all([
    salesApi.listSales(), salesApi.listProducts(), salesApi.listResellers(), customersApi.listCustomers(),
  ])
  return { sales, products, resellers, customers }
}

export default function SalesPage() {
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [resellers, setResellers] = useState([])
  const [customers, setCustomers] = useState([])
  const [loadError, setLoadError] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const apply = useCallback(({ sales: s, products: p, resellers: r, customers: c }) => {
    setSales(s)
    setProducts(p)
    setResellers(r)
    setCustomers(c)
  }, [])

  const reload = useCallback(
    () => loadAll().then(apply).catch((e) => setLoadError(e.message)),
    [apply],
  )

  useEffect(() => {
    let active = true
    loadAll()
      .then((data) => active && apply(data))
      .catch((e) => active && setLoadError(e.message))
    return () => {
      active = false
    }
  }, [apply])

  const shown = channelFilter ? sales.filter((s) => s.channel === channelFilter) : sales

  async function handleSaved(sale) {
    setFormOpen(false)
    setNotice(`Sale ${sale.saleNo} saved. Total ${formatPeso(sale.total)}.`)
    await reload()
  }

  return (
    <section className={styles.page}>
      <h1>Sales</h1>
      {salesApi.isSample && (
        <p className={styles.sampleNote}>Showing sample data. The database is not connected yet.</p>
      )}
      {loadError && <p role="alert" className={styles.error}>{loadError}</p>}
      {notice && <p role="status" className={styles.success}>{notice}</p>}

      <div className={styles.toolbar}>
        <label className={styles.inline}>
          Channel
          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
            <option value="">All channels</option>
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
        {!formOpen && (
          <button type="button" onClick={() => { setNotice(''); setFormOpen(true) }}>
            New sale
          </button>
        )}
      </div>

      {formOpen && (
        <NewSaleForm
          products={products}
          resellers={resellers}
          customers={customers}
          onSaved={handleSaved}
          onCancel={() => setFormOpen(false)}
        />
      )}

      <SalesTable sales={shown} onVoided={async (sale) => { setNotice(`Sale ${sale.saleNo} voided. Its stock was returned.`); await reload() }} />
    </section>
  )
}

function SalesTable({ sales, onVoided }) {
  const [voiding, setVoiding] = useState(null) // sale id
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  async function confirmVoid(sale) {
    setError('')
    try {
      await salesApi.voidSale(sale.id, reason)
      setVoiding(null)
      setReason('')
      await onVoided(sale)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
      <thead>
        <tr>
          <th>Sale no.</th>
          <th>Date</th>
          <th>Channel</th>
          <th>Customer / reseller</th>
          <th>Items</th>
          <th className={styles.num}>Total</th>
          <th>Status</th>
          <th aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {sales.map((s) => (
          <SaleRow
            key={s.id}
            sale={s}
            voidOpen={voiding === s.id}
            reason={reason}
            error={voiding === s.id ? error : ''}
            onReason={setReason}
            onStartVoid={() => { setVoiding(s.id); setReason(''); setError('') }}
            onCancelVoid={() => setVoiding(null)}
            onConfirmVoid={() => confirmVoid(s)}
          />
        ))}
        {sales.length === 0 && (
          <tr>
            <td colSpan={8} className={styles.muted}>No sales yet.</td>
          </tr>
        )}
      </tbody>
    </table>
      </div>
  )
}

function SaleRow({ sale, voidOpen, reason, error, onReason, onStartVoid, onCancelVoid, onConfirmVoid }) {
  const voided = sale.status === 'voided'
  return (
    <>
      <tr className={voided ? styles.voided : undefined}>
        <td className={styles.nowrap}>{sale.saleNo}</td>
        <td>{formatDateTime(sale.soldAt)}</td>
        <td>{channelLabel(sale.channel)}</td>
        <td>{sale.resellerName ?? sale.customerName ?? '—'}</td>
        <td>{sale.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}</td>
        <td className={styles.num}>{formatPeso(sale.total)}</td>
        <td>{voided ? 'Voided' : 'Completed'}</td>
        <td>
          {!voided && !voidOpen && (
            <button type="button" className={styles.link} onClick={onStartVoid} aria-label={`Void ${sale.saleNo}`}>
              Void
            </button>
          )}
        </td>
      </tr>
      {voidOpen && (
        <tr>
          <td colSpan={8} className={styles.voidRow}>
            <label className={styles.inline}>
              Reason for voiding {sale.saleNo}
              <input value={reason} onChange={(e) => onReason(e.target.value)} placeholder="e.g. Customer cancelled the order" />
            </label>
            <button type="button" className={styles.danger} onClick={onConfirmVoid}>Confirm void</button>
            <button type="button" className={styles.secondary} onClick={onCancelVoid}>Cancel</button>
            {error && <p role="alert" className={styles.error}>{error}</p>}
          </td>
        </tr>
      )}
    </>
  )
}

function NewSaleForm({ products, resellers, customers, onSaved, onCancel }) {
  const [channel, setChannel] = useState('')
  const [resellerId, setResellerId] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [customerQuery, setCustomerQuery] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [lines, setLines] = useState([]) // [{ productId, quantity }]
  const [submitted, setSubmitted] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const draft = { channel, customerId: customer?.id ?? null, resellerId, lines }
  const check = validateSale(draft, products, resellers)
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const priced = lines.map((l) => ({ ...l, unitPrice: unitPriceFor(byId.get(l.productId), channel) }))

  const productMatches = productQuery.trim()
    ? products.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(productQuery.trim().toLowerCase())).slice(0, 6)
    : []
  const customerMatches = customerQuery.trim()
    ? customers.filter((c) => `${c.name} ${c.mobile}`.toLowerCase().includes(customerQuery.trim().toLowerCase())).slice(0, 5)
    : []

  function addProduct(product) {
    setLines((ls) =>
      ls.some((l) => l.productId === product.id)
        ? ls.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...ls, { productId: product.id, quantity: 1 }],
    )
    setProductQuery('')
  }

  const setQuantity = (productId, value) =>
    setLines((ls) => ls.map((l) => (l.productId === productId ? { ...l, quantity: value === '' ? 0 : Number(value) } : l)))

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    setSaveError('')
    if (!isValid(check)) return
    setSaving(true)
    try {
      onSaved(await salesApi.recordSale(draft, customers))
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.panel} onSubmit={handleSubmit} noValidate aria-label="New sale">
      <h2>New sale</h2>
      <div className={styles.grid}>
        <label>
          Where did the order come from?
          <select value={channel} onChange={(e) => { setChannel(e.target.value); setResellerId(null) }}>
            <option value="">Choose…</option>
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>

        {channel === 'reseller' ? (
          <label>
            Reseller
            <select value={resellerId ?? ''} onChange={(e) => setResellerId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Choose…</option>
              {resellers.filter((r) => r.status === 'active').map((r) => (
                <option key={r.id} value={r.id}>{r.businessName}</option>
              ))}
            </select>
          </label>
        ) : (
          <div>
            {customer ? (
              <p className={styles.selected}>
                Customer: <strong>{customer.name}</strong>{' '}
                <button type="button" className={styles.link} onClick={() => setCustomer(null)}>Change</button>
              </p>
            ) : (
              <label>
                Customer (optional)
                <input type="search" value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} placeholder="Name or mobile number" />
              </label>
            )}
            {!customer && customerMatches.length > 0 && (
              <ul className={styles.results} aria-label="Matching customers">
                {customerMatches.map((c) => (
                  <li key={c.id}>
                    <button type="button" className={styles.link} onClick={() => { setCustomer(c); setCustomerQuery('') }}>
                      {c.name} ({c.mobile})
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <label className={styles.block}>
        Add a product
        <input type="search" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Product name or SKU" />
      </label>
      {productMatches.length > 0 && (
        <ul className={styles.results} aria-label="Matching products">
          {productMatches.map((p) => (
            <li key={p.id}>
              <span>
                {p.name} <span className={styles.muted}>({p.sku}, {p.onHand} in stock, {formatPeso(unitPriceFor(p, channel))})</span>
              </span>
              <button type="button" onClick={() => addProduct(p)} disabled={p.onHand === 0} aria-label={`Add ${p.name}`}>
                {p.onHand === 0 ? 'Out of stock' : 'Add'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {lines.length > 0 && (
        <div className={styles.tableWrap}>
      <table className={styles.table}>
          <thead>
            <tr>
              <th>Product</th>
              <th className={styles.num}>Price</th>
              <th>Quantity</th>
              <th className={styles.num}>Line total</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {priced.map((l) => {
              const product = byId.get(l.productId)
              return (
                <tr key={l.productId}>
                  <td>{product.name}<div className={styles.muted}>{product.sku}, {product.onHand} in stock</div></td>
                  <td className={styles.num}>{formatPeso(l.unitPrice)}</td>
                  <td>
                    <input
                      type="number" min="1" step="1" className={styles.qty} value={l.quantity || ''}
                      onChange={(e) => setQuantity(l.productId, e.target.value)}
                      aria-label={`Quantity of ${product.name}`}
                    />
                    {check.lines[l.productId] && <p className={styles.error}>{check.lines[l.productId]}</p>}
                  </td>
                  <td className={styles.num}>{formatPeso(lineTotal(l.quantity || 0, l.unitPrice))}</td>
                  <td>
                    <button type="button" className={styles.link} onClick={() => setLines((ls) => ls.filter((x) => x.productId !== l.productId))} aria-label={`Remove ${product.name}`}>
                      Remove
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={3}>Total</th>
              <th className={styles.num}>{formatPeso(saleTotal(priced.map((l) => ({ ...l, quantity: l.quantity || 0 }))))}</th>
              <th />
            </tr>
          </tfoot>
        </table>
      </div>
      )}

      {submitted && check.form.length > 0 && (
        <ul role="alert" className={styles.errorList}>
          {check.form.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}
      {saveError && <p role="alert" className={styles.error}>{saveError}</p>}
      <div className={styles.actions}>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save sale'}</button>
        <button type="button" className={styles.secondary} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
