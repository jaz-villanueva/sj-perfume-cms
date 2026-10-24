import { formatPeso } from '../sales/saleUtils.js'
import styles from './dashboard.module.css'

const KIND = { customer: 'Customer', reseller: 'Reseller' }

// Customer and reseller activity (FR-11): biggest buyers in the period.
export default function TopBuyers({ buyers }) {
  return (
    <div className={styles.panel}>
      <h2>Customers &amp; resellers</h2>
      <p className={styles.subtitle}>Top buyers in the period</p>
      {buyers.length === 0 ? (
        <p className={styles.muted}>No named buyers in this period.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Buyer</th>
              <th scope="col" className={styles.number}>Sales</th>
              <th scope="col" className={styles.number}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {buyers.map((buyer) => (
              <tr key={buyer.key}>
                <td>
                  {buyer.name}
                  <span className={styles.sku}>{KIND[buyer.kind]}</span>
                </td>
                <td className={styles.number}>{buyer.salesCount}</td>
                <td className={styles.number}>{formatPeso(buyer.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
