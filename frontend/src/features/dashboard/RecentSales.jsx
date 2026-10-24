import { channelLabel, formatDateTime, formatPeso } from '../sales/saleUtils.js'
import styles from './dashboard.module.css'

export default function RecentSales({ sales }) {
  return (
    <div className={styles.panel}>
      <h2>Recent sales</h2>
      <p className={styles.subtitle}>The latest {sales.length === 1 ? 'sale' : `${sales.length} sales`}, voided ones included</p>
      {sales.length === 0 ? (
        <p className={styles.muted}>No sales recorded yet.</p>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Sale no.</th>
                <th scope="col">Date</th>
                <th scope="col">Channel</th>
                <th scope="col">Customer / reseller</th>
                <th scope="col" className={styles.number}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className={sale.status === 'voided' ? styles.voided : undefined}>
                  <td>
                    {sale.saleNo}
                    {sale.status === 'voided' && <span className={styles.sku}>voided</span>}
                  </td>
                  <td>{formatDateTime(sale.soldAt)}</td>
                  <td>{channelLabel(sale.channel)}</td>
                  <td>{sale.customerName ?? sale.resellerName ?? '—'}</td>
                  <td className={styles.number}>{formatPeso(sale.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
