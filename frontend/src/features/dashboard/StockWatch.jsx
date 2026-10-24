import styles from './dashboard.module.css'

const STATUS = {
  out: { label: 'Out of stock', className: styles.statusOut },
  low: { label: 'Low stock', className: styles.statusLow },
}

// Products at or below their reorder level (FR-6). Status always shows as text, not colour alone.
export default function StockWatch({ products }) {
  return (
    <div className={styles.panel}>
      <h2>Stock watch</h2>
      <p className={styles.subtitle}>At or below the reorder level</p>
      {products.length === 0 ? (
        <p className={styles.muted}>All products are above their reorder level.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col" className={styles.number}>On hand</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  {product.name}
                  {product.sku && <span className={styles.sku}>{product.sku}</span>}
                </td>
                <td className={styles.number}>
                  {product.onHand} <span className={styles.muted}>/ {product.reorderLevel}</span>
                </td>
                <td>
                  <span className={`${styles.status} ${STATUS[product.status].className}`}>{STATUS[product.status].label}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
