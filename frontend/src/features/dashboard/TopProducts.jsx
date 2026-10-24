import { formatPeso } from '../sales/saleUtils.js'
import styles from './dashboard.module.css'

export default function TopProducts({ products }) {
  return (
    <div className={styles.panel}>
      <h2>Top products</h2>
      <p className={styles.subtitle}>By units sold in the period</p>
      {products.length === 0 ? (
        <p className={styles.muted}>No sales in this period.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col" className={styles.number}>Units</th>
              <th scope="col" className={styles.number}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.productId}>
                <td>
                  {product.name}
                  {product.sku && <span className={styles.sku}>{product.sku}</span>}
                </td>
                <td className={styles.number}>{product.units}</td>
                <td className={styles.number}>{formatPeso(product.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
