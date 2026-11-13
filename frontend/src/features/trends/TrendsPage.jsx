import { useEffect, useMemo, useState } from 'react'
import { formatPeso } from '../sales/saleUtils.js'
import { salesApi } from '../sales/salesApi.js'
import ColumnChart from './ColumnChart.jsx'
import {
  AVERAGE_WEEKS,
  MONTHS_SHOWN,
  SALES_LIST_LIMIT,
  WEEK_OPTIONS,
  monthlyTotals,
  productUnitsByWeek,
  productsSold,
  weeklyTotals,
} from './trendsUtils.js'
import styles from './trends.module.css'

const count = new Intl.NumberFormat('en-PH')
const shortDate = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' })
const longDate = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
const monthName = new Intl.DateTimeFormat('en-PH', { month: 'short', year: 'numeric' })
const salesWord = (n) => (n === 1 ? 'sale' : 'sales')
const formatUnits = (n) => `${count.format(n)} ${n === 1 ? 'unit' : 'units'}`

// The sample sales have fixed dates in October 2026, so sample mode shows a full year; real data opens on 12 weeks.
const DEFAULT_WEEKS = salesApi.isSample ? 52 : 12

export default function TrendsPage() {
  const [weeks, setWeeks] = useState(DEFAULT_WEEKS)
  const [data, setData] = useState(null) // { sales, now }, loaded once so every figure uses the same day
  const [loadError, setLoadError] = useState('')
  const [chosenProduct, setChosenProduct] = useState('')

  useEffect(() => {
    let active = true
    salesApi
      .listSales()
      .then((sales) => {
        if (!active) return
        setData({ sales, now: new Date() })
        setLoadError('')
      })
      .catch((error) => active && setLoadError(`Could not load sales: ${error.message}`))
    return () => {
      active = false
    }
  }, [])

  const weekly = useMemo(() => (data ? weeklyTotals(data.sales, weeks, data.now) : []), [data, weeks])
  const monthly = useMemo(() => (data ? monthlyTotals(data.sales, MONTHS_SHOWN, data.now) : []), [data])
  const products = useMemo(() => (data ? productsSold(data.sales, weeks, data.now) : []), [data, weeks])
  const product = products.find((p) => String(p.productId) === chosenProduct) ?? products[0] ?? null
  const productWeeks = useMemo(
    () => (data && product ? productUnitsByWeek(data.sales, product.productId, weeks, data.now) : []),
    [data, product, weeks],
  )
  const truncated = data && !salesApi.isSample && data.sales.length >= SALES_LIST_LIMIT

  const weekItems = weekly.map((week) => ({
    key: week.key,
    label: shortDate.format(week.start),
    caption: `Week of ${longDate.format(week.start)}, ${week.salesCount} ${salesWord(week.salesCount)}`,
    value: week.revenue,
    average: week.average,
  }))
  const productItems = productWeeks.map((week) => ({
    key: week.key,
    label: shortDate.format(week.start),
    caption: `Week of ${longDate.format(week.start)}`,
    value: week.units,
  }))
  const productTotal = productWeeks.reduce((sum, week) => sum + week.units, 0)

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.band}>Insights</p>
          <h1 className={styles.title}>Sales trends</h1>
          <p className={styles.lead}>Actual sales over time. These are recorded sales, not forecasts.</p>
        </div>
        <label className={styles.period}>
          <span className={styles.eyebrow}>Period</span>
          <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
            {WEEK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </header>

      {salesApi.isSample && <p className={styles.sampleNote}>Showing sample data. The database is not connected yet.</p>}
      {truncated && (
        <p className={styles.sampleNote}>
          Showing the latest {SALES_LIST_LIMIT} sales. Older weeks can be short until the database trend view is added.
        </p>
      )}
      {loadError && <p role="alert" className={styles.error}>{loadError}</p>}
      {!data && !loadError && <p className={styles.muted}>Loading…</p>}

      {data && (
        <>
          <section className={styles.panel} aria-labelledby="weekly-heading">
            <h2 id="weekly-heading">Weekly sales</h2>
            <p className={styles.subtitle}>
              Revenue per week, Monday to Sunday. The line is the average of the last {AVERAGE_WEEKS} weeks of actual sales.
            </p>
            <ColumnChart items={weekItems} format={formatPeso} averageLabel={`${AVERAGE_WEEKS}-week average`} />
            <details className={styles.tableToggle}>
              <summary>Show as a table</summary>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Week of</th>
                    <th scope="col" className={styles.number}>Sales</th>
                    <th scope="col" className={styles.number}>Revenue</th>
                    <th scope="col" className={styles.number}>{AVERAGE_WEEKS}-week average</th>
                  </tr>
                </thead>
                <tbody>
                  {weekly.map((week) => (
                    <tr key={week.key}>
                      <td>{longDate.format(week.start)}</td>
                      <td className={styles.number}>{week.salesCount}</td>
                      <td className={styles.number}>{formatPeso(week.revenue)}</td>
                      <td className={styles.number}>{formatPeso(week.average)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>

          <section className={styles.panel} aria-labelledby="monthly-heading">
            <h2 id="monthly-heading">Monthly totals</h2>
            <p className={styles.subtitle}>Calendar months, the last {MONTHS_SHOWN}. Voided sales are left out.</p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col" className={styles.number}>Sales</th>
                  <th scope="col" className={styles.number}>Units</th>
                  <th scope="col" className={styles.number}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((month) => (
                  <tr key={month.key}>
                    <td>{monthName.format(month.start)}</td>
                    <td className={styles.number}>{month.salesCount}</td>
                    <td className={styles.number}>{count.format(month.units)}</td>
                    <td className={styles.number}>{formatPeso(month.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className={styles.panel} aria-labelledby="product-heading">
            <h2 id="product-heading">Product trend</h2>
            {product ? (
              <>
                <label className={styles.field}>
                  <span className={styles.eyebrow}>Product</span>
                  <select value={String(product.productId)} onChange={(e) => setChosenProduct(e.target.value)}>
                    {products.map((p) => (
                      <option key={p.productId} value={String(p.productId)}>
                        {p.name} ({formatUnits(p.units)})
                      </option>
                    ))}
                  </select>
                </label>
                <p className={styles.subtitle}>
                  Units sold per week: {formatUnits(productTotal)} in the last {weeks} weeks.
                </p>
                <ColumnChart items={productItems} format={formatUnits} averageLabel="average" />
              </>
            ) : (
              <p className={styles.muted}>No products sold in these weeks.</p>
            )}
          </section>
        </>
      )}
    </section>
  )
}
