import { useState } from 'react'
import styles from './trends.module.css'

// Columns for one value per week or month. An optional `average` on each item is drawn as a line
// over the columns, so actual values and the average stay visibly apart. Hovering or focusing a
// column shows its numbers above the chart, and the same numbers are in the tables on the page.
export default function ColumnChart({ items, format, averageLabel }) {
  const [active, setActive] = useState(null)
  const top = Math.max(0, ...items.map((item) => Math.max(item.value, item.average ?? 0)))
  const scale = top > 0 ? top : 1
  const hasAverage = items.some((item) => item.average != null)
  const shown = active === null ? null : items[active]
  const points = items
    .map((item, i) => `${((i + 0.5) / items.length) * 100},${100 - ((item.average ?? 0) / scale) * 100}`)
    .join(' ')

  function indexAt(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const index = Math.floor(((event.clientX - rect.left) / rect.width) * items.length)
    return Math.min(items.length - 1, Math.max(0, index))
  }

  return (
    <div>
      <p className={styles.readout} aria-live="polite">
        {shown ? (
          <>
            <strong>{format(shown.value)}</strong>{' '}
            <span className={styles.muted}>
              {shown.caption}
              {hasAverage && shown.average != null ? ` · ${averageLabel}: ${format(shown.average)}` : ''}
            </span>
          </>
        ) : (
          <span className={styles.muted}>Point at or tab to a column to see its numbers.</span>
        )}
      </p>
      <p className={styles.scale}>Highest: {format(top)}</p>

      <div className={styles.plot} onPointerMove={(e) => setActive(indexAt(e))} onPointerLeave={() => setActive(null)}>
        {items.map((item, i) => (
          <button
            key={item.key}
            type="button"
            className={styles.column}
            aria-label={`${item.caption}: ${format(item.value)}`}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          >
            <span
              className={`${styles.bar} ${active === i ? styles.barActive : ''}`}
              style={{ height: item.value > 0 ? `max(2px, ${(item.value / scale) * 100}%)` : 0 }}
            />
          </button>
        ))}
        {hasAverage && (
          <svg className={styles.averageLine} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <polyline points={points} />
          </svg>
        )}
      </div>
      <div className={styles.axis}>
        <span>{items[0]?.label}</span>
        <span>{items[items.length - 1]?.label}</span>
      </div>
    </div>
  )
}
