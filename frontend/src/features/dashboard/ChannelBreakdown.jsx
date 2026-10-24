import { formatPeso } from '../sales/saleUtils.js'
import styles from './dashboard.module.css'

const salesWord = (n) => (n === 1 ? 'sale' : 'sales')

// Revenue per sales channel: label and value on one line, bar underneath, so the bars keep
// their full width even in a narrow panel.
export default function ChannelBreakdown({ rows }) {
  const max = Math.max(0, ...rows.map((row) => row.revenue))

  return (
    <div className={styles.panel}>
      <h2>Sales by channel</h2>
      <p className={styles.subtitle}>Revenue in the period</p>
      <ul className={styles.barList}>
        {rows.map((row) => (
          <li key={row.channel}>
            <div className={styles.barHeading}>
              <span>{row.label}</span>
              <span className={styles.barValue}>
                {formatPeso(row.revenue)} · {row.salesCount} {salesWord(row.salesCount)}
              </span>
            </div>
            <div className={styles.barTrack}>
              {row.revenue > 0 && <span className={styles.bar} style={{ width: `max(2px, ${(row.revenue / max) * 100}%)` }} />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
