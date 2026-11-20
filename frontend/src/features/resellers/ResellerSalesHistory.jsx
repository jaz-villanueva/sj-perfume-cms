
import { useEffect, useState } from 'react'
import { resellersApi } from './resellersApi.js'

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
})

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Manila',
      })
}

export default function ResellerSalesHistory({ reseller, onClose }) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    resellersApi.listResellerSales(reseller.id)
      .then((data) => {
        if (active) setSales(data)
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
  }, [reseller.id])

  return (
    <section className="resellers-history-panel">
      <div className="resellers-history-heading">
        <div>
          <h2>Sales History</h2>
          <p>{reseller.businessName}</p>
        </div>

        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>

      {loading ? (
        <p className="resellers-message">
          Loading reseller sales...
        </p>
      ) : error ? (
        <p className="resellers-message resellers-error" role="alert">
          {error}
        </p>
      ) : sales.length === 0 ? (
        <p className="resellers-message">
          No sales transactions recorded for this reseller.
        </p>
      ) : (
        <div className="resellers-table-wrap">
          <table className="resellers-table">
            <thead>
              <tr>
                <th>Sale Number</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.saleNo}</td>
                  <td>{formatDate(sale.soldAt)}</td>
                  <td>{peso.format(sale.total)}</td>
                  <td>
                    <span
                      className={`resellers-status ${
                        sale.status === 'completed'
                          ? 'is-active'
                          : 'is-inactive'
                      }`}
                    >
                      {sale.status === 'completed'
                        ? 'Completed'
                        : sale.status === 'voided'
                          ? 'Voided'
                          : sale.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
