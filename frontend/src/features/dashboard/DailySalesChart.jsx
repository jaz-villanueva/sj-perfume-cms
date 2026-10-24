import { useState } from 'react'
import { formatPeso } from '../sales/saleUtils.js'
import styles from './dashboard.module.css'

const shortDate = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' })
const longDate = new Intl.DateTimeFormat('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
const salesWord = (n) => (n === 1 ? 'sale' : 'sales')

// Columns get thin over 90 days, so the whole plot tracks the pointer and picks the day under it.
function dayUnderPointer(event, dayCount) {
  const rect = event.currentTarget.getBoundingClientRect()
  const index = Math.floor(((event.clientX - rect.left) / rect.width) * dayCount)
  return Math.min(dayCount - 1, Math.max(0, index))
}

// Revenue per day as columns. Hovering or focusing a day shows its total in the readout above
// the chart; the same numbers are available as a table for keyboard and screen-reader users.
export default function DailySalesChart({ days }) {
  const [active, setActive] = useState(null)
  const max = Math.max(0, ...days.map((day) => day.revenue))
  const shown = active === null ? null : days[active]

  return (
    <div className={styles.panel}>
      <h2>Daily sales</h2>
      <p className={styles.subtitle}>Revenue per day, last {days.length} days</p>

      <p className={styles.readout} aria-live="polite">
        {shown ? (
          <>
            <strong>{formatPeso(shown.revenue)}</strong>{' '}
            <span className={styles.muted}>
              {longDate.format(shown.date)} · {shown.salesCount} {salesWord(shown.salesCount)}
            </span>
          </>
        ) : (
          <span className={styles.muted}>Point at or tab to a day to see its total.</span>
        )}
      </p>

      <div className={styles.chart}>
        <span className={styles.chartMax}>{formatPeso(max)}</span>
        <div className={styles.columns} onPointerMove={(e) => setActive(dayUnderPointer(e, days.length))} onPointerLeave={() => setActive(null)}>
          {days.map((day, i) => (
            <button
              key={day.key}
              type="button"
              className={styles.column}
              aria-label={`${longDate.format(day.date)}: ${formatPeso(day.revenue)}, ${day.salesCount} ${salesWord(day.salesCount)}`}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              <span
                className={`${styles.columnBar} ${active === i ? styles.columnActive : ''}`}
                style={{ height: day.revenue > 0 ? `max(2px, ${(day.revenue / max) * 100}%)` : 0 }}
              />
            </button>
          ))}
        </div>
        <div className={styles.axis}>
          <span>{shortDate.format(days[0].date)}</span>
          <span>{shortDate.format(days[days.length - 1].date)}</span>
        </div>
      </div>

      <details className={styles.tableToggle}>
        <summary>Show as a table</summary>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col" className={styles.number}>Sales</th>
              <th scope="col" className={styles.number}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {days.some((day) => day.salesCount > 0) ? (
              days.filter((day) => day.salesCount > 0).map((day) => (
                <tr key={day.key}>
                  <td>{longDate.format(day.date)}</td>
                  <td className={styles.number}>{day.salesCount}</td>
                  <td className={styles.number}>{formatPeso(day.revenue)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className={styles.muted}>No sales in these days.</td>
              </tr>
            )}
          </tbody>
        </table>
      </details>
    </div>
  )
}
