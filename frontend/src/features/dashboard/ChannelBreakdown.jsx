import { formatPeso } from '../sales/saleUtils.js'
import styles from './dashboard.module.css'

const salesWord = (n) => (n === 1 ? 'sale' : 'sales')

// Revenue per sales channel as horizontal bars, value at the tip of each bar.
export default function ChannelBreakdown({ rows }) {
  const max = Math.max(0, ...rows.map((row) => row.revenue))

  return (
    <div className={styles.panel}>
      <h2>Sales by channel</h2>
      <ul className={styles.barList}>
        {rows.map((row) => (
          <li key={row.channel} className={styles.barRow}>
            <span className={styles.barLabel}>{row.label}</span>
            <span className={styles.barTrack}>
              {row.revenue > 0 && <span className={styles.bar} style={{ '--share': row.revenue / max }} />}
              <span className={styles.barValue}>
                {formatPeso(row.revenue)} · {row.salesCount} {salesWord(row.salesCount)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
